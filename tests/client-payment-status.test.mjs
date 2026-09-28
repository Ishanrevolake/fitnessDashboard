import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadModule(relativePath, supabase) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    Response,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test" } },
    require(name) {
      if (name === "@supabase/supabase-js") return { createClient: () => supabase };
      const dependency = name.startsWith("@/")
        ? `${name.slice(2)}.ts`
        : path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(filename), `${name}.ts`));
      return loadModule(dependency, supabase);
    },
  }, { filename });
  return exports;
}

function createDatabase(payments, paymentError = null) {
  const users = ["arosh", "submitted", "approved", "unconfirmed"].map((id) => ({
    id, email: `${id}@example.test`, confirmed_at: id === "unconfirmed" ? null : "2026-09-01",
  }));
  return {
    auth: { admin: { listUsers: async () => ({ data: { users }, error: null }) } },
    from(table) {
      let rows = table === "payments" ? payments : [];
      const query = {
        select() { return this; },
        in(column, values) { rows = rows.filter((row) => values.includes(row[column])); return this; },
        eq(column, value) { rows = rows.filter((row) => row[column] === value); return this; },
        order() { return this; },
        range(start, end) { rows = rows.slice(start, end + 1); return this; },
        then(resolve, reject) {
          return Promise.resolve({ data: rows, error: table === "payments" ? paymentError : null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

test("only verified clients can be active; abandoned and submitted signups remain pending", async () => {
  const payments = [
    { id: 1, user_id: "submitted", status: "pending" },
    { id: 2, user_id: "approved", status: "verified" },
    { id: 3, user_id: "unconfirmed", status: "verified" },
  ];
  const route = loadModule("app/api/clients/route.ts", createDatabase(payments));
  const clients = await (await route.GET()).json();
  assert.deepEqual(clients.map(({ id, status }) => [id, status]), [
    ["arosh", "pending"], ["submitted", "pending"], ["approved", "active"], ["unconfirmed", "inactive"],
  ]);
  payments[0].status = "verified";
  const refreshed = await (await route.GET()).json();
  assert.equal(refreshed.find((client) => client.id === "submitted").status, "active");
});

test("verification lookup failures return an error instead of guessing client status", async () => {
  const route = loadModule("app/api/clients/route.ts", createDatabase([], { message: "Unavailable" }));
  assert.equal((await route.GET()).status, 500);
});

test("verified payments beyond the first page still activate clients", async () => {
  const payments = Array.from({ length: 1000 }, (_, id) => ({ id, user_id: "approved", status: "verified" }));
  payments.push({ id: 1001, user_id: "arosh", status: "verified" });
  const route = loadModule("app/api/clients/route.ts", createDatabase(payments));
  const clients = await (await route.GET()).json();
  assert.equal(clients.find((client) => client.id === "arosh").status, "active");
});

test("manually created clients start pending", async () => {
  const route = loadModule("app/api/clients/route.ts", createDatabase([]));
  const response = await route.POST({ json: async () => ({ firstName: "New", lastName: "Client", email: "new@example.test", packageId: "rookie" }) });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).status, "pending");
});

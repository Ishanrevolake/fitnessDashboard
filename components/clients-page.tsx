"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { getStoredClients } from "@/lib/client-store";
import { fetchClients } from "@/lib/api-client";
import { getPackageLabel, packageOptions } from "@/lib/mock-data";
import { getStoredPrograms } from "@/lib/program-store";
import type { ClientStatus, FitnessClient, ProgramTemplate } from "@/lib/types";

type ClientsPageProps = {
  initialStatus?: ClientStatus | "";
  initialRenewal?: RenewalFilter;
};

type RenewalFilter = "" | "ending-soon";

export function ClientsPage({ initialStatus = "", initialRenewal = "" }: ClientsPageProps) {
  const [clients, setClients] = useState<FitnessClient[]>([]);
  const [programs, setPrograms] = useState<ProgramTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatus | "">(initialStatus);
  const [renewal, setRenewal] = useState<RenewalFilter>(initialRenewal);
  const [packageFilter, setPackageFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setPrograms(getStoredPrograms());
    setLoading(true);
    setLoadError("");

    fetchClients()
      .then(setClients)
      .catch((error) => {
        setClients(getStoredClients());
        setLoadError(error instanceof Error ? error.message : "Unable to load clients from Supabase.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setRenewal(initialRenewal);
  }, [initialRenewal]);

  const packageFilterOptions = useMemo(() => {
    const options = new Map<string, string>();

    packageOptions.forEach((option) => {
      options.set(getPackageFilterKey(option.label), option.label);
    });

    clients.forEach((client) => {
      const label = getClientPackageLabel(client);
      options.set(getPackageFilterKey(label), label);
    });

    return Array.from(options, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [clients]);

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return clients.filter((client) => {
      const packageLabel = getClientPackageLabel(client);
      const matchesSearch =
        !normalizedSearch ||
        [client.name, client.email, client.goal, packageLabel].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      const matchesStatus = !status || client.status === status;
      const matchesPackage = !packageFilter || getPackageFilterKey(packageLabel) === packageFilter;
      const matchesRenewal = !renewal || (client.status === "active" && client.daysLeft <= 7);

      return matchesSearch && matchesStatus && matchesPackage && matchesRenewal;
    });
  }, [clients, packageFilter, renewal, search, status]);

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Clients" subtitle={`${filteredClients.length} clients in the current view`} />

        <main className="main-content">
          <section className="search-section client-filter-bar">
            <div className="search-control">
              <Search size={20} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                id="clientSearchInput"
                placeholder="Search clients by name, email, or goal..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              id="clientStatusFilter"
              className="modern-select"
              value={status}
              onChange={(event) => setStatus(event.target.value as ClientStatus | "")}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              id="clientPackageFilter"
              className="modern-select"
              value={packageFilter}
              onChange={(event) => setPackageFilter(event.target.value)}
            >
              <option value="">All Packages</option>
              {packageFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              id="clientRenewalFilter"
              className="modern-select"
              value={renewal}
              onChange={(event) => setRenewal(event.target.value as RenewalFilter)}
            >
              <option value="">All Renewals</option>
              <option value="ending-soon">Ending in 7 Days</option>
            </select>
          </section>

          <ClientTable clients={filteredClients} programs={programs} loading={loading} />

          <section className="clients-list">
            {loading ? <div className="card empty-state">Loading clients...</div> : null}
            {loadError ? (
              <div className="auth-error">
                {loadError}
              </div>
            ) : null}
            {filteredClients.map((client) => (
              <ClientCard key={client.id} client={client} programs={programs} />
            ))}
            {!loading && filteredClients.length === 0 ? (
              <div className="card empty-state">
                <strong>No clients found</strong>
                <span className="text-muted">Adjust your filters or add a new client.</span>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </DashboardShell>
  );
}

function ClientInitials({ client }: { client: FitnessClient }) {
  const initials = client.name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <div className="client-table-avatar">{initials}</div>;
}

function getClientProgress(client: FitnessClient) {
  const packageDays = packageOptions.find((option) => option.id === client.packageId)?.durationDays ?? 84;
  const completedDays = Math.max(0, packageDays - client.daysLeft);
  const percent = packageDays > 0 ? Math.min(100, Math.round((completedDays / packageDays) * 100)) : 0;
  const week = Math.max(1, Math.ceil(completedDays / 7));
  const totalWeeks = Math.max(1, Math.ceil(packageDays / 7));

  return { percent, week, totalWeeks };
}

function getClientPackageLabel(client: FitnessClient) {
  return client.packageName?.trim() || getPackageLabel(client.packageId);
}

function getPackageFilterKey(label: string) {
  return label.trim().toLowerCase();
}

function ClientTable({ clients, programs, loading }: { clients: FitnessClient[]; programs: ProgramTemplate[]; loading: boolean }) {
  return (
    <section className="card clients-table-card">
      <div className="clients-table-title">All Clients ({loading ? "-" : clients.length})</div>
      <div className="clients-table">
        <div className="clients-table-row clients-table-head">
          <span>Client</span>
          <span>Package</span>
          <span>Progress</span>
          <span>Last Active</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {clients.map((client) => {
          const inactive = client.status === "inactive";
          const progress = getClientProgress(client);
          const statusLabel = inactive ? "Inactive" : client.daysLeft <= 7 ? "Ending Soon" : "Active";
          const packageLabel = client.packageName ?? getPackageLabel(client.packageId);

          return (
            <div className="clients-table-row" key={client.id}>
              <div className="clients-table-client">
                <ClientInitials client={client} />
                <div>
                  <strong>{client.name}</strong>
                  <span>{client.email}</span>
                </div>
              </div>
              <strong>{packageLabel}</strong>
              <div className="client-progress-cell">
                {inactive ? (
                  <span className="text-muted">Completed</span>
                ) : (
                  <>
                    <div className="client-progress-track">
                      <div className={progress.percent < 40 ? "client-progress-fill low" : "client-progress-fill"} style={{ width: `${progress.percent}%` }} />
                    </div>
                    <span>
                      Wk {progress.week}/{progress.totalWeeks}
                    </span>
                  </>
                )}
              </div>
              <span>{inactive ? "14 days ago" : client.daysLeft <= 7 ? "Yesterday" : "Today"}</span>
              <span className={`client-status-chip ${inactive ? "inactive" : client.daysLeft <= 7 ? "ending" : "active"}`}>{statusLabel}</span>
              <Link className="client-table-action" href={`/client-profile?clientId=${client.id}`}>
                View
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ClientCard({ client, programs }: { client: FitnessClient; programs: ProgramTemplate[] }) {
  const inactive = client.status === "inactive";
  const assignedProgram = programs.find((program) => program.id === client.workoutPlan.assignedProgramId);

  return (
    <article className="card client-card" style={{ opacity: inactive ? 0.72 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <img
          src={client.avatar}
          className="avatar-header"
          alt={client.name}
          style={{ width: 60, height: 60, borderRadius: 12, filter: inactive ? "grayscale(100%)" : undefined }}
        />
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>{client.name}</h3>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{client.email}</span>
        </div>
      </div>
      <div className="client-card-meta">
        <div>
          <div className="client-meta-label">Days Left</div>
          <div style={{ fontWeight: 700, color: inactive ? "var(--text-muted)" : "var(--accent-red)", marginTop: 4 }}>
            {client.daysLeft} Days
          </div>
        </div>
        <div>
          <div className="client-meta-label">Package</div>
          <div style={{ fontWeight: 600, color: "var(--text-main)", marginTop: 4 }}>
            {client.packageName ?? getPackageLabel(client.packageId)}
          </div>
        </div>
      </div>
      <div className="client-workout-preview">
        <span className="client-meta-label">Workout Plan</span>
        <strong>{assignedProgram?.name ?? "Custom Plan"}</strong>
        <span>{client.workoutPlan.focus}</span>
      </div>
      <Link href={`/client-profile?clientId=${client.id}`} className="btn-secondary client-profile-link">
        View / Edit Plan
      </Link>
    </article>
  );
}

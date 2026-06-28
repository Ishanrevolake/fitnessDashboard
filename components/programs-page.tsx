"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { fetchClients } from "@/lib/api-client";
import { getStoredClients } from "@/lib/client-store";
import { getPackageLabel, packageOptions } from "@/lib/mock-data";
import type { FitnessClient } from "@/lib/types";

type PackageCardItem = {
  id: string;
  label: string;
  durationDays: number;
  clientCount: number;
};

export function ProgramsPage() {
  const [clients, setClients] = useState<FitnessClient[]>([]);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetchClients()
      .then(setClients)
      .catch((error) => {
        setClients(getStoredClients());
        setLoadError(error instanceof Error ? error.message : "Unable to load packages from Supabase.");
      });
  }, []);

  const packages = useMemo(() => {
    const items = new Map<string, PackageCardItem>();

    packageOptions.forEach((option) => {
      items.set(getPackageKey(option.label), {
        id: option.id,
        label: option.label,
        durationDays: option.durationDays,
        clientCount: 0,
      });
    });

    clients.forEach((client) => {
      const label = getClientPackageLabel(client);
      const key = getPackageKey(label);
      const existing = items.get(key);

      items.set(key, {
        id: existing?.id ?? key,
        label,
        durationDays: existing?.durationDays ?? getPackageDuration(client),
        clientCount: (existing?.clientCount ?? 0) + 1,
      });
    });

    return Array.from(items.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [clients]);

  const filteredPackages = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return packages.filter((item) => {
      return !normalizedSearch || item.label.toLowerCase().includes(normalizedSearch);
    });
  }, [packages, search]);

  return (
    <DashboardShell>
      <PageHeader title="Packages" subtitle="View packages assigned to clients" />

      <main className="main-content packages-page-content">
        <section className="search-section packages-search-section">
          <div className="search-control">
            <Search size={20} style={{ color: "var(--text-muted)" }} />
            <input placeholder="Search packages..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </section>

        {loadError ? <div className="auth-error">{loadError}</div> : null}

        <section className="package-grid">
          {filteredPackages.map((item) => (
            <PackageCard key={item.id} item={item} />
          ))}
        </section>
      </main>
    </DashboardShell>
  );
}

function PackageCard({ item }: { item: PackageCardItem }) {
  const duration = formatDuration(item.durationDays);

  return (
    <article className="card package-card">
      <div className="package-card-header">
        <div>
          <h3>{item.label}</h3>
          <span className="badge-tag package-client-count">
            {item.clientCount} {item.clientCount === 1 ? "client" : "clients"}
          </span>
        </div>
        <div className="duration-chip">
          <div style={{ fontSize: 16, fontWeight: 700 }}>{item.durationDays}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Days</div>
        </div>
      </div>
      <div className="package-card-body">
        <span>Package duration</span>
        <strong>{duration}</strong>
      </div>
      <div className="package-card-footer">
        <span>{item.clientCount} active assignment{item.clientCount === 1 ? "" : "s"}</span>
      </div>
    </article>
  );
}

function getClientPackageLabel(client: FitnessClient) {
  return client.packageName?.trim() || getPackageLabel(client.packageId);
}

function getPackageKey(label: string) {
  return label.trim().toLowerCase();
}

function getPackageDuration(client: FitnessClient) {
  return packageOptions.find((option) => option.id === client.packageId)?.durationDays ?? client.daysLeft;
}

function formatDuration(days: number) {
  if (days % 7 === 0) return `${days / 7} Weeks`;
  return `${days} Days`;
}

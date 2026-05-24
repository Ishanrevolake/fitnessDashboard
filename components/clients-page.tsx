"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddClientModal } from "@/components/add-client-modal";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { TabNavigation } from "@/components/tab-navigation";
import { Toast } from "@/components/toast";
import { addClient, getStoredClients } from "@/lib/client-store";
import { fetchClients } from "@/lib/api-client";
import { getPackageLabel, packageOptions } from "@/lib/mock-data";
import { getStoredPrograms } from "@/lib/program-store";
import type { ClientStatus, FitnessClient, NewClientInput, PackageId, ProgramTemplate } from "@/lib/types";

type ClientsPageProps = {
  initialStatus?: ClientStatus | "";
};

export function ClientsPage({ initialStatus = "" }: ClientsPageProps) {
  const [clients, setClients] = useState<FitnessClient[]>([]);
  const [programs, setPrograms] = useState<ProgramTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatus | "">(initialStatus);
  const [packageId, setPackageId] = useState<PackageId | "">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return clients.filter((client) => {
      const matchesSearch =
        !normalizedSearch ||
        [client.name, client.email, client.goal, client.packageName ?? getPackageLabel(client.packageId)].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      const matchesStatus = !status || client.status === status;
      const matchesPackage = !packageId || client.packageId === packageId;

      return matchesSearch && matchesStatus && matchesPackage;
    });
  }, [clients, packageId, search, status]);

  function handleAddClient(input: NewClientInput) {
    const result = addClient(input);
    setClients(result.clients);
    setToast("Client added successfully.");
  }

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Clients Directory" onAddClient={() => setModalOpen(true)} />
        <TabNavigation />

        <main className="main-content">
          <section className="search-section">
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
              value={packageId}
              onChange={(event) => setPackageId(event.target.value as PackageId | "")}
            >
              <option value="">All Packages</option>
              {packageOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <button id="clientsPageAddClientBtn" className="btn-primary toolbar-button" type="button" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> New Client
            </button>
          </section>

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

      <AddClientModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleAddClient} />
      <Toast message={toast} />
    </DashboardShell>
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

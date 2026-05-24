"use client";

import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CreateProgramModal } from "@/components/create-program-modal";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { Toast } from "@/components/toast";
import { addStoredProgram, getStoredPrograms } from "@/lib/program-store";
import type { ProgramTemplate } from "@/lib/types";

export function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [duration, setDuration] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setPrograms(getStoredPrograms());
  }, []);

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const matchesSearch =
        !search.trim() ||
        [program.name, program.description, program.intensity].some((value) => value.toLowerCase().includes(search.toLowerCase().trim()));
      const matchesDuration = !duration || program.durationWeeks === Number(duration);

      return matchesSearch && matchesDuration;
    });
  }, [duration, programs, search]);

  function addProgram(program: ProgramTemplate) {
    setPrograms(addStoredProgram(program));
    setToast("Program created successfully.");
  }

  return (
    <DashboardShell>
      <PageHeader title="Program Templates" subtitle="Create and manage reusable training programs">
        <button className="btn-primary toolbar-button" type="button" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Create Program
        </button>
      </PageHeader>

      <main className="main-content">
        <section className="search-section">
          <div className="search-control">
            <Search size={20} style={{ color: "var(--text-muted)" }} />
            <input placeholder="Search programs..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className="modern-select" value={duration} onChange={(event) => setDuration(event.target.value)}>
            <option value="">All Durations</option>
            <option value="4">4 Weeks</option>
            <option value="8">8 Weeks</option>
            <option value="10">10 Weeks</option>
            <option value="12">12 Weeks</option>
          </select>
        </section>

        <section className="program-grid">
          {filteredPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </section>
      </main>

      <CreateProgramModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={addProgram} />
      <Toast message={toast} />
    </DashboardShell>
  );
}

function ProgramCard({ program }: { program: ProgramTemplate }) {
  const badgeStyle =
    program.intensity === "Advanced"
      ? { background: "rgba(230,57,70,0.1)", color: "var(--accent-red)" }
      : program.intensity === "Intermediate"
        ? { background: "rgba(249, 115, 22, 0.12)", color: "var(--accent-orange)" }
        : { background: "rgba(37, 99, 235, 0.1)", color: "#2563EB" };

  return (
    <article className="card program-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>{program.name}</h3>
          <span className="badge-tag" style={badgeStyle}>
            {program.intensity}
          </span>
        </div>
        <div className="duration-chip">
          <div style={{ fontSize: 16, fontWeight: 700 }}>{program.durationWeeks}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Weeks</div>
        </div>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>{program.description}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
        <div style={{ fontSize: 13, color: "var(--text-main)", fontWeight: 600 }}>{program.workoutsPerWeek} Workouts / Week</div>
        <button className="btn-secondary inline-button" type="button">
          Edit Program
        </button>
      </div>
    </article>
  );
}

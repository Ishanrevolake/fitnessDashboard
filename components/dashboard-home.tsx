"use client";

import {
  BarChart2,
  CheckCircle2,
  Dumbbell,
  Edit3,
  FilePlus,
  MessageCircle,
  PlaySquare,
  Salad,
  Send,
  Star,
  TrendingUp,
  Utensils,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { TabNavigation } from "@/components/tab-navigation";
import { Toast } from "@/components/toast";
import { fetchClientMealPlan, fetchClientNotes, fetchClientWorkoutPlan, fetchClients } from "@/lib/api-client";
import { hasTrainerAccess } from "@/lib/auth-store";
import { normalizeClientMealPlan } from "@/lib/meal-plan-utils";
import type { ClientMealPlan, ClientNote, FitnessClient, WorkoutPlan } from "@/lib/types";

export function DashboardHome() {
  const { user, loading } = useAuth();
  const [clients, setClients] = useState<FitnessClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const trainerAccess = user ? hasTrainerAccess(user.role) : false;

  useEffect(() => {
    if (loading || !user || !trainerAccess) return;

    setClientsLoading(true);
    fetchClients()
      .then(setClients)
      .catch((error) => setToast(error instanceof Error ? error.message : "Unable to load dashboard data."))
      .finally(() => setClientsLoading(false));
  }, [loading, trainerAccess, user]);

  if (loading || !user) {
    return <DashboardShell />;
  }

  if (!trainerAccess) {
    return <ClientDashboardHome userId={user.id} userName={user.name} />;
  }

  const activeClients = clients.filter((client) => client.status === "active");
  const pendingRenewals = activeClients.filter((client) => client.daysLeft <= 7).length;
  const clientsWithWorkoutPlans = clients.filter((client) => (client.workoutPlan.days ?? []).some((day) => day.exercises.length > 0)).length;
  const clientsWithMealPlans = clients.filter((client) => normalizeClientMealPlan(client.mealPlan).days.some((day) => day.meals.length > 0)).length;
  const assignedExerciseCount = clients.reduce(
    (total, client) => total + (client.workoutPlan.days ?? []).reduce((dayTotal, day) => dayTotal + day.exercises.length, 0),
    0,
  );
  const assignedMealCount = clients.reduce(
    (total, client) => total + normalizeClientMealPlan(client.mealPlan).days.reduce((dayTotal, day) => dayTotal + day.meals.length, 0),
    0,
  );
  const trainerNoteCount = clients.reduce((total, client) => total + client.notes.length, 0);
  const recentNotes = clients
    .flatMap((client) => client.notes.map((note) => ({ ...note, clientName: client.name, avatar: client.avatar })))
    .slice(0, 4);
  const recentClients = clients.slice(0, 4);

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Trainer Overview" />
        <TabNavigation />

        <main className="main-content">
          <section className="admin-stat-grid dashboard-overview-strip">
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Active clients</h4>
                <Users size={17} />
              </div>
              <div className="metric-val">{clientsLoading ? "-" : activeClients.length}</div>
              <span className="badge-tag">{clients.length} total clients</span>
            </article>
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Assigned exercises</h4>
                <Dumbbell size={17} />
              </div>
              <div className="metric-val">{clientsLoading ? "-" : assignedExerciseCount}</div>
              <span className="badge-tag">{clientsWithWorkoutPlans} clients with plans</span>
            </article>
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Assigned meals</h4>
                <Utensils size={17} />
              </div>
              <div className="metric-val">{clientsLoading ? "-" : assignedMealCount}</div>
              <span className="badge-tag">{clientsWithMealPlans} clients with meals</span>
            </article>
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Trainer notes</h4>
                <MessageCircle size={17} />
              </div>
              <div className="metric-val">{clientsLoading ? "-" : trainerNoteCount}</div>
              <span className="badge-tag">Visible to clients</span>
            </article>
          </section>

          <div className="dashboard-grid">
            <div className="column">
              <section className="card">
                <div className="card-title">
                  <BarChart2 size={18} /> Business Metrics
                </div>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-header">
                      <h4>Active Clients</h4>
                      <Users size={16} style={{ color: "var(--accent-red)" }} />
                    </div>
                    <div className="metric-val">{clientsLoading ? "-" : activeClients.length}</div>
                    <span className="badge-tag" style={{ background: "var(--bg-light)", color: "var(--accent-green)" }}>
                      {clients.length} total
                    </span>
                  </div>
                  <div className="metric-card">
                    <div className="metric-header">
                      <h4>Pending Renewals</h4>
                      <TrendingUp size={16} style={{ color: "var(--text-muted)" }} />
                    </div>
                    <div className="metric-val">{clientsLoading ? "-" : pendingRenewals}</div>
                    <span className="badge-tag" style={{ background: "rgba(var(--accent-rgb), 0.1)", color: "var(--accent-red)" }}>
                      Next 7 days
                    </span>
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="card-title">
                  <Dumbbell size={18} /> Training Coverage
                </div>
                <div className="admin-progress-list">
                  <DashboardProgress label="Clients with workouts" value={clientsWithWorkoutPlans} total={clients.length} />
                  <DashboardProgress label="Clients with meal plans" value={clientsWithMealPlans} total={clients.length} />
                </div>
              </section>
            </div>

            <div className="column">
              <section className="card">
                <div className="card-title">
                  <Users size={18} /> Client Plan Status
                </div>
                <div className="admin-table">
                  {recentClients.length ? (
                    recentClients.map((client) => {
                      const workoutCount = (client.workoutPlan.days ?? []).reduce((total, day) => total + day.exercises.length, 0);
                      const mealCount = normalizeClientMealPlan(client.mealPlan).days.reduce((total, day) => total + day.meals.length, 0);

                      return (
                        <div className="admin-table-row" key={client.id}>
                          <div>
                            <strong>{client.name}</strong>
                            <span>
                              {workoutCount} exercises - {mealCount} meals
                            </span>
                          </div>
                          <span className="status-pill">{client.status}</span>
                          <Link className="text-link" href={`/client-profile?clientId=${client.id}`}>
                            View
                          </Link>
                        </div>
                      );
                    })
                  ) : (
                    <div className="admin-table-row">
                      <div>
                        <strong>No clients found</strong>
                        <span>Client data will appear here once Supabase returns clients.</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="card">
                <div className="card-title">
                  <MessageCircle size={18} /> Recent Notes
                </div>
                <div className="update-feed">
                  {recentNotes.length ? (
                    recentNotes.map((note) => (
                      <ActivityItem
                        key={note.id}
                        avatar={note.avatar}
                        body={
                          <>
                            <strong>{note.clientName}</strong> - {note.body}
                          </>
                        }
                        time={note.createdAt}
                      />
                    ))
                  ) : (
                    <span className="text-muted">No trainer notes saved yet.</span>
                  )}
                </div>
                <Link className="btn-secondary link-button" href="/clients">
                  View Clients
                </Link>
              </section>
            </div>

            <div className="column">
              <section className="card">
                <div className="card-title">
                  <Zap size={18} /> Quick Actions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <QuickAction href="/clients" icon={Users} label="Open Clients" />
                  <QuickAction href="/exercises" icon={Dumbbell} label="Exercise Library" />
                  <QuickAction href="/meal-plans" icon={Utensils} label="Meal Library" />
                  <QuickAction href="/blog" icon={Edit3} label="Create Blog Post" />
                  <QuickAction href="/social" icon={PlaySquare} label="Add Media" />
                  <QuickAction href="/testimonials" icon={Star} label="Request Testimonial" />
                  <QuickAction href="/recipes" icon={FilePlus} label="Add Recipe" />
                  <QuickAction href="/leads" icon={Send} label="Open Lead Queue" />
                </div>
              </section>

              <section className="card">
                <div className="card-title">
                  <Salad size={18} /> Nutrition Coverage
                </div>
                <div className="admin-progress-list">
                  <DashboardProgress label="Assigned meals" value={assignedMealCount} total={Math.max(assignedMealCount, assignedExerciseCount, 1)} />
                  <DashboardProgress label="Assigned exercises" value={assignedExerciseCount} total={Math.max(assignedMealCount, assignedExerciseCount, 1)} />
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      <Toast message={toast} />
    </DashboardShell>
  );
}

function DashboardProgress({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <div className="admin-progress-item">
      <div>
        <strong>{label}</strong>
        <span>
          {value} of {total}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ClientDashboardHome({ userId, userName }: { userId: string; userName: string }) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [mealPlan, setMealPlan] = useState<ClientMealPlan | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    fetchClientNotes(userId)
      .then(setNotes)
      .catch(() => setNotes([]));
    fetchClientMealPlan(userId)
      .then(setMealPlan)
      .catch(() => setMealPlan(null));
    fetchClientWorkoutPlan(userId)
      .then(setWorkoutPlan)
      .catch(() => setWorkoutPlan(null));
  }, [userId]);

  const visibleMealPlan = mealPlan ? normalizeClientMealPlan(mealPlan) : null;
  const assignedMealCount = visibleMealPlan?.days.reduce((total, day) => total + day.meals.length, 0) ?? 0;
  const assignedWorkoutCount = workoutPlan?.days?.reduce((total, day) => total + day.exercises.length, 0) ?? 0;
  const nextWorkoutDay = workoutPlan?.days?.find((day) => day.exercises.length > 0);

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title={`Welcome, ${userName}`} subtitle="Your current coaching dashboard." />
        <TabNavigation label="My Progress" />

        <main className="main-content">
          <section className="admin-stat-grid dashboard-overview-strip">
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Current phase</h4>
                <Dumbbell size={17} />
              </div>
              <div className="metric-val">Week 4</div>
              <span className="badge-tag">Strength foundation</span>
            </article>
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Meals completed</h4>
                <Utensils size={17} />
              </div>
              <div className="metric-val">{assignedMealCount}</div>
              <span className="badge-tag">Assigned meals</span>
            </article>
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Assigned exercises</h4>
                <CheckCircle2 size={17} />
              </div>
              <div className="metric-val">{assignedWorkoutCount}</div>
              <span className="badge-tag">{nextWorkoutDay?.day ?? "Pending"}</span>
            </article>
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Progress trend</h4>
                <TrendingUp size={17} />
              </div>
              <div className="metric-val">+8%</div>
              <span className="badge-tag">Consistency score</span>
            </article>
          </section>

          <section className="admin-content-grid">
            <article className="card">
              <div className="card-title">
                <Utensils size={18} /> Meal Plan
              </div>
                <div className="admin-table">
                {visibleMealPlan && assignedMealCount > 0 ? (
                  visibleMealPlan.days
                    .filter((day) => day.meals.length > 0)
                    .slice(0, 3)
                    .map((day) => (
                      <div className="admin-table-row" key={day.id}>
                        <div>
                          <strong>{day.day}</strong>
                          <span>{day.meals.map((meal) => `${meal.mealTime}: ${meal.name}`).join(", ")}</span>
                        </div>
                        <span className="status-pill">Active</span>
                        <Link className="text-link" href="/meal-plans">
                          View plan
                        </Link>
                      </div>
                    ))
                ) : (
                  <div className="admin-table-row">
                    <div>
                      <strong>No meal plan assigned yet</strong>
                      <span>Your trainer has not assigned meals to this account.</span>
                    </div>
                    <span className="status-pill">Pending</span>
                    <Link className="text-link" href="/meal-plans">
                      Check meals
                    </Link>
                  </div>
                )}
              </div>
            </article>

            <aside className="card">
              <div className="card-title">
                <Dumbbell size={18} /> Exercises
              </div>
                <div className="admin-progress-list">
                {nextWorkoutDay ? (
                  <div className="admin-progress-item">
                    <div>
                      <strong>{nextWorkoutDay.title}</strong>
                      <span>
                        {nextWorkoutDay.day} - {nextWorkoutDay.exercises.length} exercises
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: "75%" }} />
                    </div>
                  </div>
                ) : (
                  <div className="admin-progress-item">
                    <div>
                      <strong>No exercises assigned yet</strong>
                      <span>Your trainer has not assigned exercises to this account.</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: "0%" }} />
                    </div>
                  </div>
                )}
                <Link className="btn-secondary link-button quick-action-link" href="/exercises">
                  View Exercise List
                </Link>
              </div>
            </aside>

            <article className="card">
              <div className="card-title">
                <Edit3 size={18} /> Trainer Notes
              </div>
              {notes.length ? (
                notes.map((note) => (
                  <div className="note-item profile-note" key={note.id}>
                    <div style={{ color: "#3B82F6", fontSize: 18, lineHeight: 1 }}>-</div>
                    <div>
                      {note.body}
                      <span className="feed-time" style={{ marginTop: 6 }}>
                        {note.createdAt}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-muted">No trainer notes yet.</span>
              )}
            </article>
          </section>
        </main>
      </div>
    </DashboardShell>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link className="btn-secondary link-button quick-action-link" href={href}>
      <Icon size={18} /> {label}
    </Link>
  );
}

function ActivityItem({ avatar, body, time }: { avatar: string; body: React.ReactNode; time: string }) {
  return (
    <div className="feed-item">
      <img src={avatar} className="feed-avatar" alt="" />
      <div className="feed-text">
        {body}
        <span className="feed-time">{time}</span>
      </div>
    </div>
  );
}

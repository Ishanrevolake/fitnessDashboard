"use client";

import {
  BarChart2,
  Camera,
  CheckCircle2,
  Dumbbell,
  Edit3,
  FilePlus,
  MessageCircle,
  PlaySquare,
  Salad,
  Scale,
  Send,
  ShoppingBasket,
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
    .flatMap((client) => client.notes.map((note) => ({ ...note, clientId: client.id, clientName: client.name, avatar: client.avatar })))
    .slice(0, 4);
  const recentClients = clients.slice(0, 4);

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Trainer Overview" />
        <TabNavigation />

        <main className="main-content">
          <section className="admin-stat-grid dashboard-overview-strip">
            <Link className="card admin-stat-card admin-stat-link" href="/clients?status=active" aria-label="View active clients">
              <div className="metric-header">
                <h4>Active clients</h4>
                <Users size={17} />
              </div>
              <div className="metric-val">{clientsLoading ? "-" : activeClients.length}</div>
              <span className="badge-tag">{clients.length} total clients</span>
            </Link>
            <Link className="card admin-stat-card admin-stat-link" href="/exercises" aria-label="View assigned exercises">
              <div className="metric-header">
                <h4>Assigned exercises</h4>
                <Dumbbell size={17} />
              </div>
              <div className="metric-val">{clientsLoading ? "-" : assignedExerciseCount}</div>
              <span className="badge-tag">{clientsWithWorkoutPlans} clients with plans</span>
            </Link>
            <Link className="card admin-stat-card admin-stat-link" href="/meal-plans" aria-label="View assigned meals">
              <div className="metric-header">
                <h4>Assigned meals</h4>
                <Utensils size={17} />
              </div>
              <div className="metric-val">{clientsLoading ? "-" : assignedMealCount}</div>
              <span className="badge-tag">{clientsWithMealPlans} clients with meals</span>
            </Link>
            <Link className="card admin-stat-card admin-stat-link" href="/clients" aria-label="View clients with trainer notes">
              <div className="metric-header">
                <h4>Trainer notes</h4>
                <MessageCircle size={17} />
              </div>
              <div className="metric-val">{clientsLoading ? "-" : trainerNoteCount}</div>
              <span className="badge-tag">Visible to clients</span>
            </Link>
          </section>

          <div className="dashboard-grid">
            <div className="column">
              <section className="card">
                <div className="card-title">
                  <BarChart2 size={18} /> Business Metrics
                </div>
                <div className="metrics-grid">
                  <Link className="metric-card metric-card-link" href="/clients?status=active" aria-label="View active clients">
                    <div className="metric-header">
                      <h4>Active Clients</h4>
                      <Users size={16} style={{ color: "var(--accent-red)" }} />
                    </div>
                    <div className="metric-val">{clientsLoading ? "-" : activeClients.length}</div>
                    <span className="badge-tag" style={{ background: "var(--bg-light)", color: "var(--accent-green)" }}>
                      {clients.length} total
                    </span>
                  </Link>
                  <Link className="metric-card metric-card-link" href="/clients?status=active&renewal=ending-soon" aria-label="View clients with renewals in the next 7 days">
                    <div className="metric-header">
                      <h4>Pending Renewals</h4>
                      <TrendingUp size={16} style={{ color: "var(--text-muted)" }} />
                    </div>
                    <div className="metric-val">{clientsLoading ? "-" : pendingRenewals}</div>
                    <span className="badge-tag" style={{ background: "rgba(var(--accent-rgb), 0.1)", color: "var(--accent-red)" }}>
                      Next 7 days
                    </span>
                  </Link>
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
                        href={`/client-profile?clientId=${note.clientId}`}
                      />
                    ))
                  ) : (
                    <span className="text-muted">No trainer notes saved yet.</span>
                  )}
                </div>
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
  const [selectedWorkoutDayId, setSelectedWorkoutDayId] = useState("");
  const [selectedMealDay, setSelectedMealDay] = useState("");
  const [shoppingVisible, setShoppingVisible] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);

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
  const workoutDays = workoutPlan?.days ?? [];
  const mealDays = visibleMealPlan?.days ?? [];
  const activeWorkoutDay = workoutDays.find((day) => day.id === selectedWorkoutDayId) ?? nextWorkoutDay ?? workoutDays[0];
  const activeMealDay = mealDays.find((day) => day.day === selectedMealDay) ?? mealDays.find((day) => day.meals.length > 0);
  const shoppingIngredients = Array.from(new Set(mealDays.flatMap((day) => day.meals.flatMap((meal) => meal.items))));
  const weekDayFallbacks = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

          <section className="card client-dashboard-block">
            <div className="client-section-heading">
              <div className="client-section-icon"><Dumbbell size={20} /></div>
              <div>
                <div className="card-title">Workout Programme</div>
                <p className="text-muted">{workoutPlan?.focus || "Your weekly training plan from your coach."}</p>
              </div>
              <Link className="client-section-link" href="/exercises">View all exercises</Link>
            </div>
            <div className="client-week-strip">
              {workoutDays.length ? workoutDays.map((day, index) => {
                const savedDayLabel = day.day?.trim();
                const dayLabel = savedDayLabel && !/^day(?:\s*\d+)?$/i.test(savedDayLabel) ? savedDayLabel : (weekDayFallbacks[index] || `Day ${index + 1}`);
                const hasExercises = day.exercises.length > 0;
                return (
                  <button className={`client-day-chip ${(activeWorkoutDay?.id === day.id) ? "active" : ""} ${hasExercises ? "has-workout" : "rest-day"}`} type="button" onClick={() => setSelectedWorkoutDayId(day.id)} key={day.id}>
                    <span>{dayLabel.slice(0, 3)}</span>
                    <strong>{hasExercises ? <Dumbbell size={14} /> : index + 1}</strong>
                    <small>{hasExercises ? (day.title || `${day.exercises.length} exercises`) : "Plan pending"}</small>
                  </button>
                );
              }) : <div className="client-empty-state"><Dumbbell size={22} /><div><strong>Your programme is being prepared</strong><span>Your trainer&apos;s weekly plan will appear here once assigned.</span></div></div>}
            </div>
            {activeWorkoutDay ? (
              <div className="client-exercise-list">
                <div className="client-workout-summary">
                  <div><span>Up next</span><h4>{(() => { const index = Math.max(0, workoutDays.findIndex((day) => day.id === activeWorkoutDay.id)); const saved = activeWorkoutDay.day?.trim(); return saved && !/^day(?:\s*\d+)?$/i.test(saved) ? saved : weekDayFallbacks[index]; })()} · {activeWorkoutDay.title || "Training session"}</h4></div>
                  <span className="status-pill">{activeWorkoutDay.exercises.length} {activeWorkoutDay.exercises.length === 1 ? "exercise" : "exercises"}</span>
                </div>
                {activeWorkoutDay.exercises.map((exercise) => (
                  <div className="client-exercise-row" key={exercise.id}>
                    <span className="client-exercise-check"><CheckCircle2 size={16} /></span>
                    <div><strong>{exercise.name}</strong><small><b>{exercise.sets || "-"}</b> sets <i /> <b>{exercise.reps || "-"}</b> reps{exercise.rest ? <><i /> {exercise.rest} rest</> : null}</small></div>
                    <span className="client-exercise-status">Ready</span>
                  </div>
                ))}
                {!activeWorkoutDay.exercises.length ? <div className="client-empty-state compact"><CheckCircle2 size={21} /><div><strong>No exercises scheduled yet</strong><span>Your trainer is still building this session.</span></div></div> : null}
              </div>
            ) : null}
          </section>

          <section className="admin-content-grid">
            <article className="card">
              <div className="card-title">
                <Utensils size={18} /> Meal Plan
              </div>
              {assignedMealCount > 0 ? <div className="client-meal-tabs">{mealDays.map((day) => <button className={activeMealDay?.id === day.id ? "active" : ""} type="button" onClick={() => setSelectedMealDay(day.day)} key={day.id}>{day.day.slice(0, 3)}</button>)}</div> : null}
              <div className="admin-table">
                {activeMealDay?.meals.length ? activeMealDay.meals.map((meal) => (
                  <div className="admin-table-row client-meal-row" key={meal.id}>
                    <div><strong>{meal.mealTime} - {meal.name}</strong><span>{meal.items.join(", ") || meal.notes}</span></div>
                    {meal.calories ? <span className="status-pill">{meal.calories} kcal</span> : null}
                  </div>
                )) : (
                  <div className="admin-table-row">
                    <div>
                      <strong>No meal plan assigned yet</strong>
                      <span>Your trainer has not assigned meals to this account.</span>
                    </div>
                    <span className="status-pill">Pending</span>
                    <Link className="text-link" href="/meal-plans">Check meals</Link>
                  </div>
                )}
              </div>
            </article>

            <aside className="card">
              <div className="card-title">
                <ShoppingBasket size={18} /> Shopping List
              </div>
              <p className="text-muted client-dashboard-description">Generated from this week&apos;s assigned meal plan.</p>
              <button className="btn-secondary client-dashboard-action" type="button" onClick={() => setShoppingVisible(true)}>Generate this week&apos;s list</button>
              {shoppingVisible ? <div className="client-shopping-list">{shoppingIngredients.length ? shoppingIngredients.map((ingredient) => (
                <label className={checkedIngredients.includes(ingredient) ? "checked" : ""} key={ingredient}>
                  <input type="checkbox" checked={checkedIngredients.includes(ingredient)} onChange={() => setCheckedIngredients((current) => current.includes(ingredient) ? current.filter((item) => item !== ingredient) : [...current, ingredient])} />
                  <span>{ingredient}</span>
                </label>
              )) : <span className="text-muted">No ingredients are available yet.</span>}</div> : null}
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

          <section className="admin-content-grid client-dashboard-secondary-grid">
            <article className="card">
              <div className="card-title"><Scale size={18} /> Measurements</div>
              <div className="client-measurement-grid">
                <div><span>Weight</span><strong>78.4 kg</strong><small>Down 1.4 kg this month</small><div className="client-trend-line"><span style={{ width: "72%" }} /></div></div>
                <div><span>Waist</span><strong>84.5 cm</strong><small>Down 2.0 cm in 6 weeks</small><div className="client-trend-line"><span style={{ width: "64%" }} /></div></div>
              </div>
              <p className="text-muted client-dashboard-footnote">Measurement logging will appear here when tracking is connected to the client profile.</p>
            </article>

            <article className="card">
              <div className="card-title"><Camera size={18} /> Progress Photos</div>
              <div className="client-photo-grid">{["Front", "Side", "Back", "Optional"].map((label) => <label className="client-photo-slot" key={label}><Camera size={20} /><strong>{label}</strong><span>Upload photo</span><input type="file" accept="image/*" /></label>)}</div>
            </article>
          </section>

          <section className="card client-dashboard-block">
            <div className="card-title"><MessageCircle size={18} /> Message Your Trainer</div>
            <div className="client-chat-box">
              <div className="client-chat-coach">Welcome back! Send me a message if you need a session or meal swap.</div>
              {sentMessages.map((item, index) => <div className="client-chat-message" key={`${item}-${index}`}>{item}</div>)}
            </div>
            <div className="client-chat-compose"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask about today's session, a swap, or anything else..." /><button className="btn-secondary" type="button" onClick={() => { if (!message.trim()) return; setSentMessages((current) => [...current, message.trim()]); setMessage(""); }}><Send size={16} /> Send</button></div>
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

function ActivityItem({ avatar, body, time, href }: { avatar: string; body: React.ReactNode; time: string; href: string }) {
  return (
    <div className="feed-item">
      <img src={avatar} className="feed-avatar" alt="" />
      <div className="feed-text">
        {body}
        <span className="feed-time">{time}</span>
      </div>
      <Link className="text-link feed-action-link" href={href}>
        Profile
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  Activity,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronLeft,
  Dumbbell,
  Edit3,
  FileText,
  Home,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  PlusCircle,
  Ruler,
  Scale,
  Search,
  Star,
  Trash2,
  Utensils,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { TabNavigation } from "@/components/tab-navigation";
import { Toast } from "@/components/toast";
import { addClientNoteViaApi, fetchClientMealPlan, fetchClientNotes, fetchClients, updateClientMealPlanViaApi, updateClientWorkoutPlanViaApi } from "@/lib/api-client";
import { addClientNote, getStoredClients, updateClientMealPlan, updateClientWorkoutPlan } from "@/lib/client-store";
import { exerciseLibrary } from "@/lib/exercise-library";
import { normalizeClientMealPlan, normalizeMealPlanDays } from "@/lib/meal-plan-utils";
import { getPackageLabel } from "@/lib/mock-data";
import { getStoredPrograms } from "@/lib/program-store";
import type { AssignedExercise, AssignedMeal, ClientMealPlan, FitnessClient, MealPlanDay, ProgramTemplate, WorkoutDay, WorkoutPlan } from "@/lib/types";

type ClientProfilePageProps = {
  clientId?: string;
  initialTab?: string;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getProfileTabFromParam(value?: string) {
  if (value === "meal") return "Meal Plan";
  if (value === "workout") return "Workout Plan";
  return "Overview";
}

export function ClientProfilePage({ clientId, initialTab }: ClientProfilePageProps) {
  const [clients, setClients] = useState<FitnessClient[]>([]);
  const [programs, setPrograms] = useState<ProgramTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => getProfileTabFromParam(initialTab));

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
    setActiveTab(getProfileTabFromParam(initialTab));
  }, [initialTab]);

  const client = useMemo(() => {
    if (clientId) return clients.find((item) => item.id === clientId);
    return clients[0];
  }, [clientId, clients]);
  const assignedProgram = useMemo(
    () => programs.find((program) => program.id === client?.workoutPlan.assignedProgramId),
    [client?.workoutPlan.assignedProgramId, programs],
  );

  useEffect(() => {
    if (!client?.id) return;

    fetchClientMealPlan(client.id)
      .then((mealPlan) => {
        if (!mealPlan) return;
        setClients((current) => current.map((item) => (item.id === client.id ? { ...item, mealPlan } : item)));
      })
      .catch(() => {
        // The profile can still render without a saved meal plan.
      });
  }, [client?.id]);

  async function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !noteBody.trim()) return;

    try {
      await addClientNoteViaApi(client.id, noteBody.trim());
      const notes = await fetchClientNotes(client.id);
      setClients((current) => current.map((item) => (item.id === client.id ? { ...item, notes } : item)));
      setNoteBody("");
      setNoteModalOpen(false);
      setToast("Note saved to database.");
    } catch (error) {
      const nextClients = addClientNote(client.id, noteBody.trim());
      setClients((current) => {
        if (current.some((item) => item.id === client.id)) {
          return current.map((item) =>
            item.id === client.id
              ? {
                  ...item,
                  notes: nextClients.find((nextClient) => nextClient.id === client.id)?.notes ?? item.notes,
                }
              : item,
          );
        }

        return nextClients;
      });
      setNoteBody("");
      setNoteModalOpen(false);
      setToast(error instanceof Error ? error.message : "Note saved locally only.");
    }
  }

  async function saveWorkoutPlan(workoutPlan: WorkoutPlan) {
    if (!client) return;

    try {
      const savedWorkoutPlan = await updateClientWorkoutPlanViaApi(client.id, workoutPlan);
      setClients((current) => current.map((item) => (item.id === client.id ? { ...item, workoutPlan: savedWorkoutPlan } : item)));
      updateClientWorkoutPlan(client.id, savedWorkoutPlan);
      setWorkoutModalOpen(false);
      setToast("Workout plan saved to database.");
    } catch (error) {
      const nextClients = updateClientWorkoutPlan(client.id, workoutPlan);
      setClients((current) => {
        if (current.some((item) => item.id === client.id)) {
          return current.map((item) => (item.id === client.id ? { ...item, workoutPlan } : item));
        }

        return nextClients;
      });
      setWorkoutModalOpen(false);
      setToast(error instanceof Error ? error.message : "Workout plan saved locally only.");
    }
  }

  async function saveMealPlan(mealPlan: ClientMealPlan) {
    if (!client) return;

    try {
      await updateClientMealPlanViaApi(client.id, mealPlan);
      const savedMealPlan = (await fetchClientMealPlan(client.id)) ?? mealPlan;
      setClients((current) => current.map((item) => (item.id === client.id ? { ...item, mealPlan: savedMealPlan } : item)));
      updateClientMealPlan(client.id, savedMealPlan);
      setMealModalOpen(false);
      setToast("Meal plan saved to database.");
    } catch (error) {
      const nextClients = updateClientMealPlan(client.id, mealPlan);
      setClients((current) => {
        if (current.some((item) => item.id === client.id)) {
          return current.map((item) => (item.id === client.id ? { ...item, mealPlan } : item));
        }

        return nextClients;
      });
      setMealModalOpen(false);
      setToast(error instanceof Error ? error.message : "Meal plan saved locally only.");
    }
  }

  async function removeMealFromPlan(dayId: string, mealId: string) {
    if (!client) return;

    const nextMealPlan = normalizeClientMealPlan(client.mealPlan);
    const updatedMealPlan = {
      ...nextMealPlan,
      days: nextMealPlan.days.map((day) =>
        day.id === dayId ? { ...day, meals: day.meals.filter((meal) => meal.id !== mealId) } : day,
      ),
    };

    try {
      await updateClientMealPlanViaApi(client.id, updatedMealPlan, "", { allowEmpty: true });
      const savedMealPlan = (await fetchClientMealPlan(client.id)) ?? updatedMealPlan;
      setClients((current) => current.map((item) => (item.id === client.id ? { ...item, mealPlan: savedMealPlan } : item)));
      updateClientMealPlan(client.id, savedMealPlan);
      setToast("Meal removed.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to remove meal.");
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="dashboard-container">
          <main className="main-content">
            <div className="card empty-state">Loading client profile...</div>
          </main>
        </div>
      </DashboardShell>
    );
  }

  if (!client) {
    return (
      <DashboardShell>
        <div className="dashboard-container">
          <main className="main-content">
            <div className="card empty-state">
              <strong>Client not found</strong>
              <span className="text-muted">{loadError || "This client profile could not be matched."}</span>
              <Link href="/clients" className="btn-secondary client-profile-link">
                Back to Clients
              </Link>
            </div>
          </main>
        </div>
      </DashboardShell>
    );
  }

  const visibleMealPlan = normalizeClientMealPlan(client.mealPlan);
  const clientProfileTabs = [
    { label: "Overview", href: "#overview" },
    { label: "Meal Plan", href: "#meal-plan" },
    { label: "Workout Plan", href: "#workout-plan" },
  ];
  const latestWeight = client.profile.weight || `${client.metrics.weight.at(-1) ?? "-"} kg`;
  const profileMetrics = [
    { label: "Weight", value: latestWeight },
    { label: "Height", value: client.profile.height || "Not added" },
    { label: "Waist", value: client.profile.waist || "Not added" },
    { label: "Gender", value: client.profile.gender || "Not added" },
    { label: "Age", value: client.profile.age || client.profile.dateOfBirth || "Not added" },
    { label: "Activity", value: client.profile.activityLevel || "Not added" },
  ];
  const mealScheduleRows = visibleMealPlan.days.flatMap((day) =>
    day.meals.map((meal) => ({
      dayId: day.id,
      day: day.day,
      meal,
      nutrition: estimateMealNutrition(meal),
    })),
  );
  const mealTotals = mealScheduleRows.reduce(
    (totals, row) => ({
      calories: totals.calories + row.nutrition.calories,
      protein: totals.protein + row.nutrition.protein,
      carbs: totals.carbs + row.nutrition.carbs,
      fat: totals.fat + row.nutrition.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <main className="main-content client-profile-layout">
          <aside className="client-summary-panel">
            <Link href="/clients" className="client-summary-back" aria-label="Back to clients">
              <ChevronLeft size={18} /> Clients
            </Link>
            <div className="client-summary-hero">
              <img src={client.avatar} alt={client.name} className="client-summary-avatar" />
            </div>
            <div className="client-summary-body">
              <h1 className="client-summary-name">{client.name}</h1>
              <span className="client-summary-package">{client.packageName ?? getPackageLabel(client.packageId)}</span>
              <span className={`client-summary-status ${client.daysLeft <= 7 ? "ending" : "active"}`}>
                {client.daysLeft > 0 ? `Ending in ${client.daysLeft} days` : "Inactive"}
              </span>

              <div className="client-summary-metrics">
                {profileMetrics.map((item) => (
                  <div className="client-summary-metric" key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="client-summary-section">
                <span className="client-meta-label">Contact</span>
                <ProfileDatum icon={<Mail size={16} />} label="Email" value={client.email} />
                <ProfileDatum icon={<Phone size={16} />} label="Phone" value={client.phone} />
                <ProfileDatum icon={<Home size={16} />} label="Timezone" value={client.timezone} />
              </div>

              <div className="client-summary-section">
                <span className="client-meta-label">Goals & Tags</span>
                <div className="client-summary-tags">
                  <span>{client.goal}</span>
                  {client.profile.activityLevel ? <span>{client.profile.activityLevel}</span> : null}
                </div>
              </div>

              <div className="client-summary-section">
                <span className="client-meta-label danger-label">Injuries & Limitations</span>
                <div className="client-summary-tags danger">
                  <span>{client.profile.injuries || "Not added"}</span>
                </div>
              </div>
            </div>
          </aside>

          <section className="client-profile-workspace">
            <TabNavigation label={activeTab} tabs={clientProfileTabs} onSelect={setActiveTab} />

            <div className="client-tab-panel">
              {activeTab === "Overview" ? (
                <div className="client-overview-grid" id="overview">
                  <section className="card notes-profile-card">
                    <div className="card-title split-title">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Edit3 size={18} style={{ color: "#F59E0B" }} /> Trainer Notes
                      </span>
                      <button className="btn-primary toolbar-button compact-button" type="button" onClick={() => setNoteModalOpen(true)}>
                        <Plus size={14} /> Add Note
                      </button>
                    </div>
                    {client.notes.length ? (
                      client.notes.map((note) => (
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
                      <div className="empty-state compact-empty">No trainer notes yet.</div>
                    )}
                  </section>

                  <section className="card gallery-profile-card">
                    <div className="card-title split-title">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Camera size={18} style={{ color: "#0EA5E9" }} /> Progress Gallery
                      </span>
                      <button className="icon-btn" type="button" aria-label="Add progress photo">
                        <PlusCircle size={18} />
                      </button>
                    </div>
                    <div className="gallery-grid">
                      {client.photos.map((photo) => (
                        <button key={photo} className="gallery-button" type="button" onClick={() => setLightboxImage(photo)}>
                          <img src={photo} alt="Progress photo" className="gallery-img" />
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}

              {activeTab === "Workout Plan" ? (
                <section className="card training-profile-card" id="workout-plan">
                <div className="card-title split-title">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Dumbbell size={18} /> Training
                  </span>
                  <button className="btn-primary toolbar-button compact-button" type="button" onClick={() => setWorkoutModalOpen(true)}>
                    <Edit3 size={14} /> Edit Plan
                  </button>
                </div>
                <div className="training-stats" style={{ marginBottom: 16 }}>
                  <TrainingStat label="Last 7 Days" value="1/3" note="Tracked" tone="green" />
                  <TrainingStat label="Last 30 Days" value="4/6" note="Tracked" tone="green" />
                  <TrainingStat label="Next Week" value="0" note="Not assigned yet" tone="red" muted />
                </div>
                <div className="workout-plan-summary">
                  <div className="workout-plan-header">
                    <span className="client-meta-label">Assigned Program</span>
                    <strong>{assignedProgram?.name ?? "Custom Workout Plan"}</strong>
                    {assignedProgram ? (
                      <span className="text-muted">
                        {assignedProgram.durationWeeks} weeks - {assignedProgram.workoutsPerWeek} workouts/week
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <span className="client-meta-label">Focus</span>
                    <p>{client.workoutPlan.focus}</p>
                  </div>
                  <div className="workout-schedule-list">
                    {client.workoutPlan.weeklySchedule.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                  {client.workoutPlan.days?.length ? (
                    <div className="assigned-workout-days">
                      {client.workoutPlan.days.map((day) => (
                        <div className="assigned-workout-day" key={day.id}>
                          <div className="assigned-day-header">
                            <strong>{day.day}</strong>
                            <span>{day.title}</span>
                          </div>
                          {day.exercises.length ? (
                            <div className="assigned-exercise-list">
                              {day.exercises.map((exercise, exerciseIndex) => (
                                <div className="assigned-exercise-row" key={exercise.id}>
                                  <div className="assigned-exercise-main">
                                    <span className="assigned-exercise-number">{exerciseIndex + 1}</span>
                                    <div>
                                      <strong>{exercise.name}</strong>
                                      {exercise.notes ? <p>{exercise.notes}</p> : null}
                                    </div>
                                  </div>
                                  <div className="assigned-exercise-prescription" aria-label={`${exercise.name} prescription`}>
                                    <span>
                                      <small>Sets</small>
                                      {exercise.sets || "-"}
                                    </span>
                                    <span>
                                      <small>Reps</small>
                                      {exercise.reps || "-"}
                                    </span>
                                    <span>
                                      <small>Rest</small>
                                      {exercise.rest || "-"}
                                    </span>
                                    <span>
                                      <small>Tempo</small>
                                      {exercise.tempo || "-"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">No exercises assigned yet.</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {client.workoutPlan.trainerNotes ? <p className="text-muted">{client.workoutPlan.trainerNotes}</p> : null}
                </div>
                <div className="profile-workout-row">
                  <div>
                    <strong style={{ color: "#2563EB" }}>Last Workout:</strong> Squat, Press, Power Clean{" "}
                    <span style={{ color: "var(--text-muted)" }}>- 7 days ago</span>
                  </div>
                  <button className="btn-secondary inline-button" type="button">
                    Check Result
                  </button>
                </div>
              </section>
              ) : null}

              {activeTab === "Meal Plan" ? (
                <section className="card meal-profile-card" id="meal-plan">
                <div className="card-title split-title">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Utensils size={18} /> Meal Plan
                  </span>
                  <button className="btn-primary toolbar-button compact-button" type="button" onClick={() => setMealModalOpen(true)}>
                    <Edit3 size={14} /> Edit Meals
                  </button>
                </div>
                <div className="meal-schedule-card">
                  <div className="meal-schedule-focus">
                    <span className="client-meta-label">Nutrition Focus</span>
                    <p>{visibleMealPlan.focus}</p>
                  </div>
                  {mealScheduleRows.length ? (
                    <div className="meal-schedule-list">
                      {mealScheduleRows.map(({ dayId, day, meal, nutrition }) => (
                        <div className="meal-schedule-row" key={`${dayId}-${meal.id}`}>
                          <time>{getMealDisplayTime(meal.mealTime)}</time>
                          <div className="meal-schedule-main">
                            <div className="meal-schedule-heading">
                              <strong>{meal.mealTime || meal.name}</strong>
                              <span>{day}</span>
                            </div>
                            <p>{meal.items.length ? meal.items.join(" - ") : meal.name}</p>
                            <div className="meal-schedule-macros">
                              <span>{nutrition.calories} kcal</span>
                              <span>P: {nutrition.protein}g</span>
                              <span>C: {nutrition.carbs}g</span>
                              <span>F: {nutrition.fat}g</span>
                            </div>
                            {meal.notes ? <p className="meal-schedule-note">{meal.notes}</p> : null}
                          </div>
                          <button className="meal-row-remove" type="button" onClick={() => removeMealFromPlan(dayId, meal.id)}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state compact-empty">No meals assigned yet.</div>
                  )}
                  <div className="meal-schedule-totals">
                    <MealTotal label="Total kcal" value={mealTotals.calories} tone="calories" />
                    <MealTotal label="Protein" value={mealTotals.protein} suffix="g" tone="protein" />
                    <MealTotal label="Carbs" value={mealTotals.carbs} suffix="g" tone="carbs" />
                    <MealTotal label="Fats" value={mealTotals.fat} suffix="g" tone="fat" />
                  </div>
                  {visibleMealPlan.trainerNotes ? <p className="text-muted meal-plan-note">{visibleMealPlan.trainerNotes}</p> : null}
                </div>
              </section>
              ) : null}
            </div>
          </section>
        </main>
      </div>

      <AddNoteModal
        open={noteModalOpen}
        value={noteBody}
        onChange={setNoteBody}
        onClose={() => setNoteModalOpen(false)}
        onSubmit={saveNote}
      />
      <WorkoutPlanModal
        open={workoutModalOpen}
        client={client}
        onClose={() => setWorkoutModalOpen(false)}
        onSubmit={saveWorkoutPlan}
      />
      <MealPlanModal
        open={mealModalOpen}
        client={client}
        onClose={() => setMealModalOpen(false)}
        onSubmit={saveMealPlan}
      />
      <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
      <Toast message={toast} />
    </DashboardShell>
  );
}

function TrainingStat({
  label,
  value,
  note,
  tone,
  muted,
}: {
  label: string;
  value: string;
  note: string;
  tone: "green" | "red";
  muted?: boolean;
}) {
  return (
    <div className="stat-box">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: muted ? "var(--text-muted)" : undefined }}>
        {value}
      </div>
      <div className="stat-label" style={{ color: tone === "green" ? "var(--accent-green)" : "var(--accent-red)" }}>
        {note}
      </div>
    </div>
  );
}

function getMealDisplayTime(mealTime: string) {
  const normalized = mealTime.toLowerCase();
  if (normalized.includes("breakfast")) return "07:00";
  if (normalized.includes("morning")) return "10:30";
  if (normalized.includes("lunch")) return "13:00";
  if (normalized.includes("pre")) return "16:00";
  if (normalized.includes("dinner")) return "19:00";
  if (normalized.includes("evening")) return "21:00";
  if (/^\d{1,2}:\d{2}/.test(mealTime)) return mealTime;
  return "--:--";
}

function estimateMealNutrition(meal: AssignedMeal) {
  if (meal.calories || meal.protein || meal.carbs || meal.fat) {
    return {
      calories: Number(meal.calories) || 0,
      protein: Number(meal.protein) || 0,
      carbs: Number(meal.carbs) || 0,
      fat: Number(meal.fat) || 0,
    };
  }
  const text = [meal.name, ...meal.items, meal.notes].join(" ").toLowerCase();
  const proteinSignals = (text.match(/chicken|beef|fish|salmon|tuna|egg|yogurt|cheese|protein|whey|milk|paneer|tofu/g) ?? []).length;
  const carbSignals = (text.match(/rice|oat|toast|bread|wrap|potato|banana|fruit|pasta|noodle|honey|flour/g) ?? []).length;
  const fatSignals = (text.match(/avocado|almond|peanut|butter|oil|nuts|cashew|coconut|cheese/g) ?? []).length;
  const base = 230 + meal.items.length * 24;
  const calories = Math.min(780, base + proteinSignals * 44 + carbSignals * 42 + fatSignals * 36);
  const protein = Math.min(62, 18 + proteinSignals * 6);
  const carbs = Math.min(92, 22 + carbSignals * 9);
  const fat = Math.min(38, 7 + fatSignals * 5);

  return { calories, protein, carbs, fat };
}

function MealTotal({
  label,
  value,
  suffix = "",
  tone,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone: "calories" | "protein" | "carbs" | "fat";
}) {
  return (
    <div className={`meal-total ${tone}`}>
      <strong>
        {value.toLocaleString()}
        {suffix}
      </strong>
      <span>{label}</span>
    </div>
  );
}

function ProfileDatum({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string }) {
  const displayValue = value?.trim() || "Not added";

  return (
    <div className="info-item profile-detail-item">
      {icon ? <span className="profile-detail-icon">{icon}</span> : null}
      <div>
        <span className="client-meta-label">{label}</span>
        <strong>{displayValue}</strong>
      </div>
    </div>
  );
}

function getEditableDays(workoutPlan: WorkoutPlan): WorkoutDay[] {
  if (workoutPlan.days?.length) {
    return workoutPlan.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => ({ ...exercise })),
    }));
  }

  return workoutPlan.weeklySchedule.map((item, index) => {
    const [day = `Day ${index + 1}`, ...titleParts] = item.split(" - ");

    return {
      id: `day-${index + 1}`,
      day: day.trim(),
      title: titleParts.join(" - ").trim() || "Workout",
      exercises: [],
    };
  });
}

function AddNoteModal({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className={`modal-overlay ${open ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="add-note-title">
        <div className="modal-header">
          <h2 id="add-note-title">Add Note</h2>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close note modal">
            <X size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="noteContent">Note Details</label>
            <textarea
              id="noteContent"
              rows={4}
              required
              placeholder="Type your note here..."
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkoutPlanModal({
  open,
  client,
  onClose,
  onSubmit,
}: {
  open: boolean;
  client: FitnessClient;
  onClose: () => void;
  onSubmit: (workoutPlan: WorkoutPlan) => void;
}) {
  const [focus, setFocus] = useState(client.workoutPlan.focus);
  const [startDate, setStartDate] = useState(getTodayDate());
  const [trainerNotes, setTrainerNotes] = useState(client.workoutPlan.trainerNotes);
  const [days, setDays] = useState<WorkoutDay[]>(() => getEditableDays(client.workoutPlan));
  const [selectedDayId, setSelectedDayId] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState(exerciseLibrary[0]?.id ?? "");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const filteredExerciseOptions = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();
    if (!query) return exerciseLibrary;

    return exerciseLibrary.filter((exercise) =>
      [exercise.name, exercise.category, exercise.equipment].some((value) => value.toLowerCase().includes(query)),
    );
  }, [exerciseSearch]);
  const selectedExercise = exerciseLibrary.find((exercise) => exercise.id === selectedExerciseId);

  useEffect(() => {
    if (!open) return;

    setFocus(client.workoutPlan.focus);
    setStartDate(getTodayDate());
    setTrainerNotes(client.workoutPlan.trainerNotes);
    const nextDays = getEditableDays(client.workoutPlan);
    setDays(nextDays);
    setSelectedDayId(nextDays[0]?.id ?? "");
    setSelectedExerciseId(exerciseLibrary[0]?.id ?? "");
    setExerciseSearch("");
    setExercisePickerOpen(false);
  }, [client, open]);

  useEffect(() => {
    if (!filteredExerciseOptions.length) return;
    if (filteredExerciseOptions.some((exercise) => exercise.id === selectedExerciseId)) return;

    setSelectedExerciseId(filteredExerciseOptions[0].id);
  }, [filteredExerciseOptions, selectedExerciseId]);

  function updateDay(dayId: string, field: "day" | "title", value: string) {
    setDays((current) => current.map((day) => (day.id === dayId ? { ...day, [field]: value } : day)));
  }

  function addDay() {
    const nextDay: WorkoutDay = {
      id: `day-${Date.now()}`,
      day: `Day ${days.length + 1}`,
      title: "New Workout",
      exercises: [],
    };

    setDays((current) => [...current, nextDay]);
    setSelectedDayId(nextDay.id);
  }

  function removeDay(dayId: string) {
    setDays((current) => {
      const nextDays = current.filter((day) => day.id !== dayId);
      setSelectedDayId(nextDays[0]?.id ?? "");
      return nextDays;
    });
  }

  function addExerciseToDay() {
    const exercise = exerciseLibrary.find((item) => item.id === selectedExerciseId);
    const dayId = selectedDayId || days[0]?.id;
    if (!exercise || !dayId) return;

    const assignedExercise: AssignedExercise = {
      id: `exercise-${Date.now()}`,
      exerciseId: exercise.id,
      name: exercise.name,
      sets: "3",
      reps: "10-12",
      rest: "60s",
      tempo: "",
      notes: "",
    };

    setDays((current) =>
      current.map((day) => (day.id === dayId ? { ...day, exercises: [...day.exercises, assignedExercise] } : day)),
    );
  }

  function updateExercise(dayId: string, exerciseId: string, field: keyof AssignedExercise, value: string) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise)),
            }
          : day,
      ),
    );
  }

  function removeExercise(dayId: string, exerciseId: string) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId ? { ...day, exercises: day.exercises.filter((exercise) => exercise.id !== exerciseId) } : day,
      ),
    );
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedDays = days
      .map((day) => ({
        ...day,
        day: day.day.trim(),
        title: day.title.trim(),
        exercises: day.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.trim(),
          reps: exercise.reps.trim(),
          rest: exercise.rest.trim(),
          tempo: exercise.tempo.trim(),
          notes: exercise.notes.trim(),
        })),
      }))
      .filter((day) => day.day && day.title);

    onSubmit({
      assignedProgramId: client.workoutPlan.assignedProgramId || "custom-workout-plan",
      focus: focus.trim(),
      startDate: getTodayDate(),
      weeklySchedule: cleanedDays.map((day) => `${day.day} - ${day.title}`),
      trainerNotes: trainerNotes.trim(),
      days: cleanedDays,
    });
  }

  return (
    <div className={`modal-overlay ${open ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content workout-modal-content" role="dialog" aria-modal="true" aria-labelledby="workout-plan-title">
        <div className="modal-header">
          <h2 id="workout-plan-title">Edit Workout Plan</h2>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close workout plan modal">
            <X size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={submitForm}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="workoutFocus">Workout Focus</label>
              <input
                id="workoutFocus"
                required
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                placeholder="Strength, hypertrophy, fat loss..."
              />
            </div>
            <div className="form-group">
              <label htmlFor="workoutStartDate">Start Date</label>
              <input id="workoutStartDate" type="date" required value={startDate} disabled />
            </div>
          </div>

          <div className="workout-builder">
            <div className="builder-header">
              <div>
                <label>Workout Days</label>
                <span className="text-muted">Build the client plan day by day, then add exercises set by set.</span>
              </div>
              <button className="btn-secondary inline-button" type="button" onClick={addDay}>
                <Plus size={14} /> Add Day
              </button>
            </div>

            <div className="exercise-add-row">
              <select className="modern-select" value={selectedDayId} onChange={(event) => setSelectedDayId(event.target.value)}>
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.day} - {day.title}
                  </option>
                ))}
              </select>
              <div className="exercise-combobox">
                <button
                  className="exercise-combobox-trigger"
                  type="button"
                  onClick={() => setExercisePickerOpen((current) => !current)}
                  aria-expanded={exercisePickerOpen}
                  aria-haspopup="listbox"
                >
                  <span>{selectedExercise?.name ?? "Select exercise"}</span>
                  <ChevronDown size={16} />
                </button>
                {exercisePickerOpen ? (
                  <div className="exercise-combobox-menu">
                    <label className="exercise-combobox-search" htmlFor="exerciseSearch">
                      <Search size={16} />
                      <input
                        id="exerciseSearch"
                        value={exerciseSearch}
                        onChange={(event) => setExerciseSearch(event.target.value)}
                        placeholder="Search exercise..."
                        autoFocus
                      />
                    </label>
                    <div className="exercise-combobox-options" role="listbox">
                      {filteredExerciseOptions.length ? (
                        filteredExerciseOptions.map((exercise) => (
                          <button
                            className={`exercise-combobox-option ${exercise.id === selectedExerciseId ? "active" : ""}`}
                            key={exercise.id}
                            type="button"
                            role="option"
                            aria-selected={exercise.id === selectedExerciseId}
                            onClick={() => {
                              setSelectedExerciseId(exercise.id);
                              setExercisePickerOpen(false);
                              setExerciseSearch("");
                            }}
                          >
                            <span>{exercise.name}</span>
                            <small>
                              {exercise.category} - {exercise.equipment}
                            </small>
                          </button>
                        ))
                      ) : (
                        <div className="exercise-combobox-empty">No exercises found</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <button className="btn-primary toolbar-button" type="button" onClick={addExerciseToDay} disabled={!selectedExercise}>
                <Plus size={14} /> Add Exercise
              </button>
            </div>

            <div className="workout-day-editor-list">
              {days.map((day) => (
                <div className="workout-day-editor" key={day.id}>
                  <div className="day-editor-header">
                    <div className="form-row day-title-row">
                      <div className="form-group">
                        <label htmlFor={`${day.id}-day`}>Day</label>
                        <input id={`${day.id}-day`} required value={day.day} onChange={(event) => updateDay(day.id, "day", event.target.value)} />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`${day.id}-title`}>Session Title</label>
                        <input id={`${day.id}-title`} required value={day.title} onChange={(event) => updateDay(day.id, "title", event.target.value)} />
                      </div>
                    </div>
                    <button className="icon-btn" type="button" onClick={() => removeDay(day.id)} aria-label={`Remove ${day.day}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {day.exercises.length ? (
                    <div className="exercise-prescription-list">
                      {day.exercises.map((exercise) => (
                        <div className="exercise-prescription" key={exercise.id}>
                          <div className="prescription-title">
                            <strong>{exercise.name}</strong>
                            <button className="icon-btn" type="button" onClick={() => removeExercise(day.id, exercise.id)} aria-label={`Remove ${exercise.name}`}>
                              <X size={16} />
                            </button>
                          </div>
                          <div className="prescription-grid">
                            <label className="prescription-field">
                              <span>Sets</span>
                              <input value={exercise.sets} onChange={(event) => updateExercise(day.id, exercise.id, "sets", event.target.value)} />
                            </label>
                            <label className="prescription-field">
                              <span>Reps</span>
                              <input value={exercise.reps} onChange={(event) => updateExercise(day.id, exercise.id, "reps", event.target.value)} />
                            </label>
                            <label className="prescription-field">
                              <span>Rest</span>
                              <input value={exercise.rest} onChange={(event) => updateExercise(day.id, exercise.id, "rest", event.target.value)} />
                            </label>
                            <label className="prescription-field">
                              <span>Tempo</span>
                              <input value={exercise.tempo} onChange={(event) => updateExercise(day.id, exercise.id, "tempo", event.target.value)} />
                            </label>
                          </div>
                          <label className="prescription-notes">
                            <span>Coach notes</span>
                            <textarea
                              rows={2}
                              value={exercise.notes}
                              onChange={(event) => updateExercise(day.id, exercise.id, "notes", event.target.value)}
                              placeholder="Coaching notes, load targets, substitutions..."
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-day">No exercises assigned for this day.</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="trainerNotes">Trainer Notes</label>
            <textarea
              id="trainerNotes"
              rows={3}
              value={trainerNotes}
              onChange={(event) => setTrainerNotes(event.target.value)}
              placeholder="Progression notes, restrictions, or coaching cues..."
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getEditableMealDays(mealPlan?: ClientMealPlan): MealPlanDay[] {
  return normalizeMealPlanDays(mealPlan?.days);
}

function MealPlanModal({
  open,
  client,
  onClose,
  onSubmit,
}: {
  open: boolean;
  client: FitnessClient;
  onClose: () => void;
  onSubmit: (mealPlan: ClientMealPlan) => Promise<void> | void;
}) {
  const [focus, setFocus] = useState(client.mealPlan?.focus ?? "Custom nutrition plan");
  const [startDate, setStartDate] = useState(client.mealPlan?.startDate ?? getTodayDate());
  const [trainerNotes, setTrainerNotes] = useState(client.mealPlan?.trainerNotes ?? "");
  const [days, setDays] = useState<MealPlanDay[]>(() => getEditableMealDays(client.mealPlan));
  const [selectedDayId, setSelectedDayId] = useState("");
  const [mealName, setMealName] = useState("");
  const [mealTime, setMealTime] = useState("Breakfast");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [activeDayId, setActiveDayId] = useState(() => getEditableMealDays(client.mealPlan)[0]?.id ?? "");
  const [nutritionView, setNutritionView] = useState<"day" | "week">("day");

  useEffect(() => {
    if (!open) return;

    const nextDays = getEditableMealDays(client.mealPlan);
    setFocus(client.mealPlan?.focus ?? "Custom nutrition plan");
    setStartDate(client.mealPlan?.startDate ?? getTodayDate());
    setTrainerNotes(client.mealPlan?.trainerNotes ?? "");
    setDays(nextDays);
    setSelectedDayId("every-day");
    setMealName("");
    setMealTime("Breakfast");
    setSaving(false);
    setFormError("");
    setActiveDayId(nextDays[0]?.id ?? "");
    setNutritionView("day");
  }, [client, open]);

  function addMealToDay() {
    const dayId = selectedDayId || days[0]?.id;
    const name = mealName.trim();
    if (!name || !dayId) {
      setFormError("Enter a meal name before adding it.");
      return;
    }

    const createAssignedMeal = (targetDayId: string): AssignedMeal => ({
      id: `meal-${Date.now()}-${targetDayId}`,
      mealId: "",
      name,
      mealTime,
      items: [""],
      notes: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });

    setDays((current) =>
      current.map((day) =>
        dayId === "every-day" || day.id === dayId ? { ...day, meals: [...day.meals, createAssignedMeal(day.id)] } : day,
      ),
    );
    setFormError("");
    setMealName("");
    if (dayId !== "every-day") setActiveDayId(dayId);
  }

  function updateMeal(dayId: string, mealId: string, field: keyof AssignedMeal, value: string) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              meals: day.meals.map((meal) =>
                meal.id === mealId
                  ? { ...meal, [field]: ["calories", "protein", "carbs", "fat"].includes(field) ? Math.max(0, Number(value) || 0) : value }
                  : meal,
              ),
            }
          : day,
      ),
    );
  }

  function updateIngredient(dayId: string, mealId: string, index: number, value: string) {
    setDays((current) => current.map((day) => day.id === dayId ? {
      ...day,
      meals: day.meals.map((meal) => meal.id === mealId ? { ...meal, items: meal.items.map((item, itemIndex) => itemIndex === index ? value : item) } : meal),
    } : day));
  }

  function addIngredient(dayId: string, mealId: string) {
    setDays((current) => current.map((day) => day.id === dayId ? {
      ...day,
      meals: day.meals.map((meal) => meal.id === mealId ? { ...meal, items: [...meal.items, ""] } : meal),
    } : day));
  }

  function removeIngredient(dayId: string, mealId: string, index: number) {
    setDays((current) => current.map((day) => day.id === dayId ? {
      ...day,
      meals: day.meals.map((meal) => meal.id === mealId ? { ...meal, items: meal.items.filter((_, itemIndex) => itemIndex !== index) } : meal),
    } : day));
  }

  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0];
  const dayNutrition = (activeDay?.meals ?? []).reduce((total, meal) => ({
    calories: total.calories + (Number(meal.calories) || 0), protein: total.protein + (Number(meal.protein) || 0),
    carbs: total.carbs + (Number(meal.carbs) || 0), fat: total.fat + (Number(meal.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const weekNutrition = days.flatMap((day) => day.meals).reduce((total, meal) => ({
    calories: total.calories + (Number(meal.calories) || 0), protein: total.protein + (Number(meal.protein) || 0),
    carbs: total.carbs + (Number(meal.carbs) || 0), fat: total.fat + (Number(meal.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const displayedNutrition = nutritionView === "day" ? dayNutrition : weekNutrition;
  const nutritionTarget = nutritionView === "day"
    ? { calories: 2200, protein: 150, carbs: 220, fat: 70 }
    : { calories: 15400, protein: 1050, carbs: 1540, fat: 490 };
  const calorieProgress = Math.min(100, Math.round((displayedNutrition.calories / nutritionTarget.calories) * 100));
  const macroCalories = displayedNutrition.protein * 4 + displayedNutrition.carbs * 4 + displayedNutrition.fat * 9;
  const proteinDegrees = macroCalories ? (displayedNutrition.protein * 4 / macroCalories) * 360 : 0;
  const carbDegrees = macroCalories ? proteinDegrees + (displayedNutrition.carbs * 4 / macroCalories) * 360 : 0;

  function removeMeal(dayId: string, mealId: string) {
    setDays((current) => current.map((day) => (day.id === dayId ? { ...day, meals: day.meals.filter((meal) => meal.id !== mealId) } : day)));
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDays = normalizeMealPlanDays(days);
    const cleanedDays = normalizedDays.map((day) => ({
      ...day,
      meals: day.meals.map((meal) => ({
        ...meal,
        name: meal.name.trim(),
        items: meal.items.map((item) => item.trim()).filter(Boolean),
        mealTime: meal.mealTime.trim(),
        notes: meal.notes.trim(),
      })),
    }));

    if (!cleanedDays.some((day) => day.meals.length > 0)) {
      setFormError("Select a meal before saving the meal plan.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await onSubmit({
        focus: focus.trim(),
        startDate,
        trainerNotes: trainerNotes.trim(),
        days: cleanedDays,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`modal-overlay ${open ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content workout-modal-content" role="dialog" aria-modal="true" aria-labelledby="meal-plan-title">
        <div className="modal-header">
          <h2 id="meal-plan-title">Edit Meal Plan</h2>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close meal plan modal">
            <X size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={submitForm}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mealFocus">Nutrition Focus</label>
              <input id="mealFocus" required value={focus} onChange={(event) => setFocus(event.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="mealStartDate">Start Date</label>
              <input id="mealStartDate" type="date" required value={startDate} disabled />
            </div>
          </div>

          <div className="workout-builder">
            <div className="builder-header">
              <div>
                <label>Weekly Meal Days</label>
                <span className="text-muted">Choose a meal and save, or add multiple meals before saving.</span>
              </div>
            </div>

            <div className="meal-day-tabs" role="tablist" aria-label="Meal plan days">
              {days.map((day) => {
                const calories = day.meals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0);
                return <button key={day.id} type="button" className={day.id === activeDay?.id ? "active" : ""} onClick={() => { setActiveDayId(day.id); setSelectedDayId(day.id); }}><span>{day.day.slice(0, 3)}</span><small>{calories || "—"}</small></button>;
              })}
            </div>

            <div className="exercise-add-row meal-add-bar">
              <select
                className="modern-select"
                value={selectedDayId}
                onChange={(event) => {
                  setSelectedDayId(event.target.value);
                }}
              >
                <option value="every-day">Every day</option>
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.day}
                  </option>
                ))}
              </select>
              <select
                className="modern-select"
                value={mealTime}
                onChange={(event) => {
                  setMealTime(event.target.value);
                }}
              >
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
                <option>Snack</option>
                <option>Pre-workout</option>
                <option>Post-workout</option>
              </select>
              <input className="meal-name-input" value={mealName} placeholder="e.g. Grilled chicken & rice" onChange={(event) => setMealName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addMealToDay(); } }} />
              <button className="btn-primary toolbar-button" type="button" onClick={addMealToDay}>
                <Plus size={14} /> Add Meal
              </button>
            </div>

            <div className="meal-editor-layout">
            <div className="workout-day-editor-list meal-card-list">
              {activeDay ? [activeDay].map((day) => (
                <div className="workout-day-editor" key={day.id}>
                  {day.meals.length ? (
                    <div className="exercise-prescription-list">
                      {day.meals.map((meal) => (
                        <div className="exercise-prescription" key={meal.id}>
                          <div className="prescription-title">
                            <div><span className="meal-slot-badge">{meal.mealTime}</span><strong>{meal.name}</strong></div>
                            <button className="icon-btn" type="button" onClick={() => removeMeal(day.id, meal.id)} aria-label={`Remove ${meal.name}`}>
                              <X size={16} />
                            </button>
                          </div>
                          <div className="meal-recipe-lines meal-ingredient-editor">
                            {meal.items.map((item, index) => (
                              <div key={`${meal.id}-ingredient-${index}`}><input value={item} placeholder="Ingredient / portion" onChange={(event) => updateIngredient(day.id, meal.id, index, event.target.value)} /><button type="button" className="icon-btn" onClick={() => removeIngredient(day.id, meal.id, index)} aria-label="Remove ingredient"><X size={14} /></button></div>
                            ))}
                            <button type="button" className="meal-add-ingredient" onClick={() => addIngredient(day.id, meal.id)}><Plus size={13} /> Add ingredient</button>
                          </div>
                          <div className="meal-macro-grid">
                            {([['calories', 'Calories'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fat', 'Fat (g)']] as const).map(([field, label]) => <label key={field} className={`meal-macro-${field}`}><span>{label}</span><input type="number" min="0" value={meal[field] ?? 0} onChange={(event) => updateMeal(day.id, meal.id, field, event.target.value)} /></label>)}
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label htmlFor={`${meal.id}-time`}>Meal Time</label>
                              <input id={`${meal.id}-time`} value={meal.mealTime} onChange={(event) => updateMeal(day.id, meal.id, "mealTime", event.target.value)} />
                            </div>
                            <div className="form-group">
                              <label htmlFor={`${meal.id}-notes`}>Notes</label>
                              <input id={`${meal.id}-notes`} value={meal.notes} onChange={(event) => updateMeal(day.id, meal.id, "notes", event.target.value)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-day">No meals assigned for this day.</div>
                  )}
                </div>
              )) : null}
            </div>
            <aside className="meal-nutrition-panel">
              <div className="meal-nutrition-head"><h3>Nutrition intake</h3><div><button type="button" className={nutritionView === "day" ? "active" : ""} onClick={() => setNutritionView("day")}>{activeDay?.day.slice(0, 3) ?? "Day"}</button><button type="button" className={nutritionView === "week" ? "active" : ""} onClick={() => setNutritionView("week")}>Week</button></div></div>
              <div className="meal-calorie-ring" style={{ background: macroCalories ? `conic-gradient(#ff6b5e 0deg ${proteinDegrees}deg, #f8c44f ${proteinDegrees}deg ${carbDegrees}deg, #6d8cff ${carbDegrees}deg 360deg)` : "#252b34" }}><div><strong>{Math.round(displayedNutrition.calories)}</strong><span>kcal · of {nutritionTarget.calories}</span></div></div>
              <p className="meal-target-progress">♨ {calorieProgress}% of {nutritionView === "day" ? "daily" : "weekly"} target</p>
              {([['protein', 'Protein', '#ff6b5e'], ['carbs', 'Carbs', '#f8c44f'], ['fat', 'Fat', '#6d8cff']] as const).map(([field, label, color]) => {
                const value = displayedNutrition[field]; const target = nutritionTarget[field];
                return <div className="meal-nutrition-row" key={field}><div><span><i style={{ background: color }} />{label}</span><strong>{value}g <small>/ {target}g</small></strong></div><div className="meal-nutrition-track"><span style={{ width: `${Math.min(100, value / target * 100)}%`, background: color }} /></div></div>;
              })}
            </aside>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="mealTrainerNotes">Trainer Notes</label>
            <textarea id="mealTrainerNotes" rows={3} value={trainerNotes} onChange={(event) => setTrainerNotes(event.target.value)} />
          </div>

          {formError ? <div className="auth-error">{formError}</div> : null}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Meal Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Lightbox({ image, onClose }: { image: string | null; onClose: () => void }) {
  return (
    <div className={`modal-overlay ${image ? "active" : ""} lightbox-modal`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content lightbox-content">
        <button className="close-modal icon-btn lightbox-close" type="button" onClick={onClose} aria-label="Close lightbox">
          <X size={20} />
        </button>
        {image ? <img src={image} alt="Selected progress photo" className="lightbox-image" /> : null}
      </div>
    </div>
  );
}

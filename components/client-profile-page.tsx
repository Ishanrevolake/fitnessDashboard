"use client";

import Link from "next/link";
import {
  Activity,
  CalendarDays,
  Camera,
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
import { mealLibrary } from "@/lib/meal-library";
import { normalizeClientMealPlan, normalizeMealPlanDays } from "@/lib/meal-plan-utils";
import { getPackageLabel } from "@/lib/mock-data";
import { getStoredPrograms } from "@/lib/program-store";
import type { AssignedExercise, AssignedMeal, ClientMealPlan, FitnessClient, MealPlanDay, ProgramTemplate, WorkoutDay, WorkoutPlan } from "@/lib/types";

type ClientProfilePageProps = {
  clientId?: string;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ClientProfilePage({ clientId }: ClientProfilePageProps) {
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
  const [activeTab, setActiveTab] = useState("Overview");

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
                              {day.exercises.map((exercise) => (
                                <div className="assigned-exercise-row" key={exercise.id}>
                                  <div>
                                    <strong>{exercise.name}</strong>
                                    <span>
                                      {exercise.sets} sets x {exercise.reps} reps
                                      {exercise.rest ? ` - ${exercise.rest} rest` : ""}
                                      {exercise.tempo ? ` - ${exercise.tempo} tempo` : ""}
                                    </span>
                                  </div>
                                  {exercise.notes ? <p>{exercise.notes}</p> : null}
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

  useEffect(() => {
    if (!open) return;

    setFocus(client.workoutPlan.focus);
    setStartDate(getTodayDate());
    setTrainerNotes(client.workoutPlan.trainerNotes);
    const nextDays = getEditableDays(client.workoutPlan);
    setDays(nextDays);
    setSelectedDayId(nextDays[0]?.id ?? "");
    setSelectedExerciseId(exerciseLibrary[0]?.id ?? "");
  }, [client, open]);

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
              <select className="modern-select exercise-select" value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)}>
                {exerciseLibrary.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
              <button className="btn-primary toolbar-button" type="button" onClick={addExerciseToDay}>
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
                            <label>
                              Sets
                              <input value={exercise.sets} onChange={(event) => updateExercise(day.id, exercise.id, "sets", event.target.value)} />
                            </label>
                            <label>
                              Reps
                              <input value={exercise.reps} onChange={(event) => updateExercise(day.id, exercise.id, "reps", event.target.value)} />
                            </label>
                            <label>
                              Rest
                              <input value={exercise.rest} onChange={(event) => updateExercise(day.id, exercise.id, "rest", event.target.value)} />
                            </label>
                            <label>
                              Tempo
                              <input value={exercise.tempo} onChange={(event) => updateExercise(day.id, exercise.id, "tempo", event.target.value)} />
                            </label>
                          </div>
                          <textarea
                            rows={2}
                            value={exercise.notes}
                            onChange={(event) => updateExercise(day.id, exercise.id, "notes", event.target.value)}
                            placeholder="Coaching notes, load targets, substitutions..."
                          />
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
  const [startDate, setStartDate] = useState(getTodayDate());
  const [trainerNotes, setTrainerNotes] = useState(client.mealPlan?.trainerNotes ?? "");
  const [days, setDays] = useState<MealPlanDay[]>(() => getEditableMealDays(client.mealPlan));
  const [selectedDayId, setSelectedDayId] = useState("");
  const [selectedMealId, setSelectedMealId] = useState(mealLibrary[0]?.id ?? "");
  const [mealTime, setMealTime] = useState("Breakfast");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pendingSelection, setPendingSelection] = useState(false);

  useEffect(() => {
    if (!open) return;

    const nextDays = getEditableMealDays(client.mealPlan);
    setFocus(client.mealPlan?.focus ?? "Custom nutrition plan");
    setStartDate(getTodayDate());
    setTrainerNotes(client.mealPlan?.trainerNotes ?? "");
    setDays(nextDays);
    setSelectedDayId("every-day");
    setSelectedMealId(mealLibrary[0]?.id ?? "");
    setMealTime("Breakfast");
    setSaving(false);
    setFormError("");
    setPendingSelection(false);
  }, [client, open]);

  function addMealToDay() {
    const meal = mealLibrary.find((item) => item.id === selectedMealId);
    const dayId = selectedDayId || days[0]?.id;
    if (!meal || !dayId) return;

    const createAssignedMeal = (targetDayId: string): AssignedMeal => ({
      id: `meal-${Date.now()}-${targetDayId}`,
      mealId: meal.id,
      name: meal.name,
      mealTime,
      items: [...meal.items],
      notes: "",
    });

    setDays((current) =>
      current.map((day) =>
        dayId === "every-day" || day.id === dayId ? { ...day, meals: [...day.meals, createAssignedMeal(day.id)] } : day,
      ),
    );
    setFormError("");
    setPendingSelection(false);
  }

  function getDaysWithSelectedMeal() {
    const meal = mealLibrary.find((item) => item.id === selectedMealId);
    const dayId = selectedDayId || days[0]?.id;
    if (!meal || !dayId) return normalizeMealPlanDays(days);

    const createAssignedMeal = (targetDayId: string): AssignedMeal => ({
      id: `meal-${Date.now()}-${targetDayId}`,
      mealId: meal.id,
      name: meal.name,
      mealTime,
      items: [...meal.items],
      notes: "",
    });

    return normalizeMealPlanDays(days).map((day) =>
      dayId === "every-day" || day.id === dayId ? { ...day, meals: [...day.meals, createAssignedMeal(day.id)] } : day,
    );
  }

  function updateMeal(dayId: string, mealId: string, field: keyof AssignedMeal, value: string) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              meals: day.meals.map((meal) => (meal.id === mealId ? { ...meal, [field]: value } : meal)),
            }
          : day,
      ),
    );
  }

  function removeMeal(dayId: string, mealId: string) {
    setDays((current) => current.map((day) => (day.id === dayId ? { ...day, meals: day.meals.filter((meal) => meal.id !== mealId) } : day)));
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDays = normalizeMealPlanDays(days);
    const sourceDays = pendingSelection || !normalizedDays.some((day) => day.meals.length > 0) ? getDaysWithSelectedMeal() : normalizedDays;
    const cleanedDays = sourceDays.map((day) => ({
      ...day,
      meals: day.meals.map((meal) => ({
        ...meal,
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
        startDate: getTodayDate(),
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

            <div className="exercise-add-row">
              <select
                className="modern-select"
                value={selectedDayId}
                onChange={(event) => {
                  setSelectedDayId(event.target.value);
                  setPendingSelection(true);
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
                  setPendingSelection(true);
                }}
              >
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
                <option>Snack</option>
                <option>Pre-workout</option>
                <option>Post-workout</option>
              </select>
              <select
                className="modern-select exercise-select"
                value={selectedMealId}
                onChange={(event) => {
                  setSelectedMealId(event.target.value);
                  setPendingSelection(true);
                }}
              >
                {mealLibrary.map((meal) => (
                  <option key={meal.id} value={meal.id}>
                    {meal.name}
                  </option>
                ))}
              </select>
              <button className="btn-primary toolbar-button" type="button" onClick={addMealToDay}>
                <Plus size={14} /> Add Selected Meal
              </button>
            </div>

            <div className="workout-day-editor-list">
              {days.map((day) => (
                <div className="workout-day-editor" key={day.id}>
                  <div className="day-editor-header">
                    <strong className="meal-day-heading">{day.day}</strong>
                  </div>

                  {day.meals.length ? (
                    <div className="exercise-prescription-list">
                      {day.meals.map((meal) => (
                        <div className="exercise-prescription" key={meal.id}>
                          <div className="prescription-title">
                            <strong>{meal.mealTime}: {meal.name}</strong>
                            <button className="icon-btn" type="button" onClick={() => removeMeal(day.id, meal.id)} aria-label={`Remove ${meal.name}`}>
                              <X size={16} />
                            </button>
                          </div>
                          <div className="meal-recipe-lines">
                            {meal.items.slice(0, 5).map((item) => (
                              <span key={item}>{item}</span>
                            ))}
                            {meal.items.length > 5 ? <span>+ {meal.items.length - 5} more lines</span> : null}
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
              ))}
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

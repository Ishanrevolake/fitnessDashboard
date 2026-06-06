"use client";

import { CalendarDays, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { fetchClientWorkoutPlan } from "@/lib/api-client";
import { hasTrainerAccess } from "@/lib/auth-store";
import { exerciseCategories, exerciseLibrary } from "@/lib/exercise-library";
import type { AssignedExercise, ExerciseCategory, ExerciseLibraryItem, WorkoutDay, WorkoutPlan } from "@/lib/types";

const customExercisesStorageKey = "alphaFitnessCustomExercises";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getStoredCustomExercises() {
  if (typeof window === "undefined") return [];

  try {
    const rawExercises = window.localStorage.getItem(customExercisesStorageKey);
    if (!rawExercises) return [];

    return JSON.parse(rawExercises) as ExerciseLibraryItem[];
  } catch {
    return [];
  }
}

function saveStoredCustomExercises(exercises: ExerciseLibraryItem[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(customExercisesStorageKey, JSON.stringify(exercises));
}

export function ExercisesPage() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | "">("");
  const [customExercises, setCustomExercises] = useState<ExerciseLibraryItem[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState("");
  const trainerAccess = user ? hasTrainerAccess(user.role) : false;
  const allExercises = useMemo(() => [...customExercises, ...exerciseLibrary], [customExercises]);

  const filteredExercises = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return allExercises.filter((exercise) => {
      const matchesSearch =
        !normalizedSearch ||
        [exercise.name, exercise.category, exercise.equipment].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesCategory = !category || exercise.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [allExercises, category, search]);

  useEffect(() => {
    setCustomExercises(getStoredCustomExercises());
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user || trainerAccess) {
      setPlanLoading(false);
      return;
    }

    setPlanLoading(true);
    setPlanError("");

    fetchClientWorkoutPlan(user.id)
      .then(setWorkoutPlan)
      .catch((error) => setPlanError(error instanceof Error ? error.message : "Unable to load assigned exercises."))
      .finally(() => setPlanLoading(false));
  }, [authLoading, trainerAccess, user]);

  if (!authLoading && user && !trainerAccess) {
    return (
      <DashboardShell>
        <PageHeader title="My Exercises" subtitle="Your assigned workout plan from your trainer" />

        <main className="main-content">
          {planLoading ? <div className="card empty-state">Loading assigned exercises...</div> : null}
          {planError ? (
            <div className="auth-error">
              {planError}
            </div>
          ) : null}
          {!planLoading && !planError && !workoutPlan ? (
            <div className="card empty-state">
              <strong>No exercises assigned yet</strong>
              <span className="text-muted">Your trainer has not assigned a workout plan to this account.</span>
            </div>
          ) : null}
          {workoutPlan ? <ClientAssignedExercises workoutPlan={workoutPlan} /> : null}
        </main>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader title="Exercise Library" subtitle={`${allExercises.length} exercises available in the library`} />

      <main className="main-content">
        <section className="search-section exercise-filter-bar">
          <div className="search-control">
            <Search size={20} style={{ color: "var(--text-muted)" }} />
            <input placeholder="Search by exercise, category, or equipment..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className="modern-select" value={category} onChange={(event) => setCategory(event.target.value as ExerciseCategory | "")}>
            <option value="">All Categories</option>
            {exerciseCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button className="btn-primary toolbar-button add-exercise-button" type="button" onClick={() => setAddModalOpen(true)}>
            <Plus size={14} /> Add Exercise
          </button>
        </section>

        <section className="exercise-library-grid">
          {filteredExercises.map((exercise) => (
            <ExerciseLibraryCard key={exercise.id} exercise={exercise} />
          ))}
        </section>
      </main>
      <AddExerciseModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={(exercise) => {
          const nextExercises = [exercise, ...customExercises];
          setCustomExercises(nextExercises);
          saveStoredCustomExercises(nextExercises);
          setAddModalOpen(false);
        }}
      />
    </DashboardShell>
  );
}

function AddExerciseModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (exercise: ExerciseLibraryItem) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("Chest");
  const [equipment, setEquipment] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;

    setName("");
    setCategory("Chest");
    setEquipment("");
    setFormError("");
  }, [open]);

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEquipment = equipment.trim();

    if (!trimmedName || !trimmedEquipment) {
      setFormError("Add an exercise name and equipment before saving.");
      return;
    }

    onSubmit({
      id: `custom-${slugify(trimmedName)}-${Date.now()}`,
      name: trimmedName,
      category,
      equipment: trimmedEquipment,
    });
  }

  return (
    <div className={`modal-overlay ${open ? "active" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="add-exercise-title">
        <div className="modal-header">
          <h2 id="add-exercise-title">Add Exercise</h2>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close add exercise modal">
            <X size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={submitForm}>
          {formError ? <div className="auth-error">{formError}</div> : null}

          <div className="form-group">
            <label htmlFor="exerciseName">Exercise Name</label>
            <input id="exerciseName" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Bench press" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="exerciseCategory">Category</label>
              <select id="exerciseCategory" className="modern-select" value={category} onChange={(event) => setCategory(event.target.value as ExerciseCategory)}>
                {exerciseCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="exerciseEquipment">Equipment</label>
              <input id="exerciseEquipment" required value={equipment} onChange={(event) => setEquipment(event.target.value)} placeholder="Barbell, bench..." />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Exercise
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatExerciseName(name: string) {
  return name.replace(/\b(db)\b/gi, "DB").toUpperCase();
}

function getExerciseMeta(exercise: { name: string; category: ExerciseCategory; equipment: string }) {
  const value = exercise.name.toLowerCase();
  const primaryByCategory: Record<ExerciseCategory, string> = {
    Chest: "Pectorals",
    Back: "Lats, Mid Back",
    Shoulders: "Deltoids",
    Arms: "Biceps, Triceps",
    Legs: "Quads, Hamstrings",
    Glutes: "Glutes",
    Core: "Abdominals",
    Cardio: "Full Body",
    Mobility: "Mobility Chain",
  };
  const secondaryByCategory: Record<ExerciseCategory, string> = {
    Chest: "Anterior Deltoid",
    Back: "Biceps",
    Shoulders: "Traps",
    Arms: "Forearms",
    Legs: "Glutes",
    Glutes: "Hamstrings",
    Core: "Hip Flexors",
    Cardio: "Core",
    Mobility: "Stabilizers",
  };
  const level = /(basic|push ups|plank|calf|cable|machine|walkout)/.test(value) ? "Beginner" : /(smith|barbell|deficit|bulgarian|hack|jm press)/.test(value) ? "Intermediate" : "Intermediate";
  const pattern = /(fly|curl|extension|raise|kickback|leg curls|pec dec)/.test(value) ? "Isolation" : "Compound";
  const goal = /(press|row|squat|rdl|lunge|hip thrust|pull|dead hang)/.test(value) ? "Strength" : "Hypertrophy";

  return {
    primary: primaryByCategory[exercise.category],
    secondary: secondaryByCategory[exercise.category],
    level,
    pattern,
    goal,
  };
}

function ExerciseLibraryCard({ exercise }: { exercise: { id: string; name: string; category: ExerciseCategory; equipment: string } }) {
  const meta = getExerciseMeta(exercise);

  return (
    <article className="exercise-library-card">
      <div className="exercise-library-head">
        <span className="exercise-category-chip">{exercise.category}</span>
        <h3>{formatExerciseName(exercise.name)}</h3>
        <p>
          {exercise.equipment} · {meta.pattern}
        </p>
      </div>

      <div className="exercise-detail-list">
        <div>
          <span>Primary</span>
          <strong>{meta.primary}</strong>
        </div>
        <div>
          <span>Secondary</span>
          <strong>{meta.secondary}</strong>
        </div>
        <div>
          <span>Equipment</span>
          <strong>{exercise.equipment}</strong>
        </div>
        <div>
          <span>Level</span>
          <strong>{meta.level}</strong>
        </div>
      </div>

      <div className="exercise-library-tags">
        <span>{meta.goal}</span>
        <span>{meta.pattern}</span>
      </div>

      <div className="exercise-library-actions">
        <button type="button">View Guide</button>
        <button type="button">+ Plan</button>
      </div>
    </article>
  );
}

function ClientAssignedExercises({ workoutPlan }: { workoutPlan: WorkoutPlan }) {
  const assignedDays = getSafeWorkoutDays(workoutPlan);

  return (
    <section className="client-exercise-plan">
      <div className="card client-plan-overview">
        <div>
          <span className="client-meta-label">Focus</span>
          <h2>{workoutPlan.focus}</h2>
        </div>
        <div>
          <span className="client-meta-label">Start Date</span>
          <strong>{workoutPlan.startDate}</strong>
        </div>
      </div>

      {assignedDays.length ? (
        <div className="client-workout-day-list">
          {assignedDays.map((day) => (
            <article className="card client-workout-day-card" key={day.id}>
              <div className="client-workout-day-title">
                <div className="exercise-card-icon">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <span className="client-meta-label">{day.day}</span>
                  <h3>{day.title}</h3>
                </div>
              </div>

              {day.exercises.length > 0 ? (
                <div className="client-assigned-exercises">
                  {day.exercises.map((exercise, index) => (
                    <div className="client-assigned-exercise" key={exercise.id}>
                      <div className="exercise-order">{index + 1}</div>
                      <div>
                        <strong>{exercise.name}</strong>
                        <div className="client-prescription-grid">
                          <span>{exercise.sets || "-"} sets</span>
                          <span>{exercise.reps || "-"} reps</span>
                          <span>{exercise.rest || "-"} rest</span>
                          <span>{exercise.tempo || "-"} tempo</span>
                        </div>
                        {exercise.notes ? <p>{exercise.notes}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted">No exercises added for this day yet.</span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <strong>No exercise days added yet</strong>
          <span className="text-muted">Your trainer has started a plan but has not added day-by-day exercises.</span>
        </div>
      )}

      {workoutPlan.trainerNotes ? (
        <div className="card client-trainer-notes">
          <span className="client-meta-label">Trainer Notes</span>
          <p>{workoutPlan.trainerNotes}</p>
        </div>
      ) : null}
    </section>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getSafeWorkoutDays(workoutPlan: WorkoutPlan): WorkoutDay[] {
  if (!Array.isArray(workoutPlan.days)) return [];

  return workoutPlan.days.map((rawDay, dayIndex) => {
    const day: Record<string, unknown> = isRecord(rawDay) ? rawDay : {};
    const rawExercises = day.exercises;
    const exercises = Array.isArray(rawExercises) ? rawExercises : [];

    return {
      id: getStringValue(day.id, `day-${dayIndex + 1}`),
      day: getStringValue(day.day, `Day ${dayIndex + 1}`),
      title: getStringValue(day.title, "Workout"),
      exercises: exercises.map((rawExercise, exerciseIndex): AssignedExercise => {
        const exercise = isRecord(rawExercise) ? rawExercise : {};

        return {
          id: getStringValue(exercise.id, `exercise-${dayIndex + 1}-${exerciseIndex + 1}`),
          exerciseId: getStringValue(exercise.exerciseId),
          name: getStringValue(exercise.name, "Exercise"),
          sets: getStringValue(exercise.sets),
          reps: getStringValue(exercise.reps),
          rest: getStringValue(exercise.rest),
          tempo: getStringValue(exercise.tempo),
          notes: getStringValue(exercise.notes),
        };
      }),
    };
  });
}

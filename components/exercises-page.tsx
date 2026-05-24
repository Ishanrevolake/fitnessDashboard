"use client";

import { CalendarDays, Dumbbell, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { fetchClientWorkoutPlan } from "@/lib/api-client";
import { hasTrainerAccess } from "@/lib/auth-store";
import { exerciseCategories, exerciseLibrary } from "@/lib/exercise-library";
import type { AssignedExercise, ExerciseCategory, WorkoutDay, WorkoutPlan } from "@/lib/types";

export function ExercisesPage() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | "">("");
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState("");
  const trainerAccess = user ? hasTrainerAccess(user.role) : false;

  const filteredExercises = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return exerciseLibrary.filter((exercise) => {
      const matchesSearch =
        !normalizedSearch ||
        [exercise.name, exercise.category, exercise.equipment].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesCategory = !category || exercise.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [category, search]);

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
      <PageHeader title="Exercise Library" subtitle={`${exerciseLibrary.length} exercises imported from Alpha Lee Fitness`} />

      <main className="main-content">
        <section className="search-section">
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
        </section>

        <section className="exercise-library-grid">
          {filteredExercises.map((exercise) => (
            <article className="card exercise-card" key={exercise.id}>
              <div className="exercise-card-icon">
                <Dumbbell size={18} />
              </div>
              <div>
                <h3>{exercise.name}</h3>
                <div className="exercise-tags">
                  <span>{exercise.category}</span>
                  <span>{exercise.equipment}</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </DashboardShell>
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

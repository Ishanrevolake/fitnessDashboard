export type ClientStatus = "active" | "inactive";

export type PackageId =
  | "rookie"
  | "intermediate"
  | "advanced"
  | "annual"
  | "one-month-1"
  | "one-month-2"
  | "training-plan";

export type PackageOption = {
  id: PackageId;
  label: string;
  durationDays: number;
};

export type ClientNote = {
  id: string;
  body: string;
  createdAt: string;
};

export type ClientMetrics = {
  weight: number[];
  sleep: number[];
  restingHeartRate: number[];
  steps: number[];
};

export type WorkoutPlan = {
  assignedProgramId: string;
  focus: string;
  startDate: string;
  weeklySchedule: string[];
  trainerNotes: string;
  days?: WorkoutDay[];
};

export type ExerciseCategory = "Chest" | "Back" | "Shoulders" | "Arms" | "Legs" | "Glutes" | "Core" | "Cardio" | "Mobility";

export type ExerciseLibraryItem = {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: string;
};

export type AssignedExercise = {
  id: string;
  exerciseId: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
  tempo: string;
  notes: string;
};

export type WorkoutDay = {
  id: string;
  day: string;
  title: string;
  exercises: AssignedExercise[];
};

export type MealLibraryItem = {
  id: string;
  name: string;
  category: string;
  items: string[];
  notes: string;
};

export type AssignedMeal = {
  id: string;
  mealId: string;
  name: string;
  mealTime: string;
  items: string[];
  notes: string;
};

export type MealPlanDay = {
  id: string;
  day: string;
  meals: AssignedMeal[];
};

export type ClientMealPlan = {
  focus: string;
  startDate: string;
  trainerNotes: string;
  days: MealPlanDay[];
};

export type FitnessClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  status: ClientStatus;
  packageId: PackageId;
  packageName?: string;
  daysLeft: number;
  goal: string;
  timezone: string;
  notes: ClientNote[];
  photos: string[];
  metrics: ClientMetrics;
  workoutPlan: WorkoutPlan;
  mealPlan?: ClientMealPlan;
};

export type NewClientInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  packageId: PackageId;
};

export type ProgramTemplate = {
  id: string;
  name: string;
  intensity: "Beginner" | "Intermediate" | "Advanced";
  durationWeeks: number;
  workoutsPerWeek: number;
  description: string;
};

export type MealPlanTemplate = {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
  theme: "red" | "blue" | "green" | "orange";
};

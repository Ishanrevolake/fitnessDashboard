import type { FitnessClient, MealPlanTemplate, PackageOption, ProgramTemplate } from "./types";

export const packageOptions: PackageOption[] = [
  { id: "rookie", label: "Rookie Bundle", durationDays: 30 },
  { id: "intermediate", label: "Intermediate Bundle", durationDays: 45 },
  { id: "advanced", label: "Advanced Bundle", durationDays: 60 },
  { id: "annual", label: "Annual Package", durationDays: 365 },
  { id: "one-month-1", label: "One Month Package 1", durationDays: 30 },
  { id: "one-month-2", label: "One Month Package 2", durationDays: 30 },
  { id: "training-plan", label: "Training Plan Only 6 Weeks", durationDays: 42 },
];

export const defaultMetrics = {
  weight: [75.2, 75, 74.8, 74.9, 74.6, 74.4],
  sleep: [7.2, 6.8, 7.5, 6.5, 7, 6.96],
  restingHeartRate: [70, 68, 69, 67, 66, 66],
  steps: [8500, 9200, 7800, 10500, 11000, 9650],
};

export const defaultWorkoutPlans = {
  fatLoss: {
    assignedProgramId: "12-week-transformation",
    focus: "Fat loss and strength consistency",
    startDate: "2026-05-06",
    weeklySchedule: ["Mon - Full Body Strength", "Wed - Conditioning", "Fri - Lower Body Strength"],
    trainerNotes: "Keep rest periods tight and track weekly average weight.",
    days: [
      {
        id: "fat-loss-mon",
        day: "Monday",
        title: "Full Body Strength",
        exercises: [
          { id: "fat-loss-mon-1", exerciseId: "dumbbell-squats", name: "Dumbbell squats", sets: "3", reps: "10-12", rest: "75s", tempo: "3-1-1", notes: "Stop two reps short of failure." },
          { id: "fat-loss-mon-2", exerciseId: "incline-dumbbell-bench-press", name: "Incline dumbbell bench press", sets: "3", reps: "8-10", rest: "90s", tempo: "2-1-1", notes: "Controlled lowering." },
        ],
      },
      {
        id: "fat-loss-wed",
        day: "Wednesday",
        title: "Conditioning",
        exercises: [
          { id: "fat-loss-wed-1", exerciseId: "jump-rope", name: "Jump rope", sets: "5", reps: "45s", rest: "45s", tempo: "", notes: "Keep pace conversational." },
          { id: "fat-loss-wed-2", exerciseId: "mountain-climbers", name: "Mountain climbers", sets: "4", reps: "30s", rest: "30s", tempo: "", notes: "Brace through the trunk." },
        ],
      },
    ],
  },
  strength: {
    assignedProgramId: "strength-foundations",
    focus: "Lower-body strength and recovery",
    startDate: "2026-05-06",
    weeklySchedule: ["Tue - Squat Pattern", "Thu - Upper Push/Pull", "Sat - Glutes and Posterior Chain"],
    trainerNotes: "Prioritize sleep and RPE notes after heavy lower-body sessions.",
    days: [
      {
        id: "strength-tue",
        day: "Tuesday",
        title: "Squat Pattern",
        exercises: [
          { id: "strength-tue-1", exerciseId: "barbell-back-squat", name: "Barbell back squat", sets: "4", reps: "5", rest: "2m", tempo: "3-1-1", notes: "Add load only if depth is consistent." },
          { id: "strength-tue-2", exerciseId: "leg-curls", name: "Leg curls", sets: "3", reps: "10-12", rest: "75s", tempo: "2-1-2", notes: "Pause in the shortened position." },
        ],
      },
    ],
  },
  reset: {
    assignedProgramId: "hypertrophy-engine",
    focus: "Habit rebuild and baseline conditioning",
    startDate: "2026-05-06",
    weeklySchedule: ["Mon - Upper Foundation", "Wed - Lower Foundation", "Fri - Zone 2 Conditioning"],
    trainerNotes: "Begin with conservative loads and rebuild training rhythm.",
    days: [
      {
        id: "reset-mon",
        day: "Monday",
        title: "Upper Foundation",
        exercises: [
          { id: "reset-mon-1", exerciseId: "machine-chest-press", name: "Machine chest press", sets: "3", reps: "10", rest: "90s", tempo: "2-1-1", notes: "Easy first week loading." },
          { id: "reset-mon-2", exerciseId: "seated-wide-grip-row", name: "Seated wide grip row", sets: "3", reps: "10", rest: "90s", tempo: "2-1-1", notes: "Keep ribs down." },
        ],
      },
    ],
  },
};

export const defaultClients: FitnessClient[] = [
  {
    id: "ben-andrew",
    name: "Ben Andrew",
    email: "ben@demo.com",
    phone: "+1 (555) 100-1000",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop",
    status: "active",
    packageId: "rookie",
    daysLeft: 14,
    goal: "Reduce body fat while improving strength consistency.",
    timezone: "America/Los_Angeles",
    profile: {
      gender: "Male",
      age: "32",
      height: "178 cm",
      weight: "75 kg",
      waist: "82 cm",
      activityLevel: "Intermediate",
      injuries: "No current injuries",
    },
    notes: [
      {
        id: "note-ben-travel",
        body: "Need program while traveling for 2 weeks.",
        createdAt: "Apr 8 - 11:58 AM",
      },
    ],
    photos: [
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop",
    ],
    metrics: defaultMetrics,
    workoutPlan: defaultWorkoutPlans.fatLoss,
  },
  {
    id: "jessica-smith",
    name: "Jessica Smith",
    email: "jessica@demo.com",
    phone: "+1 (555) 200-2000",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&h=160&fit=crop",
    status: "active",
    packageId: "advanced",
    daysLeft: 5,
    goal: "Build lower-body strength and improve recovery markers.",
    timezone: "America/New_York",
    profile: {
      gender: "Female",
      age: "29",
      height: "165 cm",
      weight: "62 kg",
      waist: "70 cm",
      activityLevel: "Advanced",
      injuries: "Previous ankle sprain",
    },
    notes: [
      {
        id: "note-jessica-lower",
        body: "Logged lower body power workout and requested form feedback.",
        createdAt: "Apr 12 - 9:40 AM",
      },
    ],
    photos: [
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400&h=400&fit=crop",
    ],
    metrics: defaultMetrics,
    workoutPlan: defaultWorkoutPlans.strength,
  },
  {
    id: "marcus-johnson",
    name: "Marcus Johnson",
    email: "marcus@demo.com",
    phone: "+1 (555) 300-3000",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop",
    status: "inactive",
    packageId: "one-month-1",
    daysLeft: 0,
    goal: "Restart habit tracking and rebuild baseline conditioning.",
    timezone: "Europe/London",
    profile: {
      gender: "Male",
      age: "41",
      height: "181 cm",
      weight: "88 kg",
      waist: "94 cm",
      activityLevel: "Beginner",
      injuries: "Lower back sensitivity",
    },
    notes: [
      {
        id: "note-marcus-renewal",
        body: "Package expired. Follow up about renewal options.",
        createdAt: "Apr 15 - 2:10 PM",
      },
    ],
    photos: [
      "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=400&fit=crop",
    ],
    metrics: defaultMetrics,
    workoutPlan: defaultWorkoutPlans.reset,
  },
];

export const programTemplates: ProgramTemplate[] = [
  {
    id: "12-week-transformation",
    name: "12-Week Transformation",
    intensity: "Advanced",
    durationWeeks: 12,
    workoutsPerWeek: 5,
    description: "A comprehensive program focused on body recomposition and strength building.",
  },
  {
    id: "strength-foundations",
    name: "Strength Foundations",
    intensity: "Beginner",
    durationWeeks: 8,
    workoutsPerWeek: 3,
    description: "Master the core lifts with a focus on technique and steady progression.",
  },
  {
    id: "hypertrophy-engine",
    name: "Hypertrophy Engine",
    intensity: "Intermediate",
    durationWeeks: 10,
    workoutsPerWeek: 4,
    description: "A balanced upper/lower split for muscle gain and repeatable weekly progression.",
  },
];

export const mealPlanTemplates: MealPlanTemplate[] = [
  {
    id: "lean-shred-2200",
    name: "Lean Shred 2200",
    category: "Fat Loss",
    calories: 2200,
    protein: 180,
    carbs: 150,
    fat: 70,
    description: "High protein, moderate carb strategy optimized for fat loss while preserving lean mass.",
    theme: "red",
  },
  {
    id: "mass-gainer-3500",
    name: "Mass Gainer 3500",
    category: "Muscle Gain",
    calories: 3500,
    protein: 200,
    carbs: 450,
    fat: 95,
    description: "Caloric surplus focused plan for hypertrophy, using complex carbs for training energy.",
    theme: "blue",
  },
  {
    id: "vegan-fuel-2500",
    name: "Vegan Fuel 2500",
    category: "Plant Based",
    calories: 2500,
    protein: 140,
    carbs: 320,
    fat: 80,
    description: "Complete plant-based protein profile with micronutrient density and performance in mind.",
    theme: "green",
  },
  {
    id: "keto-kickstart-2000",
    name: "Keto Kickstart 2000",
    category: "Keto",
    calories: 2000,
    protein: 120,
    carbs: 25,
    fat: 160,
    description: "Ketogenic template for metabolic flexibility and consistent energy without glucose spikes.",
    theme: "orange",
  },
];

export function getPackageLabel(packageId: string) {
  return packageOptions.find((option) => option.id === packageId)?.label ?? "Custom Package";
}

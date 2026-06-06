import { defaultClients, defaultWorkoutPlans, packageOptions } from "./mock-data";
import type { ClientMealPlan, FitnessClient, NewClientInput, PackageId, WorkoutPlan } from "./types";

const storageKey = "alphaFitnessClients";

function cloneClients() {
  return defaultClients.map((client) => ({
    ...client,
    notes: [...client.notes],
    photos: [...client.photos],
    metrics: { ...client.metrics },
    workoutPlan: cloneWorkoutPlan(client.workoutPlan),
    mealPlan: client.mealPlan ? cloneMealPlan(client.mealPlan) : undefined,
  }));
}

function cloneWorkoutPlan(workoutPlan: WorkoutPlan): WorkoutPlan {
  return {
    ...workoutPlan,
    weeklySchedule: [...workoutPlan.weeklySchedule],
    days: workoutPlan.days?.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => ({ ...exercise })),
    })),
  };
}

function cloneMealPlan(mealPlan: ClientMealPlan): ClientMealPlan {
  return {
    ...mealPlan,
    days: mealPlan.days.map((day) => ({
      ...day,
      meals: day.meals.map((meal) => ({ ...meal, items: [...meal.items] })),
    })),
  };
}

function getPlanDays(workoutPlan: WorkoutPlan) {
  if (workoutPlan.days?.length) return workoutPlan.days;

  return (workoutPlan.weeklySchedule ?? []).map((item, index) => {
    const [day = `Day ${index + 1}`, ...titleParts] = item.split(" - ");

    return {
      id: `day-${index + 1}`,
      day: day.trim(),
      title: titleParts.join(" - ").trim() || "Workout",
      exercises: [],
    };
  });
}

function normalizeClient(client: FitnessClient): FitnessClient {
  const fallbackPlan = cloneWorkoutPlan(defaultWorkoutPlans.fatLoss);
  const workoutPlan = client.workoutPlan
    ? {
        ...client.workoutPlan,
        weeklySchedule: client.workoutPlan.weeklySchedule ?? [],
      }
    : fallbackPlan;

  return {
    ...client,
    profile: client.profile ?? {},
    workoutPlan: {
      ...workoutPlan,
      days: getPlanDays(workoutPlan).map((day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => ({ ...exercise })),
      })),
    },
    mealPlan: client.mealPlan ? cloneMealPlan(client.mealPlan) : undefined,
  };
}

export function getStoredClients() {
  if (typeof window === "undefined") return cloneClients();

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      window.localStorage.setItem(storageKey, JSON.stringify(defaultClients));
      return cloneClients();
    }

    return (JSON.parse(stored) as FitnessClient[]).map(normalizeClient);
  } catch {
    return cloneClients();
  }
}

export function saveStoredClients(clients: FitnessClient[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(clients));
}

export function createClient(input: NewClientInput): FitnessClient {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const packageOption =
    packageOptions.find((option) => option.id === input.packageId) ??
    packageOptions.find((option) => option.id === "rookie");

  const name = `${firstName} ${lastName}`.trim();
  const id = `${firstName}-${lastName}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    id,
    name,
    email: input.email.trim(),
    phone: input.phone.trim(),
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E63946&color=fff`,
    status: "active",
    packageId: (packageOption?.id ?? "rookie") as PackageId,
    daysLeft: packageOption?.durationDays ?? 30,
    goal: "New client goal pending.",
    timezone: "Local Time",
    profile: {},
    notes: [],
    photos: [],
    metrics: defaultClients[0].metrics,
    workoutPlan: {
      assignedProgramId: "strength-foundations",
      focus: "Initial training plan pending trainer review.",
      startDate: new Date().toISOString().slice(0, 10),
      weeklySchedule: ["Mon - Assessment", "Wed - Full Body Strength", "Fri - Conditioning"],
      trainerNotes: "Review movement history before finalizing weekly volume.",
      days: [
        { id: "new-client-mon", day: "Monday", title: "Assessment", exercises: [] },
        { id: "new-client-wed", day: "Wednesday", title: "Full Body Strength", exercises: [] },
        { id: "new-client-fri", day: "Friday", title: "Conditioning", exercises: [] },
      ],
    },
    mealPlan: {
      focus: "Initial nutrition plan pending trainer review.",
      startDate: new Date().toISOString().slice(0, 10),
      trainerNotes: "",
      days: [],
    },
  };
}

export function addClient(input: NewClientInput) {
  const clients = getStoredClients();
  const newClient = createClient(input);
  const nextClients = [newClient, ...clients];
  saveStoredClients(nextClients);
  return { client: newClient, clients: nextClients };
}

export function addClientNote(clientId: string, body: string) {
  const clients = getStoredClients();
  const nextClients = clients.map((client) => {
    if (client.id !== clientId) return client;

    return {
      ...client,
      notes: [
        {
          id: `note-${Date.now()}`,
          body,
          createdAt: "Just now",
        },
        ...client.notes,
      ],
    };
  });

  saveStoredClients(nextClients);
  return nextClients;
}

export function updateClientWorkoutPlan(clientId: string, workoutPlan: WorkoutPlan) {
  const clients = getStoredClients();
  const nextClients = clients.map((client) => (client.id === clientId ? { ...client, workoutPlan } : client));

  saveStoredClients(nextClients);
  return nextClients;
}

export function updateClientMealPlan(clientId: string, mealPlan: ClientMealPlan) {
  const clients = getStoredClients();
  const nextClients = clients.map((client) => (client.id === clientId ? { ...client, mealPlan } : client));

  saveStoredClients(nextClients);
  return nextClients;
}

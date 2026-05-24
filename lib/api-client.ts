import type { ClientMealPlan, ClientNote, FitnessClient, NewClientInput, WorkoutPlan } from "./types";

export async function fetchClients(baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/clients`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to load clients");
  }

  return (await response.json()) as FitnessClient[];
}

export async function createClientViaApi(input: NewClientInput, baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Unable to create client");
  }

  return (await response.json()) as FitnessClient;
}

export async function updateClientWorkoutPlanViaApi(clientId: string, workoutPlan: WorkoutPlan, baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/clients/${clientId}/workout-plan`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(workoutPlan),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to save workout plan");
  }

  return (await response.json()) as WorkoutPlan;
}

export async function fetchClientWorkoutPlan(clientId: string, baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/clients/${clientId}/workout-plan`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to load workout plan");
  }

  return (await response.json()) as WorkoutPlan | null;
}

export async function fetchClientMealPlan(clientId: string, baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/clients/${clientId}/meal-plan`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to load meal plan");
  }

  return (await response.json()) as ClientMealPlan | null;
}

export async function updateClientMealPlanViaApi(clientId: string, mealPlan: ClientMealPlan, baseUrl = "", options?: { allowEmpty?: boolean }) {
  const query = options?.allowEmpty ? "?allowEmpty=1" : "";
  const response = await fetch(`${baseUrl}/api/clients/${clientId}/meal-plan${query}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(mealPlan),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to save meal plan");
  }

  return (await response.json()) as ClientMealPlan;
}

export async function fetchClientNotes(clientId: string, baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/clients/${clientId}/notes`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to load notes");
  }

  return (await response.json()) as ClientNote[];
}

export async function addClientNoteViaApi(clientId: string, body: string, baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/clients/${clientId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(responseBody?.message || "Unable to save note");
  }

  return (await response.json()) as ClientNote;
}

import type {
  BlogPost,
  BlogPostInput,
  AnalyticsEvent,
  ClientMealPlan,
  ClientNote,
  ExerciseLibraryItem,
  FitnessClient,
  NewClientInput,
  Testimonial,
  TestimonialInput,
  TestimonialStatus,
  WorkoutPlan,
} from "./types";
import { supabase } from "./supabase";

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

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

export async function fetchBlogPosts(baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/blog-posts`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to load blog posts");
  }

  return (await response.json()) as BlogPost[];
}

export async function createBlogPostViaApi(input: BlogPostInput, baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/blog-posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to create blog post");
  }

  return (await response.json()) as BlogPost;
}

export async function fetchAnalyticsEvents(baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/analytics-events`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to load analytics events");
  }

  return (await response.json()) as AnalyticsEvent[];
}

export async function fetchExercises(baseUrl = "") {
  const response = await fetch(`${baseUrl}/api/exercises`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to load exercises");
  }

  return (await response.json()) as ExerciseLibraryItem[];
}

export async function createExerciseViaApi(input: ExerciseLibraryItem, baseUrl = "") {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${baseUrl}/api/exercises`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to save exercise");
  }

  return (await response.json()) as ExerciseLibraryItem;
}

export async function updateExerciseViaApi(input: ExerciseLibraryItem, baseUrl = "") {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${baseUrl}/api/exercises`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to update exercise");
  }

  return (await response.json()) as ExerciseLibraryItem;
}

export async function fetchTestimonials(baseUrl = "") {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${baseUrl}/api/testimonials`, {
    headers: { Accept: "application/json", ...authHeaders },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to load testimonials");
  }

  return (await response.json()) as Testimonial[];
}

export async function createTestimonialViaApi(input: TestimonialInput, baseUrl = "") {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${baseUrl}/api/testimonials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to save testimonial");
  }

  return (await response.json()) as Testimonial;
}

export async function updateTestimonialStatusViaApi(id: string, status: TestimonialStatus, baseUrl = "") {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${baseUrl}/api/testimonials`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ id, status }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to update testimonial");
  }

  return (await response.json()) as Testimonial;
}

export async function updateTestimonialViaApi(id: string, input: TestimonialInput & { status?: TestimonialStatus }, baseUrl = "") {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${baseUrl}/api/testimonials`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ id, ...input }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to update testimonial");
  }

  return (await response.json()) as Testimonial;
}

export async function deleteTestimonialViaApi(id: string, baseUrl = "") {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${baseUrl}/api/testimonials?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...authHeaders,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || "Unable to delete testimonial");
  }

  return (await response.json()) as { id: string };
}

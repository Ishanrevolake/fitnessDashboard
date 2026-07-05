import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { exerciseCategories, exerciseLibrary } from "@/lib/exercise-library";
import type { ExerciseCategory, ExerciseLibraryItem } from "@/lib/types";
import type { UserRole } from "@/lib/auth-store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const EXERCISE_SELECT = "id,name,category,equipment,primary_muscles,secondary_muscles,level,created_at,updated_at";

type ExerciseRecord = {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: string;
  primary_muscles: string | null;
  secondary_muscles: string | null;
  level: string | null;
  created_at: string;
  updated_at: string;
};

type ExerciseInput = Partial<ExerciseLibraryItem>;

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeRole(value: unknown): UserRole {
  if (value === "admin" || value === "trainer" || value === "client") return value;
  if (value === "user" || value === "normal") return "client";
  return "client";
}

function hasTrainerRole(role: UserRole) {
  return role === "admin" || role === "trainer";
}

async function getDashboardUser(supabase: SupabaseClient, request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  const role = normalizeRole(user.app_metadata?.role ?? user.app_metadata?.user_role ?? user.user_metadata?.role ?? user.user_metadata?.user_role);

  return {
    id: user.id,
    role,
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
}

function getDefaultExerciseMeta(exercise: { name: string; category: ExerciseCategory }) {
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
  const level = /(basic|push ups|plank|calf|cable|machine|walkout)/.test(value) ? "Beginner" : "Intermediate";

  return {
    primary: primaryByCategory[exercise.category],
    secondary: secondaryByCategory[exercise.category],
    level,
  };
}

function mapRecordToExercise(record: ExerciseRecord): ExerciseLibraryItem {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    equipment: record.equipment,
    primary: record.primary_muscles ?? "",
    secondary: record.secondary_muscles ?? "",
    level: record.level ?? "Intermediate",
  };
}

function formatExercisesDatabaseError(error: { message?: string; code?: string }) {
  const message = error.message || "Unable to access exercises.";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("exercises") &&
    (lowerMessage.includes("schema cache") || lowerMessage.includes("does not exist") || lowerMessage.includes("could not find"))
  ) {
    return "The exercises table is missing in Supabase. Run supabase-exercises.sql in the Supabase SQL editor, then try again.";
  }

  if (error.code === "23505" || lowerMessage.includes("duplicate key")) {
    return "An exercise with this id already exists.";
  }

  return message;
}

function normalizeExerciseInput(body: ExerciseInput) {
  const name = body.name?.trim() ?? "";
  const category = exerciseCategories.includes(body.category as ExerciseCategory) ? (body.category as ExerciseCategory) : "Chest";
  const defaults = getDefaultExerciseMeta({ name, category });
  const level = body.level === "Beginner" || body.level === "Advanced" || body.level === "Intermediate" ? body.level : defaults.level;

  return {
    id: body.id?.trim() || slugify(name),
    name,
    category,
    equipment: body.equipment?.trim() ?? "",
    primary: body.primary?.trim() || defaults.primary,
    secondary: body.secondary?.trim() || defaults.secondary,
    level,
  };
}

async function seedExercisesIfEmpty(supabase: SupabaseClient) {
  const { count, error: countError } = await supabase.from("exercises").select("id", { count: "exact", head: true });

  if (countError || count !== 0) return countError;

  const now = new Date().toISOString();
  const records = exerciseLibrary.map((exercise) => {
    const meta = getDefaultExerciseMeta(exercise);

    return {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      equipment: exercise.equipment,
      primary_muscles: meta.primary,
      secondary_muscles: meta.secondary,
      level: meta.level,
      updated_at: now,
    };
  });

  const { error } = await supabase.from("exercises").upsert(records, { onConflict: "id" });
  return error;
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const seedError = await seedExercisesIfEmpty(supabase);

  if (seedError) {
    return Response.json({ message: formatExercisesDatabaseError(seedError) }, { status: 500 });
  }

  const { data, error } = await supabase.from("exercises").select(EXERCISE_SELECT).order("name", { ascending: true });

  if (error) {
    return Response.json({ message: formatExercisesDatabaseError(error) }, { status: 500 });
  }

  return Response.json(((data ?? []) as ExerciseRecord[]).map(mapRecordToExercise));
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const dashboardUser = await getDashboardUser(supabase, request);

  if (!dashboardUser || !hasTrainerRole(dashboardUser.role)) {
    return Response.json({ message: "Trainer access is required to add exercises." }, { status: 403 });
  }

  const exercise = normalizeExerciseInput((await request.json()) as ExerciseInput);

  if (!exercise.id || !exercise.name || !exercise.equipment) {
    return Response.json({ message: "Exercise name and equipment are required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      equipment: exercise.equipment,
      primary_muscles: exercise.primary,
      secondary_muscles: exercise.secondary,
      level: exercise.level,
      updated_at: now,
    })
    .select(EXERCISE_SELECT)
    .single();

  if (error) {
    return Response.json({ message: formatExercisesDatabaseError(error) }, { status: 500 });
  }

  return Response.json(mapRecordToExercise(data as ExerciseRecord), { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const dashboardUser = await getDashboardUser(supabase, request);

  if (!dashboardUser || !hasTrainerRole(dashboardUser.role)) {
    return Response.json({ message: "Trainer access is required to edit exercises." }, { status: 403 });
  }

  const exercise = normalizeExerciseInput((await request.json()) as ExerciseInput);

  if (!exercise.id || !exercise.name || !exercise.equipment) {
    return Response.json({ message: "Exercise name and equipment are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("exercises")
    .update({
      name: exercise.name,
      category: exercise.category,
      equipment: exercise.equipment,
      primary_muscles: exercise.primary,
      secondary_muscles: exercise.secondary,
      level: exercise.level,
      updated_at: new Date().toISOString(),
    })
    .eq("id", exercise.id)
    .select(EXERCISE_SELECT)
    .single();

  if (error) {
    return Response.json({ message: formatExercisesDatabaseError(error) }, { status: 500 });
  }

  return Response.json(mapRecordToExercise(data as ExerciseRecord));
}

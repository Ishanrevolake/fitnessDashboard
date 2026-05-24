import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { WorkoutPlan } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

type WorkoutPlanRouteProps = {
  params: Promise<{
    clientId: string;
  }>;
};

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeWorkoutPlan(body: Partial<WorkoutPlan>): WorkoutPlan {
  return {
    assignedProgramId: body.assignedProgramId || "custom-workout-plan",
    focus: body.focus?.trim() || "Custom workout plan",
    startDate: new Date().toISOString().slice(0, 10),
    weeklySchedule: body.weeklySchedule ?? [],
    trainerNotes: body.trainerNotes?.trim() ?? "",
    days: body.days ?? [],
  };
}

function mapRecordToWorkoutPlan(record: {
  assigned_program_id?: string;
  focus?: string;
  start_date?: string;
  weekly_schedule?: string[];
  trainer_notes?: string;
  days?: WorkoutPlan["days"];
}): WorkoutPlan {
  return {
    assignedProgramId: record.assigned_program_id || "custom-workout-plan",
    focus: record.focus || "Custom workout plan",
    startDate: record.start_date || new Date().toISOString().slice(0, 10),
    weeklySchedule: record.weekly_schedule ?? [],
    trainerNotes: record.trainer_notes ?? "",
    days: record.days ?? [],
  };
}

export async function GET(_request: Request, { params }: WorkoutPlanRouteProps) {
  const { clientId } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json(
      {
        message:
          "Missing Supabase service role key. Add SUPABASE_SERVICE_ROLE_KEY to .env.local before loading workout plans.",
      },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("client_workout_plans")
    .select("assigned_program_id,focus,start_date,weekly_schedule,trainer_notes,days")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    return Response.json({ message: error.message || "Unable to load workout plan." }, { status: 500 });
  }

  return Response.json(data ? mapRecordToWorkoutPlan(data) : null);
}

export async function PUT(request: Request, { params }: WorkoutPlanRouteProps) {
  const { clientId } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json(
      {
        message:
          "Missing Supabase service role key. Add SUPABASE_SERVICE_ROLE_KEY to .env.local before saving workout plans.",
      },
      { status: 500 },
    );
  }

  const workoutPlan = normalizeWorkoutPlan((await request.json()) as Partial<WorkoutPlan>);

  const { error } = await supabase.from("client_workout_plans").upsert(
    {
      client_id: clientId,
      assigned_program_id: workoutPlan.assignedProgramId,
      focus: workoutPlan.focus,
      start_date: workoutPlan.startDate,
      weekly_schedule: workoutPlan.weeklySchedule,
      trainer_notes: workoutPlan.trainerNotes,
      days: workoutPlan.days,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );

  if (error) {
    return Response.json({ message: error.message || "Unable to save workout plan." }, { status: 500 });
  }

  return Response.json(workoutPlan);
}

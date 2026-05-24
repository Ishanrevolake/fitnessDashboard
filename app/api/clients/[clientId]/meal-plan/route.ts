import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { ClientMealPlan } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

type MealPlanRouteProps = {
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

function normalizeMealPlan(body: Partial<ClientMealPlan>): ClientMealPlan {
  return {
    focus: body.focus?.trim() || "Custom nutrition plan",
    startDate: new Date().toISOString().slice(0, 10),
    trainerNotes: body.trainerNotes?.trim() ?? "",
    days: body.days ?? [],
  };
}

function mapRecordToMealPlan(record: {
  focus?: string;
  start_date?: string;
  trainer_notes?: string;
  days?: ClientMealPlan["days"];
}): ClientMealPlan {
  return {
    focus: record.focus || "Custom nutrition plan",
    startDate: record.start_date || new Date().toISOString().slice(0, 10),
    trainerNotes: record.trainer_notes ?? "",
    days: record.days ?? [],
  };
}

function formatMealPlanDatabaseError(error: { message?: string }) {
  const message = error.message || "Unable to access meal plans.";

  if (message.toLowerCase().includes("client_meal_plans") && message.toLowerCase().includes("schema cache")) {
    return "The client_meal_plans table is missing in Supabase. Run supabase-client-meal-plans.sql, or the meal-plan section in supabase-client-workout-plans.sql, then try again.";
  }

  return message;
}

export async function GET(_request: Request, { params }: MealPlanRouteProps) {
  const { clientId } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json(
      {
        message: "Missing Supabase service role key. Add SUPABASE_SERVICE_ROLE_KEY to .env.local before loading meal plans.",
      },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("client_meal_plans")
    .select("focus,start_date,trainer_notes,days")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    return Response.json({ message: formatMealPlanDatabaseError(error) }, { status: 500 });
  }

  return Response.json(data ? mapRecordToMealPlan(data) : null);
}

export async function PUT(request: Request, { params }: MealPlanRouteProps) {
  const { clientId } = await params;
  const allowEmpty = new URL(request.url).searchParams.get("allowEmpty") === "1";
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json(
      {
        message: "Missing Supabase service role key. Add SUPABASE_SERVICE_ROLE_KEY to .env.local before saving meal plans.",
      },
      { status: 500 },
    );
  }

  const mealPlan = normalizeMealPlan((await request.json()) as Partial<ClientMealPlan>);

  if (!allowEmpty && !mealPlan.days.some((day) => Array.isArray(day.meals) && day.meals.length > 0)) {
    return Response.json({ message: "Add at least one meal before saving the meal plan." }, { status: 400 });
  }

  const { error } = await supabase.from("client_meal_plans").upsert(
    {
      client_id: clientId,
      focus: mealPlan.focus,
      start_date: mealPlan.startDate,
      trainer_notes: mealPlan.trainerNotes,
      days: mealPlan.days,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );

  if (error) {
    return Response.json({ message: formatMealPlanDatabaseError(error) }, { status: 500 });
  }

  return Response.json(mealPlan);
}

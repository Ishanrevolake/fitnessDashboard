import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function formatAnalyticsDatabaseError(error: { message?: string }) {
  const message = error.message || "Unable to access analytics events.";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("analytics_events") &&
    (lowerMessage.includes("schema cache") || lowerMessage.includes("does not exist") || lowerMessage.includes("could not find"))
  ) {
    return "The analytics_events table is missing in Supabase.";
  }

  return message;
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const { data, error } = await supabase.from("analytics_events").select("*").limit(1000);

  if (error) {
    return Response.json({ message: formatAnalyticsDatabaseError(error) }, { status: 500 });
  }

  return Response.json(data ?? []);
}

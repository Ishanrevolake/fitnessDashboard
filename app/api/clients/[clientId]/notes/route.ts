import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { ClientNote } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

type NotesRouteProps = {
  params: Promise<{
    clientId: string;
  }>;
};

type ClientNoteRecord = {
  id: string;
  body: string;
  created_at: string;
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

function formatNote(record: ClientNoteRecord): ClientNote {
  return {
    id: record.id,
    body: record.body,
    createdAt: new Date(record.created_at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function formatNotesDatabaseError(error: { message?: string }) {
  const message = error.message || "Unable to access client notes.";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("client_notes") &&
    (lowerMessage.includes("schema cache") || lowerMessage.includes("does not exist") || lowerMessage.includes("could not find"))
  ) {
    return "The client_notes table is missing in Supabase. Run supabase-client-notes.sql or the updated supabase-client-workout-plans.sql in the Supabase SQL editor, then try again.";
  }

  return message;
}

export async function GET(_request: Request, { params }: NotesRouteProps) {
  const { clientId } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("client_notes")
    .select("id,body,created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ message: formatNotesDatabaseError(error) }, { status: 500 });
  }

  return Response.json(((data ?? []) as ClientNoteRecord[]).map(formatNote));
}

export async function POST(request: Request, { params }: NotesRouteProps) {
  const { clientId } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const body = (await request.json()) as { body?: string };
  const noteBody = body.body?.trim();

  if (!noteBody) {
    return Response.json({ message: "Note body is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("client_notes")
    .insert({ client_id: clientId, body: noteBody })
    .select("id,body,created_at")
    .single();

  if (error) {
    return Response.json({ message: formatNotesDatabaseError(error) }, { status: 500 });
  }

  return Response.json(formatNote(data as ClientNoteRecord), { status: 201 });
}

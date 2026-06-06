import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Testimonial, TestimonialInput, TestimonialStatus } from "@/lib/types";
import type { UserRole } from "@/lib/auth-store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

type TestimonialRecord = {
  id: string;
  client_id: string;
  name: string;
  text: string;
  category: string | null;
  rating: number;
  status: TestimonialStatus;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
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

function mapRecordToTestimonial(record: TestimonialRecord): Testimonial {
  return {
    id: record.id,
    clientId: record.client_id,
    name: record.name,
    text: record.text,
    category: record.category || "Fat Loss",
    rating: record.rating,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    approvedAt: record.approved_at,
  };
}

function formatTestimonialsDatabaseError(error: { message?: string; code?: string }) {
  const message = error.message || "Unable to access testimonials.";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("category") && lowerMessage.includes("does not exist")) {
    return "The testimonials category column is missing in Supabase. Run the latest supabase-testimonials.sql in the Supabase SQL editor, then try again.";
  }

  if (
    lowerMessage.includes("testimonials") &&
    (lowerMessage.includes("schema cache") || lowerMessage.includes("does not exist") || lowerMessage.includes("could not find"))
  ) {
    return "The testimonials table is missing in Supabase. Run supabase-testimonials.sql in the Supabase SQL editor, then try again.";
  }

  return message;
}

function normalizeTestimonialInput(body: Partial<TestimonialInput>) {
  return {
    clientId: body.clientId?.trim() ?? "",
    name: body.name?.trim() ?? "",
    text: body.text?.trim() ?? "",
    category: body.category?.trim() || "Fat Loss",
    rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
  };
}

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const dashboardUser = await getDashboardUser(supabase, request);

  if (!dashboardUser || !hasTrainerRole(dashboardUser.role)) {
    return Response.json({ message: "Trainer access is required to review testimonials." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("testimonials")
    .select("id,client_id,name,text,category,rating,status,created_at,updated_at,approved_at")
    .order("status", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ message: formatTestimonialsDatabaseError(error) }, { status: 500 });
  }

  return Response.json(((data ?? []) as TestimonialRecord[]).map(mapRecordToTestimonial));
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const dashboardUser = await getDashboardUser(supabase, request);

  if (!dashboardUser) {
    return Response.json({ message: "Sign in before submitting a testimonial." }, { status: 401 });
  }

  const testimonial = normalizeTestimonialInput((await request.json()) as Partial<TestimonialInput>);

  if (!testimonial.clientId || !testimonial.name || !testimonial.text) {
    return Response.json({ message: "Name, testimonial text, and client id are required." }, { status: 400 });
  }

  if (testimonial.clientId !== dashboardUser.id) {
    return Response.json({ message: "You can only submit testimonials from your own account." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      client_id: testimonial.clientId,
      name: testimonial.name,
      text: testimonial.text,
      category: testimonial.category,
      rating: testimonial.rating,
      status: "pending",
      updated_at: now,
    })
    .select("id,client_id,name,text,category,rating,status,created_at,updated_at,approved_at")
    .single();

  if (error) {
    return Response.json({ message: formatTestimonialsDatabaseError(error) }, { status: 500 });
  }

  return Response.json(mapRecordToTestimonial(data as TestimonialRecord), { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const dashboardUser = await getDashboardUser(supabase, request);

  if (!dashboardUser || !hasTrainerRole(dashboardUser.role)) {
    return Response.json({ message: "Trainer access is required to approve testimonials." }, { status: 403 });
  }

  const body = (await request.json()) as { id?: string; status?: TestimonialStatus };
  const id = body.id?.trim() ?? "";
  const status = body.status === "approved" ? "approved" : body.status === "pending" ? "pending" : null;

  if (!id || !status) {
    return Response.json({ message: "A valid testimonial id and status are required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("testimonials")
    .update({
      status,
      updated_at: now,
      approved_at: status === "approved" ? now : null,
    })
    .eq("id", id)
    .select("id,client_id,name,text,category,rating,status,created_at,updated_at,approved_at")
    .single();

  if (error) {
    return Response.json({ message: formatTestimonialsDatabaseError(error) }, { status: 500 });
  }

  return Response.json(mapRecordToTestimonial(data as TestimonialRecord));
}

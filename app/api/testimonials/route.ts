import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Testimonial, TestimonialInput, TestimonialStatus } from "@/lib/types";
import type { UserRole } from "@/lib/auth-store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const MAX_TESTIMONIAL_IMAGE_BYTES = 2 * 1024 * 1024;
const TESTIMONIAL_SELECT = "id,client_id,name,text,category,rating,image_url,image_size_bytes,instagram_url,status,created_at,updated_at,approved_at";

type TestimonialRecord = {
  id: string;
  client_id: string;
  name: string;
  text: string;
  category: string | null;
  rating: number;
  image_url: string | null;
  image_size_bytes: number | null;
  instagram_url: string | null;
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
    imageUrl: record.image_url,
    imageSizeBytes: record.image_size_bytes ?? 0,
    instagramUrl: record.instagram_url,
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
    (lowerMessage.includes("image_url") || lowerMessage.includes("image_size_bytes") || lowerMessage.includes("instagram_url")) &&
    (lowerMessage.includes("does not exist") || lowerMessage.includes("schema cache") || lowerMessage.includes("could not find"))
  ) {
    return "The testimonials image or Instagram columns are missing in Supabase. Run the latest supabase-testimonials.sql in the Supabase SQL editor, then try again.";
  }

  if (
    lowerMessage.includes("testimonials") &&
    (lowerMessage.includes("schema cache") || lowerMessage.includes("does not exist") || lowerMessage.includes("could not find"))
  ) {
    return "The testimonials table is missing in Supabase. Run supabase-testimonials.sql in the Supabase SQL editor, then try again.";
  }

  return message;
}

function normalizeInstagramUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("@")) {
    const username = trimmed.slice(1).replace(/[^a-zA-Z0-9._]/g, "");
    return username ? `https://www.instagram.com/${username}` : "";
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname !== "instagram.com") return "";

    url.protocol = "https:";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeTestimonialInput(body: Partial<TestimonialInput>) {
  const imageUrl = body.imageUrl?.trim() ?? "";
  const imageSizeBytes = Number(body.imageSizeBytes) || 0;
  const instagramUrl = normalizeInstagramUrl(body.instagramUrl ?? "");

  return {
    clientId: body.clientId?.trim() ?? "",
    name: body.name?.trim() ?? "",
    text: body.text?.trim() ?? "",
    category: body.category?.trim() || "Fat Loss",
    rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
    imageUrl,
    imageSizeBytes: imageUrl ? imageSizeBytes : 0,
    instagramUrl,
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
    .select(TESTIMONIAL_SELECT)
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

  const body = (await request.json()) as Partial<TestimonialInput>;
  const testimonial = normalizeTestimonialInput(body);

  if (!testimonial.clientId || !testimonial.name || !testimonial.text) {
    return Response.json({ message: "Name, testimonial text, and client id are required." }, { status: 400 });
  }

  if (testimonial.imageUrl && !testimonial.imageUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,/i)) {
    return Response.json({ message: "Upload a JPG, PNG, or WebP testimonial image." }, { status: 400 });
  }

  if (testimonial.imageSizeBytes > MAX_TESTIMONIAL_IMAGE_BYTES) {
    return Response.json({ message: "Testimonial image must be 2 MB or smaller." }, { status: 400 });
  }

  if (body.instagramUrl && !testimonial.instagramUrl) {
    return Response.json({ message: "Enter a valid Instagram profile link." }, { status: 400 });
  }

  const trainerUser = hasTrainerRole(dashboardUser.role);

  if (!trainerUser && testimonial.clientId !== dashboardUser.id) {
    return Response.json({ message: "You can only submit testimonials from your own account." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const status = trainerUser ? "approved" : "pending";
  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      client_id: testimonial.clientId,
      name: testimonial.name,
      text: testimonial.text,
      category: testimonial.category,
      rating: testimonial.rating,
      image_url: testimonial.imageUrl || null,
      image_size_bytes: testimonial.imageSizeBytes,
      instagram_url: testimonial.instagramUrl || null,
      status,
      updated_at: now,
      approved_at: status === "approved" ? now : null,
    })
    .select(TESTIMONIAL_SELECT)
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

  const body = (await request.json()) as Partial<TestimonialInput> & { id?: string; status?: TestimonialStatus };
  const id = body.id?.trim() ?? "";
  const status = body.status === "approved" ? "approved" : body.status === "pending" ? "pending" : null;

  if (!id) {
    return Response.json({ message: "A valid testimonial id is required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updates: Record<string, string | number | null> = {
    updated_at: now,
  };

  if (status) {
    updates.status = status;
    updates.approved_at = status === "approved" ? now : null;
  }

  if (body.name !== undefined || body.text !== undefined || body.clientId !== undefined || body.category !== undefined || body.rating !== undefined || body.imageUrl !== undefined || body.instagramUrl !== undefined) {
    const testimonial = normalizeTestimonialInput(body);

    if (!testimonial.clientId || !testimonial.name || !testimonial.text) {
      return Response.json({ message: "Name, testimonial text, and client id are required." }, { status: 400 });
    }

    if (testimonial.imageUrl && !testimonial.imageUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,/i)) {
      return Response.json({ message: "Upload a JPG, PNG, or WebP testimonial image." }, { status: 400 });
    }

    if (testimonial.imageSizeBytes > MAX_TESTIMONIAL_IMAGE_BYTES) {
      return Response.json({ message: "Testimonial image must be 2 MB or smaller." }, { status: 400 });
    }

    if (body.instagramUrl && !testimonial.instagramUrl) {
      return Response.json({ message: "Enter a valid Instagram profile link." }, { status: 400 });
    }

    updates.client_id = testimonial.clientId;
    updates.name = testimonial.name;
    updates.text = testimonial.text;
    updates.category = testimonial.category;
    updates.rating = testimonial.rating;
    updates.image_url = testimonial.imageUrl || null;
    updates.image_size_bytes = testimonial.imageSizeBytes;
    updates.instagram_url = testimonial.instagramUrl || null;
  }

  const { data, error } = await supabase
    .from("testimonials")
    .update(updates)
    .eq("id", id)
    .select(TESTIMONIAL_SELECT)
    .single();

  if (error) {
    return Response.json({ message: formatTestimonialsDatabaseError(error) }, { status: 500 });
  }

  return Response.json(mapRecordToTestimonial(data as TestimonialRecord));
}

export async function DELETE(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const dashboardUser = await getDashboardUser(supabase, request);

  if (!dashboardUser || !hasTrainerRole(dashboardUser.role)) {
    return Response.json({ message: "Trainer access is required to delete testimonials." }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";

  if (!id) {
    return Response.json({ message: "A valid testimonial id is required." }, { status: 400 });
  }

  const { error } = await supabase.from("testimonials").delete().eq("id", id);

  if (error) {
    return Response.json({ message: formatTestimonialsDatabaseError(error) }, { status: 500 });
  }

  return Response.json({ id });
}

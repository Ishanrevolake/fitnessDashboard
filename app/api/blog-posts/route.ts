import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { BlogPost, BlogPostInput, BlogPostStatus } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

type BlogPostRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: BlogPostStatus;
  category: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function mapRecordToBlogPost(record: BlogPostRecord): BlogPost {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    excerpt: record.excerpt ?? "",
    content: record.content,
    status: record.status,
    category: record.category ?? "",
    coverImageUrl: record.cover_image_url ?? "",
    publishedAt: record.published_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function formatBlogPostsDatabaseError(error: { message?: string; code?: string }) {
  const message = error.message || "Unable to access blog posts.";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("blog_posts") &&
    (lowerMessage.includes("schema cache") || lowerMessage.includes("does not exist") || lowerMessage.includes("could not find"))
  ) {
    return "The blog_posts table is missing in Supabase. Run supabase-blog-posts.sql in the Supabase SQL editor, then try again.";
  }

  if (error.code === "23505" || lowerMessage.includes("duplicate key")) {
    return "A blog post with this slug already exists. Use a different slug.";
  }

  return message;
}

function normalizeBlogPostInput(body: Partial<BlogPostInput>) {
  const title = body.title?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  const status = body.status === "published" ? "published" : "draft";

  return {
    title,
    slug: slugify(body.slug?.trim() || title),
    excerpt: body.excerpt?.trim() ?? "",
    content,
    status,
    category: body.category?.trim() || "Education",
    coverImageUrl: body.coverImageUrl?.trim() ?? "",
  };
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .select("id,title,slug,excerpt,content,status,category,cover_image_url,published_at,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return Response.json({ message: formatBlogPostsDatabaseError(error) }, { status: 500 });
  }

  return Response.json(((data ?? []) as BlogPostRecord[]).map(mapRecordToBlogPost));
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return Response.json({ message: "Missing Supabase service role key." }, { status: 500 });
  }

  const post = normalizeBlogPostInput((await request.json()) as Partial<BlogPostInput>);

  if (!post.title || !post.slug || !post.excerpt || !post.content) {
    return Response.json({ message: "Title, excerpt, and content are required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      status: post.status,
      category: post.category,
      cover_image_url: post.coverImageUrl || null,
      published_at: post.status === "published" ? now : null,
      updated_at: now,
    })
    .select("id,title,slug,excerpt,content,status,category,cover_image_url,published_at,created_at,updated_at")
    .single();

  if (error) {
    return Response.json({ message: formatBlogPostsDatabaseError(error) }, { status: 500 });
  }

  return Response.json(mapRecordToBlogPost(data as BlogPostRecord), { status: 201 });
}

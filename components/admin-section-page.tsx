"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Dumbbell,
  Edit3,
  Eye,
  FileText,
  ImagePlus,
  AtSign,
  MessageCircle,
  PlaySquare,
  Plus,
  Salad,
  Send,
  Star,
  Trash2,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { TabNavigation } from "@/components/tab-navigation";
import { useAuth } from "@/components/auth-provider";
import {
  fetchAnalyticsEvents,
  createBlogPostViaApi,
  createTestimonialViaApi,
  deleteTestimonialViaApi,
  fetchBlogPosts,
  fetchClients,
  fetchTestimonials,
  updateTestimonialStatusViaApi,
  updateTestimonialViaApi,
} from "@/lib/api-client";
import { hasTrainerAccess, type AuthUser } from "@/lib/auth-store";
import { normalizeClientMealPlan } from "@/lib/meal-plan-utils";
import type { AnalyticsEvent, BlogPost, BlogPostInput, BlogPostStatus, FitnessClient, Testimonial, TestimonialInput } from "@/lib/types";

type SectionKind = "analytics" | "leads" | "blog" | "testimonials" | "recipes" | "social" | "notifications";

type StatItem = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
};

type TableItem = {
  name: string;
  detail: string;
  status: string;
  meta: string;
};

const testimonialCategoryOptions = ["Fat Loss", "Muscle Gain", "Strength", "Conditioning", "Lifestyle"];
const testimonialImageMaxBytes = 2 * 1024 * 1024;
const testimonialImageAccept = "image/jpeg,image/png,image/webp";

const sectionConfig: Record<
  SectionKind,
  {
    title: string;
    subtitle: string;
    tab: string;
    action: string;
    icon: LucideIcon;
    stats: StatItem[];
    primaryTitle: string;
    secondaryTitle: string;
    items: TableItem[];
  }
> = {
  analytics: {
    title: "Analytics",
    subtitle: "Track lead generation, client growth, and programme performance.",
    tab: "May 2026",
    action: "Export report",
    icon: BarChart3,
    primaryTitle: "Client growth",
    secondaryTitle: "Revenue by programme",
    stats: [
      { label: "Website visits", value: "2,840", note: "+18% vs Apr", icon: Eye },
      { label: "Form submissions", value: "23", note: "+6 this month", icon: FileText },
      { label: "Conversion rate", value: "48%", note: "+4 points", icon: TrendingUp },
      { label: "Avg client value", value: "Rs 62k", note: "+8% vs Apr", icon: Users },
    ],
    items: [
      { name: "Weight loss programme", detail: "8-week cut and habit coaching", status: "Rs 96k", meta: "Top performer" },
      { name: "Muscle gain programme", detail: "12-week build plan", status: "Rs 80k", meta: "High retention" },
      { name: "Online Pro", detail: "Remote training and nutrition", status: "Rs 62k", meta: "Growing" },
    ],
  },
  leads: {
    title: "Leads",
    subtitle: "Review new enquiries and keep the WhatsApp follow-up queue moving.",
    tab: "Lead Pipeline",
    action: "Add lead",
    icon: MessageCircle,
    primaryTitle: "New enquiries",
    secondaryTitle: "Follow-up priorities",
    stats: [
      { label: "Open leads", value: "23", note: "5 need reply", icon: Users },
      { label: "New today", value: "4", note: "2 from Instagram", icon: Plus },
      { label: "Booked calls", value: "7", note: "This week", icon: CheckCircle2 },
      { label: "Lead to client", value: "48%", note: "+4 points", icon: TrendingUp },
    ],
    items: [
      { name: "Asha Senanayake", detail: "Weight loss - Colombo", status: "New", meta: "2 hours ago" },
      { name: "Dinesh Gunaratne", detail: "Muscle gain - Kandy", status: "Contacted", meta: "5 hours ago" },
      { name: "Nadeesha Perera", detail: "Nutrition coaching - Dubai", status: "Call booked", meta: "Tomorrow" },
    ],
  },
  blog: {
    title: "Blog",
    subtitle: "Create and manage education content for Alpha Lee Fitness.",
    tab: "Posts",
    action: "New post",
    icon: Edit3,
    primaryTitle: "Editorial queue",
    secondaryTitle: "SEO focus",
    stats: [
      { label: "Published posts", value: "18", note: "3 this month", icon: FileText },
      { label: "Drafts", value: "5", note: "2 ready to review", icon: Edit3 },
      { label: "Monthly reads", value: "6.2k", note: "+22%", icon: Eye },
      { label: "Lead assists", value: "11", note: "From posts", icon: TrendingUp },
    ],
    items: [
      { name: "How to Start a Sustainable Fat Loss Phase", detail: "Education - Fat loss", status: "Draft", meta: "Needs image" },
      { name: "Protein Guide for Sri Lankan Meals", detail: "Nutrition - Local foods", status: "Published", meta: "Top traffic" },
      { name: "Training While Travelling", detail: "Lifestyle - Consistency", status: "Review", meta: "SEO ready" },
    ],
  },
  testimonials: {
    title: "Testimonials",
    subtitle: "Approve transformation stories and keep client proof organized.",
    tab: "Reviews",
    action: "Request testimonial",
    icon: Star,
    primaryTitle: "Pending approvals",
    secondaryTitle: "Featured stories",
    stats: [
      { label: "Published", value: "34", note: "8 featured", icon: Star },
      { label: "Pending", value: "4", note: "Need review", icon: CheckCircle2 },
      { label: "Avg rating", value: "4.9", note: "Last 90 days", icon: TrendingUp },
      { label: "Requests sent", value: "12", note: "This month", icon: Send },
    ],
    items: [
      { name: "Nimal Kumara", detail: "12-week transformation", status: "Pending", meta: "Submitted 2 days ago" },
      { name: "Priya Fernando", detail: "8-week weight loss goal", status: "Featured", meta: "Before/after ready" },
      { name: "Malsha Gunasekara", detail: "Online coaching", status: "Published", meta: "Homepage" },
    ],
  },
  recipes: {
    title: "Recipe Book",
    subtitle: "Maintain downloadable recipes and nutrition resources.",
    tab: "Recipes",
    action: "Add recipe",
    icon: Salad,
    primaryTitle: "Recipe library",
    secondaryTitle: "Download performance",
    stats: [
      { label: "Recipes", value: "137", note: "12 categories", icon: Salad },
      { label: "Downloads", value: "1,240", note: "+17% this month", icon: TrendingUp },
      { label: "Lead captures", value: "42", note: "From downloads", icon: Users },
      { label: "Needs update", value: "6", note: "Old macros", icon: FileText },
    ],
    items: [
      { name: "High Protein Sri Lankan Breakfasts", detail: "Breakfast - 12 recipes", status: "Live", meta: "312 downloads" },
      { name: "Lean Dinner Pack", detail: "Dinner - Fat loss", status: "Review", meta: "Update macros" },
      { name: "Muscle Gain Rice Bowls", detail: "Bulking - Local foods", status: "Live", meta: "186 downloads" },
    ],
  },
  social: {
    title: "Social & Media",
    subtitle: "Organize YouTube, Instagram, Facebook, and WhatsApp content.",
    tab: "Channels",
    action: "Add media",
    icon: PlaySquare,
    primaryTitle: "Content planner",
    secondaryTitle: "Profile links",
    stats: [
      { label: "Scheduled posts", value: "9", note: "Next 14 days", icon: PlaySquare },
      { label: "Video ideas", value: "16", note: "4 scripted", icon: FileText },
      { label: "Messages", value: "27", note: "Need triage", icon: MessageCircle },
      { label: "Traffic assists", value: "31", note: "This month", icon: TrendingUp },
    ],
    items: [
      { name: "YouTube", detail: "@AlphaLeeFitness", status: "Active", meta: "Long-form video" },
      { name: "Instagram", detail: "@lalitha_epaarachchi", status: "Active", meta: "Reels and stories" },
      { name: "Facebook", detail: "alphaleefitness", status: "Active", meta: "Community posts" },
    ],
  },
  notifications: {
    title: "Notifications",
    subtitle: "Act on renewals, new leads, and client milestones.",
    tab: "Unread Alerts",
    action: "Mark all read",
    icon: Bell,
    primaryTitle: "Unread alerts",
    secondaryTitle: "Automation rules",
    stats: [
      { label: "Unread", value: "5", note: "2 urgent", icon: Bell },
      { label: "Renewals", value: "3", note: "Next 7 days", icon: CheckCircle2 },
      { label: "New leads", value: "2", note: "Today", icon: Users },
      { label: "Milestones", value: "4", note: "This week", icon: Star },
    ],
    items: [
      { name: "Malsha Gunasekara", detail: "Programme ends tomorrow. Send renewal message.", status: "Urgent", meta: "2 hours ago" },
      { name: "Asha Senanayake", detail: "Submitted interest form for weight loss.", status: "New lead", meta: "2 hours ago" },
      { name: "Priya Fernando", detail: "Completed 8-week weight loss goal.", status: "Milestone", meta: "1 day ago" },
    ],
  },
};

export function AdminSectionPage({ section }: { section: SectionKind }) {
  const config = sectionConfig[section];
  const Icon = config.icon;
  const { user } = useAuth();
  const [clients, setClients] = useState<FitnessClient[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(section === "analytics");
  const [eventsLoading, setEventsLoading] = useState(section === "analytics");
  const [error, setError] = useState("");

  useEffect(() => {
    if (section !== "analytics") return;

    setLoading(true);
    setEventsLoading(true);
    setError("");
    Promise.allSettled([fetchClients(), fetchAnalyticsEvents()])
      .then(([clientsResult, eventsResult]) => {
        if (clientsResult.status === "fulfilled") {
          setClients(clientsResult.value);
        } else {
          setError(clientsResult.reason instanceof Error ? clientsResult.reason.message : "Unable to load analytics data.");
        }

        if (eventsResult.status === "fulfilled") {
          setAnalyticsEvents(eventsResult.value);
        } else {
          const message = eventsResult.reason instanceof Error ? eventsResult.reason.message : "Unable to load analytics events.";
          setError((current) => [current, message].filter(Boolean).join(" "));
        }
      })
      .finally(() => {
        setLoading(false);
        setEventsLoading(false);
      });
  }, [section]);

  const analytics = useMemo(() => {
    const activeClients = clients.filter((client) => client.status === "active");
    const inactiveClients = clients.length - activeClients.length;
    const renewalWatch = activeClients.filter((client) => client.daysLeft <= 7).length;
    const assignedExercises = clients.reduce(
      (total, client) => total + (client.workoutPlan.days ?? []).reduce((dayTotal, day) => dayTotal + day.exercises.length, 0),
      0,
    );
    const assignedMeals = clients.reduce(
      (total, client) => total + normalizeClientMealPlan(client.mealPlan).days.reduce((dayTotal, day) => dayTotal + day.meals.length, 0),
      0,
    );
    const clientsWithWorkouts = clients.filter((client) => (client.workoutPlan.days ?? []).some((day) => day.exercises.length > 0)).length;
    const clientsWithMeals = clients.filter((client) => normalizeClientMealPlan(client.mealPlan).days.some((day) => day.meals.length > 0)).length;
    const totalNotes = clients.reduce((total, client) => total + client.notes.length, 0);
    const packageCounts = clients.reduce<Record<string, number>>((counts, client) => {
      const label = client.packageName || client.packageId;
      counts[label] = (counts[label] ?? 0) + 1;
      return counts;
    }, {});

    return {
      activeClients,
      inactiveClients,
      renewalWatch,
      assignedExercises,
      assignedMeals,
      clientsWithWorkouts,
      clientsWithMeals,
      totalNotes,
      packageCounts,
      recentClients: clients.slice(0, 6),
    };
  }, [clients]);

  const eventAnalytics = useMemo(() => buildEventAnalytics(analyticsEvents), [analyticsEvents]);

  if (section === "notifications") {
    return (
      <DashboardShell>
        <div className="dashboard-container">
          <PageHeader title="Notifications" subtitle="This section is temporarily disabled." />
          <main className="main-content">
            <div className="card empty-state">
              <strong>Notifications are disabled for now.</strong>
              <span className="text-muted">They can be enabled again when the notification workflow is ready.</span>
            </div>
          </main>
        </div>
      </DashboardShell>
    );
  }

  if (section === "analytics") {
    return (
      <DashboardShell>
        <div className="dashboard-container">
          <PageHeader title="Analytics" subtitle="Live client, workout, meal, and note data from the dashboard database." />
          <TabNavigation label="Live Data" />

          <main className="main-content">
            {error ? <div className="auth-error">{error}</div> : null}
            <section className="admin-stat-grid">
              <AnalyticsStat label="Total clients" value={loading ? "-" : String(clients.length)} note={`${analytics.activeClients.length} active`} icon={Users} href="/clients" />
              <AnalyticsStat label="Assigned exercises" value={loading ? "-" : String(analytics.assignedExercises)} note={`${analytics.clientsWithWorkouts} clients with workouts`} icon={Dumbbell} href="/exercises" />
              <AnalyticsStat label="Assigned meals" value={loading ? "-" : String(analytics.assignedMeals)} note={`${analytics.clientsWithMeals} clients with meals`} icon={Salad} href="/meal-plans" />
              <AnalyticsStat label="Trainer notes" value={loading ? "-" : String(analytics.totalNotes)} note={`${analytics.renewalWatch} renewals in 7 days`} icon={MessageCircle} href="/clients?status=active&renewal=ending-soon" />
            </section>

            <section className="admin-stat-grid">
              <AnalyticsStat label="Website events" value={eventsLoading ? "-" : String(analyticsEvents.length)} note="From analytics_events" icon={BarChart3} />
              <AnalyticsStat label="Unique visitors" value={eventsLoading ? "-" : String(eventAnalytics.uniqueVisitorCount)} note="Visitors or sessions" icon={Users} />
              <AnalyticsStat label="Page views" value={eventsLoading ? "-" : String(eventAnalytics.pageViewCount)} note={`${eventAnalytics.topPages.length} tracked pages`} icon={Eye} />
              <AnalyticsStat label="Lead events" value={eventsLoading ? "-" : String(eventAnalytics.leadEventCount)} note={`${eventAnalytics.conversionEventCount} conversion events`} icon={TrendingUp} />
            </section>

            <section className="admin-content-grid">
              <article className="card">
                <div className="card-title">
                  <Users size={18} /> Client plan coverage
                </div>
                <div className="admin-table">
                  {analytics.recentClients.length ? (
                    analytics.recentClients.map((client) => {
                      const exerciseCount = (client.workoutPlan.days ?? []).reduce((total, day) => total + day.exercises.length, 0);
                      const mealCount = normalizeClientMealPlan(client.mealPlan).days.reduce((total, day) => total + day.meals.length, 0);

                      return (
                        <div className="admin-table-row analytics-coverage-row" key={client.id}>
                          <div>
                            <strong>{client.name}</strong>
                            <span>{client.packageName || client.packageId}</span>
                          </div>
                          <span className="status-pill">{client.status}</span>
                          <span className="text-muted">
                            {exerciseCount} exercises - {mealCount} meals
                          </span>
                          <div className="row-action-group">
                            <Link className="text-link row-action-link" href={`/client-profile?clientId=${client.id}`}>
                              Profile
                            </Link>
                            <Link className="text-link row-action-link" href={`/client-profile?clientId=${client.id}&tab=workout`}>
                              Workout
                            </Link>
                            <Link className="text-link row-action-link" href={`/client-profile?clientId=${client.id}&tab=meal`}>
                              Meal
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="admin-table-row">
                      <div>
                        <strong>No client data yet</strong>
                        <span>Analytics will populate once clients are available.</span>
                      </div>
                    </div>
                  )}
                </div>
              </article>

              <aside className="card">
                <div className="card-title">
                  <TrendingUp size={18} /> Programme distribution
                </div>
                <div className="admin-progress-list">
                  <AnalyticsProgress label="Active clients" value={analytics.activeClients.length} total={Math.max(clients.length, 1)} />
                  <AnalyticsProgress label="Inactive clients" value={analytics.inactiveClients} total={Math.max(clients.length, 1)} />
                  <AnalyticsProgress label="Workout coverage" value={analytics.clientsWithWorkouts} total={Math.max(clients.length, 1)} />
                  <AnalyticsProgress label="Meal coverage" value={analytics.clientsWithMeals} total={Math.max(clients.length, 1)} />
                  {Object.entries(analytics.packageCounts).map(([label, value]) => (
                    <AnalyticsProgress key={label} label={label} value={value} total={Math.max(clients.length, 1)} />
                  ))}
                </div>
              </aside>
            </section>

            <section className="admin-content-grid">
              <article className="card">
                <div className="card-title">
                  <BarChart3 size={18} /> Recent analytics events
                </div>
                <div className="admin-table">
                  {eventsLoading ? (
                    <div className="admin-table-row">
                      <div>
                        <strong>Loading analytics events</strong>
                        <span>Reading from Supabase analytics_events.</span>
                      </div>
                    </div>
                  ) : eventAnalytics.recentEvents.length ? (
                    eventAnalytics.recentEvents.map((event, index) => (
                      <div className="admin-table-row analytics-event-row" key={getAnalyticsEventId(event, index)}>
                        <div>
                          <strong>{getAnalyticsEventName(event)}</strong>
                          <span>{getAnalyticsEventPath(event) || "No page path recorded"}</span>
                        </div>
                        <span className="status-pill">{getAnalyticsEventSource(event)}</span>
                        <span className="text-muted">{formatAnalyticsEventDate(event)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="admin-table-row">
                      <div>
                        <strong>No analytics events yet</strong>
                        <span>Events from public.analytics_events will appear here once your tracking starts writing rows.</span>
                      </div>
                    </div>
                  )}
                </div>
              </article>

              <aside className="card">
                <div className="card-title">
                  <TrendingUp size={18} /> Top analytics signals
                </div>
                <div className="admin-progress-list">
                  {eventAnalytics.topPages.length ? (
                    eventAnalytics.topPages.map((item) => (
                      <AnalyticsProgress key={item.label} label={item.label} value={item.value} total={eventAnalytics.pageViewCount || item.value} />
                    ))
                  ) : (
                    <div className="empty-state compact-empty">
                      <strong>No page data yet</strong>
                      <span className="text-muted">Tracked pages will rank here.</span>
                    </div>
                  )}
                  {eventAnalytics.topEvents.map((item) => (
                    <AnalyticsProgress key={`event-${item.label}`} label={item.label} value={item.value} total={analyticsEvents.length || item.value} />
                  ))}
                </div>
              </aside>
            </section>
          </main>
        </div>
      </DashboardShell>
    );
  }

  if (section === "blog") {
    return <BlogPostsSection config={config} />;
  }

  if (section === "testimonials") {
    return <TestimonialsSection user={user} isTrainer={user ? hasTrainerAccess(user.role) : false} />;
  }

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title={config.title} subtitle={config.subtitle}>
          <button className="btn-primary toolbar-button" type="button">
            <Icon size={16} /> {config.action}
          </button>
        </PageHeader>
        <TabNavigation label={config.tab} />

        <main className="main-content">
          <section className="admin-stat-grid">
            {config.stats.map((stat) => (
              <article className="card admin-stat-card" key={stat.label}>
                <div className="metric-header">
                  <h4>{stat.label}</h4>
                  <stat.icon size={17} />
                </div>
                <div className="metric-val">{stat.value}</div>
                <span className="badge-tag">{stat.note}</span>
              </article>
            ))}
          </section>

          <section className="admin-content-grid">
            <article className="card">
              <div className="card-title">
                <Icon size={18} /> {config.primaryTitle}
              </div>
              <div className="admin-table">
                {config.items.map((item) => (
                  <div className="admin-table-row" key={item.name}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <span className="status-pill">{item.status}</span>
                    <span className="text-muted">{item.meta}</span>
                  </div>
                ))}
              </div>
            </article>

            <aside className="card">
              <div className="card-title">
                <TrendingUp size={18} /> {config.secondaryTitle}
              </div>
              <div className="admin-progress-list">
                {config.items.map((item, index) => (
                  <div className="admin-progress-item" key={item.name}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.meta}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${88 - index * 18}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        </main>
      </div>
    </DashboardShell>
  );
}

function BlogPostsSection({ config }: { config: (typeof sectionConfig)["blog"] }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<BlogPostInput>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    status: "draft",
    category: "Education",
    coverImageUrl: "",
  });

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchBlogPosts()
      .then(setPosts)
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "Unable to load blog posts."))
      .finally(() => setLoading(false));
  }, []);

  const publishedCount = posts.filter((post) => post.status === "published").length;
  const draftCount = posts.filter((post) => post.status === "draft").length;
  const latestPost = posts[0];

  function updateForm<Key extends keyof BlogPostInput>(key: Key, value: BlogPostInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const createdPost = await createBlogPostViaApi(form);
      setPosts((current) => [createdPost, ...current]);
      setForm({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        status: "draft",
        category: "Education",
        coverImageUrl: "",
      });
      setMessage(`${createdPost.title} saved to the database.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save blog post.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Blog Posts" subtitle="Create posts in the dashboard and load them from Supabase." />
        <TabNavigation label="Database Posts" />

        <main className="main-content">
          {message ? <div className="auth-error success-message">{message}</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}

          <section className="admin-stat-grid">
            <AnalyticsStat label="Total posts" value={loading ? "-" : String(posts.length)} note="From blog_posts" icon={FileText} />
            <AnalyticsStat label="Published" value={loading ? "-" : String(publishedCount)} note="Visible to readers" icon={Eye} />
            <AnalyticsStat label="Drafts" value={loading ? "-" : String(draftCount)} note="Internal queue" icon={Edit3} />
            <AnalyticsStat label="Latest update" value={latestPost ? formatShortDate(latestPost.updatedAt) : "-"} note={latestPost?.title ?? "No posts yet"} icon={TrendingUp} />
          </section>

          <section className="admin-content-grid">
            <article className="card">
              <div className="card-title">
                <config.icon size={18} /> New blog post
              </div>
              <form className="modal-form" onSubmit={submitPost}>
                <div className="form-group">
                  <label htmlFor="blogTitle">Title</label>
                  <input id="blogTitle" required value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="Protein Guide for Sri Lankan Meals" />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="blogSlug">Slug</label>
                    <input id="blogSlug" value={form.slug} onChange={(event) => updateForm("slug", event.target.value)} placeholder="protein-guide-sri-lankan-meals" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="blogStatus">Status</label>
                    <select id="blogStatus" className="modern-select" value={form.status} onChange={(event) => updateForm("status", event.target.value as BlogPostStatus)}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="blogCategory">Category</label>
                    <input id="blogCategory" value={form.category} onChange={(event) => updateForm("category", event.target.value)} placeholder="Education" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="blogCover">Cover image URL</label>
                    <input id="blogCover" value={form.coverImageUrl} onChange={(event) => updateForm("coverImageUrl", event.target.value)} placeholder="https://..." />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="blogExcerpt">Excerpt</label>
                  <textarea id="blogExcerpt" required rows={3} value={form.excerpt} onChange={(event) => updateForm("excerpt", event.target.value)} placeholder="Short summary for cards and previews." />
                </div>

                <div className="form-group">
                  <label htmlFor="blogContent">Post content</label>
                  <textarea id="blogContent" required rows={8} value={form.content} onChange={(event) => updateForm("content", event.target.value)} placeholder="Write the blog post body here." />
                </div>

                <button className="btn-primary toolbar-button" type="submit" disabled={saving}>
                  <Plus size={16} /> {saving ? "Saving..." : config.action}
                </button>
              </form>
            </article>

            <aside className="card">
              <div className="card-title">
                <FileText size={18} /> Saved posts
              </div>
              <div className="admin-table">
                {loading ? (
                  <div className="admin-table-row">
                    <div>
                      <strong>Loading posts</strong>
                      <span>Reading from Supabase.</span>
                    </div>
                  </div>
                ) : posts.length ? (
                  posts.map((post) => (
                    <div className="admin-table-row" key={post.id}>
                      <div>
                        <strong>{post.title}</strong>
                        <span>/{post.slug}</span>
                      </div>
                      <span className="status-pill">{post.status}</span>
                      <span className="text-muted">{formatShortDate(post.updatedAt)}</span>
                    </div>
                  ))
                ) : (
                  <div className="admin-table-row">
                    <div>
                      <strong>No blog posts yet</strong>
                      <span>Create the first post from the dashboard.</span>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </section>
        </main>
      </div>
    </DashboardShell>
  );
}

function TestimonialsSection({ user, isTrainer }: { user: AuthUser | null; isTrainer: boolean }) {
  if (!isTrainer) {
    return <ClientTestimonialsSection user={user} />;
  }

  return <TrainerTestimonialsSection user={user} />;
}

function ClientTestimonialsSection({ user }: { user: AuthUser | null }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<TestimonialInput>({
    clientId: user?.id ?? "",
    name: user?.name ?? "",
    text: "",
    category: testimonialCategoryOptions[0],
    rating: 5,
    imageUrl: "",
    imageSizeBytes: 0,
    instagramUrl: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      clientId: user.id,
      name: current.name || user.name,
    }));
  }, [user]);

  function updateForm<Key extends keyof TestimonialInput>(key: Key, value: TestimonialInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function clearImage() {
    setForm((current) => ({ ...current, imageUrl: "", imageSizeBytes: 0 }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");

    if (!file) {
      clearImage();
      return;
    }

    if (file.size > testimonialImageMaxBytes) {
      clearImage();
      setError("Testimonial image must be 2 MB or smaller.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      clearImage();
      setError("Upload a JPG, PNG, or WebP testimonial image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        imageUrl: typeof reader.result === "string" ? reader.result : "",
        imageSizeBytes: file.size,
      }));
    };
    reader.onerror = () => setError("Unable to read the selected image.");
    reader.readAsDataURL(file);
  }

  async function submitTestimonial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const createdTestimonial = await createTestimonialViaApi(form);
      setForm((current) => ({ ...current, text: "", rating: 5, imageUrl: "", imageSizeBytes: 0, instagramUrl: "" }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage(`Thanks ${createdTestimonial.name}. Your testimonial was submitted for review.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save testimonial.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Testimonials" subtitle="Share your experience for trainer review." />
        <TabNavigation label="Submit Review" />

        <main className="main-content">
          {message ? <div className="auth-error success-message">{message}</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}

          <section className="admin-content-grid">
            <article className="card">
              <div className="card-title">
                <Star size={18} /> Add testimonial
              </div>
              <form className="modal-form" onSubmit={submitTestimonial}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="testimonialName">Name</label>
                    <input id="testimonialName" required value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Your display name" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="testimonialRating">Star rate</label>
                    <select id="testimonialRating" className="modern-select" value={form.rating} onChange={(event) => updateForm("rating", Number(event.target.value))}>
                      <option value={5}>5 stars</option>
                      <option value={4}>4 stars</option>
                      <option value={3}>3 stars</option>
                      <option value={2}>2 stars</option>
                      <option value={1}>1 star</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="testimonialCategory">Category</label>
                  <select id="testimonialCategory" className="modern-select" value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                    {testimonialCategoryOptions.map((category) => (
                      <option value={category} key={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="testimonialImage">Image</label>
                    <div className="testimonial-image-field">
                      {form.imageUrl ? (
                        <div className="testimonial-image-preview">
                          <img src={form.imageUrl} alt="Selected testimonial" />
                          <button className="icon-button" type="button" onClick={clearImage} aria-label="Remove selected testimonial image">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <label className="testimonial-image-upload" htmlFor="testimonialImage">
                          <ImagePlus size={18} />
                          <span>Upload image</span>
                        </label>
                      )}
                      <input ref={fileInputRef} id="testimonialImage" type="file" accept={testimonialImageAccept} onChange={handleImageChange} />
                    </div>
                    <span className="field-hint">JPG, PNG, or WebP. Max 2 MB.</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="testimonialInstagram">Instagram link</label>
                    <input
                      id="testimonialInstagram"
                      value={form.instagramUrl ?? ""}
                      onChange={(event) => updateForm("instagramUrl", event.target.value)}
                      placeholder="https://instagram.com/username"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="testimonialText">Testimonial text</label>
                  <textarea
                    id="testimonialText"
                    required
                    rows={8}
                    value={form.text}
                    onChange={(event) => updateForm("text", event.target.value)}
                    placeholder="Write your feedback about the coaching, progress, or experience."
                  />
                </div>

                <button className="btn-primary toolbar-button" type="submit" disabled={saving || !user}>
                  <Star size={16} /> {saving ? "Submitting..." : "Submit testimonial"}
                </button>
              </form>
            </article>

            <aside className="card">
              <div className="card-title">
                <CheckCircle2 size={18} /> Review status
              </div>
              <div className="empty-state compact-empty">
                <strong>New testimonials are saved as Pending.</strong>
                <span className="text-muted">Your trainer can approve them from the trainer dashboard before they appear on the public website.</span>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </DashboardShell>
  );
}

function TrainerTestimonialsSection({ user }: { user: AuthUser | null }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [savingForm, setSavingForm] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<TestimonialInput>({
    clientId: user?.id ?? "",
    name: "",
    text: "",
    category: testimonialCategoryOptions[0],
    rating: 5,
    imageUrl: "",
    imageSizeBytes: 0,
    instagramUrl: "",
  });

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchTestimonials()
      .then(setTestimonials)
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "Unable to load testimonials."))
      .finally(() => setLoading(false));
  }, []);

  const pendingCount = testimonials.filter((testimonial) => testimonial.status === "pending").length;
  const approvedCount = testimonials.filter((testimonial) => testimonial.status === "approved").length;
  const averageRating = testimonials.length
    ? (testimonials.reduce((total, testimonial) => total + testimonial.rating, 0) / testimonials.length).toFixed(1)
    : "-";
  const latestTestimonial = testimonials[0];

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({ ...current, clientId: current.clientId || user.id }));
  }, [user]);

  function updateForm<Key extends keyof TestimonialInput>(key: Key, value: TestimonialInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingTestimonial(null);
    setForm({
      clientId: user?.id ?? "",
      name: "",
      text: "",
      category: testimonialCategoryOptions[0],
      rating: 5,
      imageUrl: "",
      imageSizeBytes: 0,
      instagramUrl: "",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openAddForm() {
    resetForm();
    setFormOpen(true);
    setError("");
    setMessage("");
  }

  function openEditForm(testimonial: Testimonial) {
    setEditingTestimonial(testimonial);
    setFormOpen(true);
    setError("");
    setMessage("");
    setForm({
      clientId: testimonial.clientId,
      name: testimonial.name,
      text: testimonial.text,
      category: testimonial.category,
      rating: testimonial.rating,
      imageUrl: testimonial.imageUrl ?? "",
      imageSizeBytes: testimonial.imageSizeBytes,
      instagramUrl: testimonial.instagramUrl ?? "",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeForm() {
    setFormOpen(false);
    resetForm();
  }

  function clearImage() {
    setForm((current) => ({ ...current, imageUrl: "", imageSizeBytes: 0 }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");

    if (!file) {
      clearImage();
      return;
    }

    if (file.size > testimonialImageMaxBytes) {
      clearImage();
      setError("Testimonial image must be 2 MB or smaller.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      clearImage();
      setError("Upload a JPG, PNG, or WebP testimonial image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        imageUrl: typeof reader.result === "string" ? reader.result : "",
        imageSizeBytes: file.size,
      }));
    };
    reader.onerror = () => setError("Unable to read the selected image.");
    reader.readAsDataURL(file);
  }

  async function submitTrainerTestimonial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingForm(true);
    setError("");
    setMessage("");

    try {
      const savedTestimonial = editingTestimonial
        ? await updateTestimonialViaApi(editingTestimonial.id, { ...form, status: editingTestimonial.status })
        : await createTestimonialViaApi({ ...form, clientId: form.clientId || user?.id || "" });

      setTestimonials((current) => {
        const existing = current.some((item) => item.id === savedTestimonial.id);
        return existing ? current.map((item) => (item.id === savedTestimonial.id ? savedTestimonial : item)) : [savedTestimonial, ...current];
      });
      setMessage(`${savedTestimonial.name}'s testimonial was ${editingTestimonial ? "updated" : "added"}.`);
      closeForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save testimonial.");
    } finally {
      setSavingForm(false);
    }
  }

  async function approveTestimonial(testimonial: Testimonial) {
    setSavingId(testimonial.id);
    setError("");
    setMessage("");

    try {
      const updatedTestimonial = await updateTestimonialStatusViaApi(testimonial.id, "approved");
      setTestimonials((current) => current.map((item) => (item.id === updatedTestimonial.id ? updatedTestimonial : item)));
      setMessage(`${updatedTestimonial.name}'s testimonial was approved.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to approve testimonial.");
    } finally {
      setSavingId("");
    }
  }

  async function deleteTestimonial(testimonial: Testimonial) {
    const confirmed = window.confirm(`Delete ${testimonial.name}'s testimonial?`);
    if (!confirmed) return;

    setSavingId(testimonial.id);
    setError("");
    setMessage("");

    try {
      await deleteTestimonialViaApi(testimonial.id);
      setTestimonials((current) => current.filter((item) => item.id !== testimonial.id));
      if (editingTestimonial?.id === testimonial.id) closeForm();
      setMessage(`${testimonial.name}'s testimonial was deleted.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to delete testimonial.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Testimonials" subtitle="Review, add, edit, and publish client feedback.">
          <button className="btn-primary toolbar-button" type="button" onClick={formOpen ? closeForm : openAddForm}>
            {formOpen ? <X size={16} /> : <Plus size={16} />} {formOpen ? "Close form" : "Add testimonial"}
          </button>
        </PageHeader>
        <TabNavigation label="Review Queue" />

        <main className="main-content">
          {message ? <div className="auth-error success-message">{message}</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}

          <section className="admin-stat-grid">
            <AnalyticsStat label="Total" value={loading ? "-" : String(testimonials.length)} note="Database testimonials" icon={Star} />
            <AnalyticsStat label="Pending" value={loading ? "-" : String(pendingCount)} note="Need review" icon={CheckCircle2} />
            <AnalyticsStat label="Approved" value={loading ? "-" : String(approvedCount)} note="Public ready" icon={Eye} />
            <AnalyticsStat label="Avg rating" value={loading ? "-" : String(averageRating)} note={latestTestimonial ? `Latest ${formatShortDate(latestTestimonial.createdAt)}` : "No testimonials yet"} icon={TrendingUp} />
          </section>

          {formOpen ? (
            <section className="card testimonial-editor-card">
              <div className="card-title">
                <Star size={18} /> {editingTestimonial ? "Edit testimonial" : "Add testimonial"}
              </div>
              <form className="modal-form" onSubmit={submitTrainerTestimonial}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="trainerTestimonialName">Name</label>
                    <input id="trainerTestimonialName" required value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Client display name" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="trainerTestimonialRating">Star rate</label>
                    <select id="trainerTestimonialRating" className="modern-select" value={form.rating} onChange={(event) => updateForm("rating", Number(event.target.value))}>
                      <option value={5}>5 stars</option>
                      <option value={4}>4 stars</option>
                      <option value={3}>3 stars</option>
                      <option value={2}>2 stars</option>
                      <option value={1}>1 star</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="trainerTestimonialCategory">Category</label>
                    <select id="trainerTestimonialCategory" className="modern-select" value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                      {testimonialCategoryOptions.map((category) => (
                        <option value={category} key={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="trainerTestimonialInstagram">Instagram link</label>
                    <input
                      id="trainerTestimonialInstagram"
                      value={form.instagramUrl ?? ""}
                      onChange={(event) => updateForm("instagramUrl", event.target.value)}
                      placeholder="https://instagram.com/username"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="trainerTestimonialClientId">Client id</label>
                    <input id="trainerTestimonialClientId" required value={form.clientId} onChange={(event) => updateForm("clientId", event.target.value)} placeholder="Supabase client user id" />
                    <span className="field-hint">Defaults to the trainer account id for manual entries.</span>
                  </div>
                  <div className="form-group">
                    <label htmlFor="trainerTestimonialImage">Image</label>
                    <div className="testimonial-image-field">
                      {form.imageUrl ? (
                        <div className="testimonial-image-preview">
                          <img src={form.imageUrl} alt="Selected testimonial" />
                          <button className="icon-button" type="button" onClick={clearImage} aria-label="Remove selected testimonial image">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <label className="testimonial-image-upload" htmlFor="trainerTestimonialImage">
                          <ImagePlus size={18} />
                          <span>Upload image</span>
                        </label>
                      )}
                      <input ref={fileInputRef} id="trainerTestimonialImage" type="file" accept={testimonialImageAccept} onChange={handleImageChange} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="trainerTestimonialText">Testimonial text</label>
                  <textarea
                    id="trainerTestimonialText"
                    required
                    rows={6}
                    value={form.text}
                    onChange={(event) => updateForm("text", event.target.value)}
                    placeholder="Write or paste the client feedback."
                  />
                </div>

                <div className="testimonial-form-actions">
                  <button className="btn-primary toolbar-button" type="submit" disabled={savingForm || !user}>
                    <Star size={16} /> {savingForm ? "Saving..." : editingTestimonial ? "Save changes" : "Add testimonial"}
                  </button>
                  <button className="btn-secondary compact-action" type="button" onClick={closeForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          <section className="testimonial-review-layout">
            <article className="card">
              <div className="card-title">
                <Star size={18} /> Pending approvals
              </div>
              <div className="admin-table">
                {loading ? (
                  <TestimonialLoadingRow />
                ) : pendingCount ? (
                  testimonials
                    .filter((testimonial) => testimonial.status === "pending")
                    .map((testimonial) => (
                      <TestimonialReviewRow
                        key={testimonial.id}
                        testimonial={testimonial}
                        saving={savingId === testimonial.id}
                        onApprove={() => approveTestimonial(testimonial)}
                        onEdit={() => openEditForm(testimonial)}
                        onDelete={() => deleteTestimonial(testimonial)}
                      />
                    ))
                ) : (
                  <div className="admin-table-row">
                    <div>
                      <strong>No pending testimonials</strong>
                      <span>Client submissions will appear here for approval.</span>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article className="card">
              <div className="card-title">
                <Eye size={18} /> Approved testimonials
              </div>
              <div className="admin-table">
                {loading ? (
                  <TestimonialLoadingRow />
                ) : approvedCount ? (
                  testimonials
                    .filter((testimonial) => testimonial.status === "approved")
                    .map((testimonial) => (
                      <TestimonialApprovedRow
                        key={testimonial.id}
                        testimonial={testimonial}
                        saving={savingId === testimonial.id}
                        onEdit={() => openEditForm(testimonial)}
                        onDelete={() => deleteTestimonial(testimonial)}
                      />
                    ))
                ) : (
                  <div className="admin-table-row">
                    <div>
                      <strong>No approved testimonials yet</strong>
                      <span>Approved testimonials will be ready for your public website.</span>
                    </div>
                  </div>
                )}
              </div>
            </article>
          </section>
        </main>
      </div>
    </DashboardShell>
  );
}

function TestimonialLoadingRow() {
  return (
    <div className="admin-table-row">
      <div>
        <strong>Loading testimonials</strong>
        <span>Reading from Supabase.</span>
      </div>
    </div>
  );
}

function TestimonialReviewRow({
  testimonial,
  saving,
  onApprove,
  onEdit,
  onDelete,
}: {
  testimonial: Testimonial;
  saving: boolean;
  onApprove: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="admin-table-row testimonial-row">
      {testimonial.imageUrl ? (
        <img className="testimonial-thumb" src={testimonial.imageUrl} alt={`${testimonial.name} testimonial`} />
      ) : (
        <div className="testimonial-thumb testimonial-thumb-empty" aria-hidden="true">
          <Star size={16} />
        </div>
      )}
      <div>
        <strong>{testimonial.name}</strong>
        <span>{testimonial.text}</span>
        <span className="text-muted">{testimonial.category}</span>
        {testimonial.instagramUrl ? (
          <a className="testimonial-social-link" href={testimonial.instagramUrl} target="_blank" rel="noreferrer">
            <AtSign size={13} /> Instagram
          </a>
        ) : null}
        <RatingStars rating={testimonial.rating} />
      </div>
      <span className="status-pill">Pending</span>
      <div className="testimonial-row-actions">
        <button className="btn-primary compact-action" type="button" disabled={saving} onClick={onApprove}>
          <CheckCircle2 size={15} /> {saving ? "Saving..." : "Approve"}
        </button>
        <button className="icon-button" type="button" disabled={saving} onClick={onEdit} aria-label={`Edit ${testimonial.name}'s testimonial`}>
          <Edit3 size={15} />
        </button>
        <button className="icon-button danger-icon-button" type="button" disabled={saving} onClick={onDelete} aria-label={`Delete ${testimonial.name}'s testimonial`}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function TestimonialApprovedRow({
  testimonial,
  saving,
  onEdit,
  onDelete,
}: {
  testimonial: Testimonial;
  saving: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="admin-table-row testimonial-row">
      {testimonial.imageUrl ? (
        <img className="testimonial-thumb" src={testimonial.imageUrl} alt={`${testimonial.name} testimonial`} />
      ) : (
        <div className="testimonial-thumb testimonial-thumb-empty" aria-hidden="true">
          <Star size={16} />
        </div>
      )}
      <div>
        <strong>{testimonial.name}</strong>
        <span>{testimonial.text}</span>
        <span className="text-muted">{testimonial.category}</span>
        {testimonial.instagramUrl ? (
          <a className="testimonial-social-link" href={testimonial.instagramUrl} target="_blank" rel="noreferrer">
            <AtSign size={13} /> Instagram
          </a>
        ) : null}
        <RatingStars rating={testimonial.rating} />
      </div>
      <span className="status-pill status-success">Approved</span>
      <div className="testimonial-row-actions">
        <span className="text-muted">{formatShortDate(testimonial.approvedAt ?? testimonial.updatedAt)}</span>
        <button className="icon-button" type="button" disabled={saving} onClick={onEdit} aria-label={`Edit ${testimonial.name}'s testimonial`}>
          <Edit3 size={15} />
        </button>
        <button className="icon-button danger-icon-button" type="button" disabled={saving} onClick={onDelete} aria-label={`Delete ${testimonial.name}'s testimonial`}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="testimonial-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={13} fill={index < rating ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

type AnalyticsCountItem = {
  label: string;
  value: number;
};

function getAnalyticsText(event: AnalyticsEvent, keys: string[]) {
  for (const key of keys) {
    const value = event[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  for (const nestedKey of ["metadata", "properties"]) {
    const nested = event[nestedKey];
    if (!nested || typeof nested !== "object") continue;

    for (const key of keys) {
      const value = (nested as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
  }

  return "";
}

function getAnalyticsEventId(event: AnalyticsEvent, index: number) {
  return getAnalyticsText(event, ["id", "event_id", "uuid"]) || `analytics-event-${index}`;
}

function getAnalyticsEventName(event: AnalyticsEvent) {
  return getAnalyticsText(event, ["event_name", "event_type", "name", "type", "action"]) || "analytics event";
}

function getAnalyticsEventPath(event: AnalyticsEvent) {
  return getAnalyticsText(event, ["path", "page", "page_path", "route", "url", "href", "pathname"]);
}

function getAnalyticsEventSource(event: AnalyticsEvent) {
  return getAnalyticsText(event, ["source", "channel", "referrer", "utm_source", "device"]) || "event";
}

function getAnalyticsEventActor(event: AnalyticsEvent) {
  return getAnalyticsText(event, ["visitor_id", "session_id", "anonymous_id", "user_id", "client_id", "ip"]);
}

function getAnalyticsEventTimestamp(event: AnalyticsEvent) {
  return getAnalyticsText(event, ["created_at", "timestamp", "occurred_at", "event_time", "time", "date"]);
}

function formatAnalyticsEventDate(event: AnalyticsEvent) {
  const timestamp = getAnalyticsEventTimestamp(event);
  if (!timestamp) return "-";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function incrementCount(counts: Map<string, number>, label: string) {
  const normalizedLabel = label.trim() || "Unknown";
  counts.set(normalizedLabel, (counts.get(normalizedLabel) ?? 0) + 1);
}

function getTopCounts(counts: Map<string, number>, limit: number): AnalyticsCountItem[] {
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function buildEventAnalytics(events: AnalyticsEvent[]) {
  const visitorIds = new Set<string>();
  const pageCounts = new Map<string, number>();
  const eventCounts = new Map<string, number>();
  let pageViewCount = 0;
  let leadEventCount = 0;
  let conversionEventCount = 0;

  events.forEach((event) => {
    const name = getAnalyticsEventName(event);
    const nameKey = name.toLowerCase();
    const path = getAnalyticsEventPath(event);
    const actor = getAnalyticsEventActor(event);

    incrementCount(eventCounts, name);
    if (actor) visitorIds.add(actor);

    if (path) {
      pageViewCount += 1;
      incrementCount(pageCounts, path);
    } else if (nameKey.includes("page") || nameKey.includes("view")) {
      pageViewCount += 1;
    }

    if (/(lead|form|submit|signup|sign_up|contact|enquiry|inquiry)/i.test(nameKey)) {
      leadEventCount += 1;
    }

    if (/(conversion|purchase|payment|checkout|package|subscribe|success)/i.test(nameKey)) {
      conversionEventCount += 1;
    }
  });

  const recentEvents = [...events]
    .sort((a, b) => {
      const aTime = new Date(getAnalyticsEventTimestamp(a)).getTime();
      const bTime = new Date(getAnalyticsEventTimestamp(b)).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    })
    .slice(0, 8);

  return {
    uniqueVisitorCount: visitorIds.size,
    pageViewCount,
    leadEventCount,
    conversionEventCount,
    topPages: getTopCounts(pageCounts, 5),
    topEvents: getTopCounts(eventCounts, 5),
    recentEvents,
  };
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function AnalyticsStat({ label, value, note, icon: Icon, href }: StatItem & { href?: string }) {
  const content = (
    <>
      <div className="metric-header">
        <h4>{label}</h4>
        <Icon size={17} />
      </div>
      <div className="metric-val">{value}</div>
      <span className="badge-tag">{note}</span>
    </>
  );

  if (href) {
    return (
      <Link className="card admin-stat-card admin-stat-link" href={href} aria-label={`Open ${label}`}>
        {content}
      </Link>
    );
  }

  return (
    <article className="card admin-stat-card">
      {content}
    </article>
  );
}

function AnalyticsProgress({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = Math.min(100, Math.round((value / total) * 100));

  return (
    <div className="admin-progress-item">
      <div>
        <strong>{label}</strong>
        <span>
          {value} of {total}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

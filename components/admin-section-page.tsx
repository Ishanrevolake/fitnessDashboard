"use client";

import {
  BarChart3,
  Bell,
  CheckCircle2,
  Dumbbell,
  Edit3,
  Eye,
  FileText,
  MessageCircle,
  PlaySquare,
  Plus,
  Salad,
  Send,
  Star,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { TabNavigation } from "@/components/tab-navigation";
import { fetchClients } from "@/lib/api-client";
import { normalizeClientMealPlan } from "@/lib/meal-plan-utils";
import type { FitnessClient } from "@/lib/types";

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
  const [clients, setClients] = useState<FitnessClient[]>([]);
  const [loading, setLoading] = useState(section === "analytics");
  const [error, setError] = useState("");

  useEffect(() => {
    if (section !== "analytics") return;

    setLoading(true);
    setError("");
    fetchClients()
      .then(setClients)
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "Unable to load analytics data."))
      .finally(() => setLoading(false));
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
              <AnalyticsStat label="Total clients" value={loading ? "-" : String(clients.length)} note={`${analytics.activeClients.length} active`} icon={Users} />
              <AnalyticsStat label="Assigned exercises" value={loading ? "-" : String(analytics.assignedExercises)} note={`${analytics.clientsWithWorkouts} clients with workouts`} icon={Dumbbell} />
              <AnalyticsStat label="Assigned meals" value={loading ? "-" : String(analytics.assignedMeals)} note={`${analytics.clientsWithMeals} clients with meals`} icon={Salad} />
              <AnalyticsStat label="Trainer notes" value={loading ? "-" : String(analytics.totalNotes)} note={`${analytics.renewalWatch} renewals in 7 days`} icon={MessageCircle} />
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
                        <div className="admin-table-row" key={client.id}>
                          <div>
                            <strong>{client.name}</strong>
                            <span>{client.packageName || client.packageId}</span>
                          </div>
                          <span className="status-pill">{client.status}</span>
                          <span className="text-muted">
                            {exerciseCount} exercises - {mealCount} meals
                          </span>
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
          </main>
        </div>
      </DashboardShell>
    );
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

function AnalyticsStat({ label, value, note, icon: Icon }: StatItem) {
  return (
    <article className="card admin-stat-card">
      <div className="metric-header">
        <h4>{label}</h4>
        <Icon size={17} />
      </div>
      <div className="metric-val">{value}</div>
      <span className="badge-tag">{note}</span>
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

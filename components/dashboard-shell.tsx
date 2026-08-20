"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  Coffee,
  CreditCard,
  Dumbbell,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Settings,
  SlidersHorizontal,
  SquareLibrary,
  Star,
  Utensils,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { hasTrainerAccess } from "@/lib/auth-store";

type DashboardShellProps = {
  children?: React.ReactNode;
};

type DashboardShellFallbackProps = {
  children?: React.ReactNode;
};

type NavGroupId = "overview" | "clients" | "content" | "training" | "business";

type NavChild = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: "green" | "orange";
  match?: (pathname: string, searchParams: URLSearchParams) => boolean;
};

type NavGroup = {
  id: NavGroupId;
  label: string;
  children: NavChild[];
  match?: (pathname: string) => boolean;
};

const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    children: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: HeartPulse },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    match: (pathname) => pathname.startsWith("/client-profile"),
    children: [
      { label: "Clients", href: "/clients", icon: Users, match: (pathname) => pathname === "/clients" || pathname.startsWith("/client-profile") },
      { label: "Programmes", href: "/programs", icon: SlidersHorizontal, match: (pathname, searchParams) => pathname === "/programs" && !searchParams.get("library") },
    ],
  },
  {
    id: "content",
    label: "Content",
    children: [
      { label: "Testimonials", href: "/testimonials", icon: SquareLibrary },
      { label: "Meal Plans", href: "/recipes", icon: Utensils },
    ],
  },
  {
    id: "training",
    label: "Training",
    children: [
      { label: "Exercise Library", href: "/exercises", icon: Coffee },
      { label: "Workout Library", href: "/programs?library=workouts", icon: BriefcaseBusiness, match: (pathname, searchParams) => pathname === "/programs" && searchParams.get("library") === "workouts" },
    ],
  },
  {
    id: "business",
    label: "Business",
    children: [
      { label: "Payment Verification", href: "/payments", icon: CreditCard },
      { label: "Ask Alpha Payments", href: "/ask-alpha-payments", icon: CreditCard },
      { label: "Ask Alpha Inbox", href: "/ask-alpha-inbox", icon: MessageSquareText },
      { label: "Leads", href: "/leads", icon: Phone },
      { label: "Settings", href: "/settings/account", icon: Settings, match: (pathname) => pathname.startsWith("/settings") },
    ],
  },
];

const clientNavItems: NavChild[] = [
  { label: "Meal Plans", href: "/meal-plans", icon: Utensils },
  { label: "Exercises", href: "/exercises", icon: Dumbbell },
  { label: "Testimonials", href: "/testimonials", icon: Star },
];

const clientAllowedRoutes = ["/", "/meal-plans", "/exercises", "/testimonials"];

function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getRequiredGroup(pathname: string): NavGroupId | undefined {
  return navGroups.find((group) => {
    if (group.match?.(pathname)) return true;
    return group.children.some((child) => isRouteActive(pathname, child.href.split("?")[0]));
  })?.id;
}

function SidebarIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon size={16} strokeWidth={1.8} />;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <Suspense fallback={<DashboardShellFallback>{children}</DashboardShellFallback>}>
      <DashboardShellContent>{children}</DashboardShellContent>
    </Suspense>
  );
}

function DashboardShellFallback({ children }: DashboardShellFallbackProps) {
  return (
    <div className="app-layout">
      <aside className="app-sidebar expanded">
        <div className="sidebar-header">
          <Link className="brand" href="/">
            <div className="brand-logo">A</div>
            <span className="brand-text">ALFA LEE</span>
          </Link>
        </div>
      </aside>
      <div className="main-wrapper">{children}</div>
    </div>
  );
}

function DashboardShellContent({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut } = useAuth();
  const trainerAccess = user ? hasTrainerAccess(user.role) : false;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const savedCollapsed = window.localStorage.getItem("sidebarState");

    if (savedCollapsed === "collapsed") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (loading || !user || trainerAccess) return;

    const allowed = clientAllowedRoutes.some((route) => isRouteActive(pathname, route));
    if (!allowed) router.replace("/");
  }, [loading, pathname, router, trainerAccess, user]);

  useEffect(() => {
    setMobileOpen(false);

  }, [pathname, trainerAccess]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const nextCollapsed = !current;
      window.localStorage.setItem("sidebarState", nextCollapsed ? "collapsed" : "expanded");
      return nextCollapsed;
    });
  }

  function isChildActive(child: NavChild) {
    if (child.match) return child.match(pathname, searchParams);
    return isRouteActive(pathname, child.href.split("?")[0]);
  }

  function isGroupActive(group: NavGroup) {
    return group.match?.(pathname) || group.children.some(isChildActive);
  }

  async function handleSignOut() {
    await signOut();
    setMobileOpen(false);
    router.replace("/login");
  }

  if (loading || !user) {
    return <DashboardShellFallback />;
  }

  return (
    <div className="app-layout">
      <button className="mobile-sidebar-toggle icon-btn" type="button" onClick={() => setMobileOpen(true)} aria-label="Open sidebar">
        <Menu size={22} />
      </button>

      <button
        className={`sidebar-backdrop ${mobileOpen ? "active" : ""}`}
        type="button"
        aria-label="Close sidebar"
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`app-sidebar ${collapsed ? "collapsed" : "expanded"} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <Link className="brand" href="/" onClick={() => setMobileOpen(false)}>
            <div className="brand-logo">A</div>
            <span className="brand-text">ALFA LEE</span>
          </Link>
          <button className="toggle-btn icon-btn desktop-collapse" type="button" onClick={toggleSidebar} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <button className="toggle-btn icon-btn mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav alf-sidebar-nav" aria-label="Main navigation">
          {!trainerAccess
            ? clientNavItems.map((item) => {
                return (
                  <div className="nav-item" key={item.href}>
                    <Link href={item.href} className={`nav-link ${isRouteActive(pathname, item.href) ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
                      <SidebarIcon icon={item.icon} />
                      <span className="nav-text">{item.label}</span>
                    </Link>
                  </div>
                );
              })
            : null}

          {trainerAccess ? navGroups.map((group) => {
            return (
              <div className="sidebar-section" key={group.id}>
                <div className="sidebar-label">{group.label}</div>
                {group.children.map((child) => (
                  <div className="nav-item" key={`${group.id}-${child.href}-${child.label}`}>
                    <Link href={child.href} className={`nav-link ${isChildActive(child) ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
                      <SidebarIcon icon={child.icon} />
                      <span className="nav-text">{child.label}</span>
                      {child.badge ? <span className={`nav-badge ${child.badgeTone ?? "green"}`}>{child.badge}</span> : null}
                    </Link>
                  </div>
                ))}
              </div>
            );
          }) : null}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="sidebar-user-details">
              <strong>{user.name}</strong>
              <span>{trainerAccess ? user.businessName : "Client Account"}</span>
            </div>
          </div>
          <button className="nav-link logout-link" type="button" onClick={handleSignOut}>
            <LogOut size={20} />
            <span className="nav-text">Log Out</span>
          </button>
        </div>
      </aside>

      <div className="main-wrapper">{children}</div>
    </div>
  );
}

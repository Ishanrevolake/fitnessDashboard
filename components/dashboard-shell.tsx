"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  CreditCard,
  Dumbbell,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Utensils,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { hasTrainerAccess } from "@/lib/auth-store";

type DashboardShellProps = {
  children?: React.ReactNode;
};

type DashboardShellFallbackProps = {
  children?: React.ReactNode;
};

type NavGroupId = "overview" | "clients" | "content" | "settings";

type NavChild = {
  label: string;
  href: string;
  match?: (pathname: string, searchParams: URLSearchParams) => boolean;
};

type NavGroup = {
  id: NavGroupId;
  label: string;
  icon: LucideIcon;
  children: NavChild[];
  match?: (pathname: string) => boolean;
};

const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: BarChart3,
    children: [
      { label: "Analytics", href: "/analytics" },
      { label: "Payment Slips", href: "/payments" },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    icon: Users,
    match: (pathname) => pathname.startsWith("/client-profile"),
    children: [
      { label: "All Clients", href: "/clients", match: (pathname, searchParams) => pathname === "/clients" && !searchParams.get("status") },
      { label: "Active Clients", href: "/clients?status=active", match: (pathname, searchParams) => pathname === "/clients" && searchParams.get("status") === "active" },
      { label: "Inactive Clients", href: "/clients?status=inactive", match: (pathname, searchParams) => pathname === "/clients" && searchParams.get("status") === "inactive" },
      { label: "Exercises", href: "/exercises" },
    ],
  },
  {
    id: "content",
    label: "Content",
    icon: FileText,
    children: [
      { label: "Meal Plan Templates", href: "/meal-plans" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      { label: "Your Account", href: "/settings/account" },
      { label: "Default Settings", href: "/settings/defaults" },
    ],
  },
];

const clientNavItems: NavChild[] = [
  { label: "Meal Plans", href: "/meal-plans" },
  { label: "Exercises", href: "/exercises" },
];

const clientAllowedRoutes = ["/", "/meal-plans", "/exercises"];

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
  return <Icon size={20} strokeWidth={2} />;
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
            <span className="brand-text">AlphaFitness</span>
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
  const [openGroups, setOpenGroups] = useState<NavGroupId[]>(() => {
    const requiredGroup = getRequiredGroup(pathname);
    return requiredGroup ? [requiredGroup] : [];
  });

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

    const requiredGroup = trainerAccess ? getRequiredGroup(pathname) : undefined;
    const nextGroups = requiredGroup ? [requiredGroup] : [];
    setOpenGroups(nextGroups);
    window.localStorage.setItem("openSubmenus", JSON.stringify(nextGroups));
  }, [pathname, trainerAccess]);

  const openGroupSet = useMemo(() => new Set(openGroups), [openGroups]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const nextCollapsed = !current;
      window.localStorage.setItem("sidebarState", nextCollapsed ? "collapsed" : "expanded");
      return nextCollapsed;
    });
  }

  function toggleGroup(groupId: NavGroupId) {
    if (collapsed) {
      setCollapsed(false);
      window.localStorage.setItem("sidebarState", "expanded");
    }

    setOpenGroups((current) => {
      const nextGroups = current.includes(groupId) ? [] : [groupId];

      window.localStorage.setItem("openSubmenus", JSON.stringify(nextGroups));
      return nextGroups;
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
            <span className="brand-text">AlphaFitness</span>
          </Link>
          <button className="toggle-btn icon-btn desktop-collapse" type="button" onClick={toggleSidebar} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <button className="toggle-btn icon-btn mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close sidebar">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="nav-item">
            <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
              <SidebarIcon icon={LayoutDashboard} />
              <span className="nav-text">Dashboard</span>
            </Link>
          </div>

          {!trainerAccess
            ? clientNavItems.map((item) => {
                const Icon = item.href === "/meal-plans" ? Utensils : Dumbbell;

                return (
                  <div className="nav-item" key={item.href}>
                    <Link href={item.href} className={`nav-link ${isRouteActive(pathname, item.href) ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
                      <SidebarIcon icon={Icon} />
                      <span className="nav-text">{item.label}</span>
                    </Link>
                  </div>
                );
              })
            : null}

          {trainerAccess ? navGroups.map((group) => {
            const expanded = openGroupSet.has(group.id);
            const active = isGroupActive(group);

            return (
              <div className={`nav-item has-submenu ${expanded ? "open" : ""}`} key={group.id}>
                <button
                  type="button"
                  className={`nav-link submenu-toggle ${active ? "active" : ""}`}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={expanded}
                  aria-controls={`${group.id}-submenu`}
                >
                  <SidebarIcon icon={group.id === "overview" && pathname.startsWith("/payments") ? CreditCard : group.icon} />
                  <span className="nav-text">{group.label}</span>
                  <ChevronDown className="chevron" />
                </button>
                <ul className="submenu" id={`${group.id}-submenu`}>
                  {group.children.map((child) => (
                    <li key={child.href}>
                      <Link className={isChildActive(child) ? "active" : ""} href={child.href} onClick={() => setMobileOpen(false)}>
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
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

"use client";

import { Bell, Shield, SlidersHorizontal, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";

type SettingsPageProps = {
  variant: "account" | "defaults";
};

export function SettingsPage({ variant }: SettingsPageProps) {
  const isAccount = variant === "account";

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader
          title={isAccount ? "Your Account" : "Default Settings"}
          subtitle={isAccount ? "Manage trainer profile details and notification preferences." : "Configure defaults used when new clients are created."}
        />

        <main className="main-content">
          <section className="card">
            <div className="card-title">
              {isAccount ? <UserRound size={18} /> : <SlidersHorizontal size={18} />}
              {isAccount ? "Profile Settings" : "Client Defaults"}
            </div>
            <div className="settings-grid">
              <div className="info-item">
                <Shield size={16} /> {isAccount ? "Account security controls are ready for expansion." : "Default package: Rookie"}
              </div>
              <div className="info-item">
                <Bell size={16} /> {isAccount ? "Notifications: Email and in-app alerts" : "Reminder cadence: Weekly check-in"}
              </div>
            </div>
          </section>
        </main>
      </div>
    </DashboardShell>
  );
}

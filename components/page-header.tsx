"use client";

import { Bell, Grid2X2, PlusCircle, Search } from "lucide-react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  onAddClient?: () => void;
  children?: React.ReactNode;
};

export function PageHeader({ title, subtitle, onAddClient, children }: PageHeaderProps) {
  return (
    <header className="top-header">
      <div className={subtitle ? "header-left" : "client-brand"}>
        <h1 className="client-name" style={{ marginLeft: subtitle ? 0 : 10 }}>
          {title}
        </h1>
        {subtitle ? <p className="text-muted">{subtitle}</p> : null}
      </div>
      <div className="header-right">
        {children ?? (
          <div className="header-icons">
            <button className="icon-btn" type="button" aria-label="Search">
              <Search size={20} />
            </button>
            <button className="icon-btn" type="button" aria-label="Apps">
              <Grid2X2 size={20} />
            </button>
            <button className="icon-btn" type="button" aria-label="Notifications">
              <Bell size={20} />
            </button>
            {onAddClient ? (
              <button className="icon-btn" type="button" aria-label="Add client" onClick={onAddClient}>
                <PlusCircle size={20} />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}

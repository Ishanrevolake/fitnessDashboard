"use client";

import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function Toast({ message }: { message: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;

    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 2800);
    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!message) return null;

  return (
    <div id="toastContainer" style={{ position: "fixed", right: 24, bottom: 24, zIndex: 3000 }}>
      <div className={`toast-notification ${visible ? "show" : ""}`}>
        <CheckCircle size={18} style={{ color: "var(--accent-green)" }} />
        <span>{message}</span>
      </div>
    </div>
  );
}

"use client";

import { CheckCircle2, ExternalLink, Lock, Mail, MessageSquareText, RefreshCw, Send, Unlock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { hasTrainerAccess } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";

type AskAlphaThreadStatus = "open" | "answered" | "closed";
type AskAlphaSenderRole = "client" | "coach" | "admin";

type AskAlphaThread = {
  id: string;
  order_id: string;
  user_id: string;
  subject: string | null;
  status: AskAlphaThreadStatus;
  created_at: string;
  updated_at: string;
};

type AskAlphaOrder = {
  id: string;
  product_title: string;
  question_credits: number;
  amount_lkr: number;
  reference: string | null;
  status: string;
};

type AskAlphaMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: AskAlphaSenderRole;
  body: string;
  created_at: string;
};

type ProfileRecord = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

function getProfileName(profile?: ProfileRecord) {
  if (!profile) return "Name unavailable";
  const combined = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  return profile.full_name || combined || "Name unavailable";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getStatusClass(status: AskAlphaThreadStatus) {
  if (status === "answered") return "status-success";
  if (status === "closed") return "status-muted";
  return "";
}

async function fetchProfilesByUserIds(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, ProfileRecord>();

  const { data, error } = await supabase.from("profiles").select("id,first_name,last_name,full_name,email,phone").in("id", userIds);
  if (error) throw new Error(error.message || "Unable to load client profiles.");

  const profiles = new Map<string, ProfileRecord>();
  (data ?? []).forEach((profile) => profiles.set(profile.id, profile as ProfileRecord));
  return profiles;
}

export function AskAlphaInboxPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<AskAlphaThread[]>([]);
  const [ordersById, setOrdersById] = useState<Map<string, AskAlphaOrder>>(new Map());
  const [profilesByUserId, setProfilesByUserId] = useState<Map<string, ProfileRecord>>(new Map());
  const [messagesByThreadId, setMessagesByThreadId] = useState<Map<string, AskAlphaMessage[]>>(new Map());
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      if (a.status === "open" && b.status !== "open") return -1;
      if (a.status !== "open" && b.status === "open") return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [threads]);

  const selectedThread = sortedThreads.find((thread) => thread.id === selectedThreadId) ?? sortedThreads[0] ?? null;
  const selectedProfile = selectedThread ? profilesByUserId.get(selectedThread.user_id) : undefined;
  const selectedOrder = selectedThread ? ordersById.get(selectedThread.order_id) : undefined;
  const selectedMessages = selectedThread ? messagesByThreadId.get(selectedThread.id) ?? [] : [];

  const stats = useMemo(() => {
    return {
      open: threads.filter((thread) => thread.status === "open").length,
      answered: threads.filter((thread) => thread.status === "answered").length,
      closed: threads.filter((thread) => thread.status === "closed").length,
      total: threads.length,
    };
  }, [threads]);

  async function loadInbox(nextSelectedId?: string) {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase.from("ask_alpha_threads").select("*").order("updated_at", { ascending: false });

    if (loadError) {
      setThreads([]);
      setError(loadError.message || "Unable to load Ask Alpha threads.");
      setLoading(false);
      return;
    }

    const nextThreads = (data ?? []) as AskAlphaThread[];
    setThreads(nextThreads);

    try {
      const userIds = Array.from(new Set(nextThreads.map((thread) => thread.user_id).filter(Boolean)));
      const orderIds = Array.from(new Set(nextThreads.map((thread) => thread.order_id).filter(Boolean)));
      const threadIds = nextThreads.map((thread) => thread.id);

      const [profiles, ordersResult, messagesResult] = await Promise.all([
        fetchProfilesByUserIds(userIds),
        orderIds.length
          ? supabase.from("ask_alpha_orders").select("id,product_title,question_credits,amount_lkr,reference,status").in("id", orderIds)
          : Promise.resolve({ data: [], error: null }),
        threadIds.length
          ? supabase.from("ask_alpha_messages").select("*").in("thread_id", threadIds).order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (ordersResult.error) throw new Error(ordersResult.error.message || "Unable to load Ask Alpha order details.");
      if (messagesResult.error) throw new Error(messagesResult.error.message || "Unable to load Ask Alpha messages.");

      const nextOrders = new Map<string, AskAlphaOrder>();
      ((ordersResult.data ?? []) as AskAlphaOrder[]).forEach((order) => nextOrders.set(order.id, order));
      setOrdersById(nextOrders);
      setProfilesByUserId(profiles);

      const nextMessages = new Map<string, AskAlphaMessage[]>();
      ((messagesResult.data ?? []) as AskAlphaMessage[]).forEach((threadMessage) => {
        const current = nextMessages.get(threadMessage.thread_id) ?? [];
        nextMessages.set(threadMessage.thread_id, [...current, threadMessage]);
      });
      setMessagesByThreadId(nextMessages);

      setSelectedThreadId(nextSelectedId || selectedThreadId || nextThreads[0]?.id || "");
    } catch (loadRelatedError) {
      setError(loadRelatedError instanceof Error ? loadRelatedError.message : "Unable to load inbox details.");
    } finally {
      setLoading(false);
    }
  }

  async function sendReply() {
    if (!user || !selectedThread) return;
    const body = replyText.trim();

    if (!body) {
      setError("Write a reply before sending.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const senderRole: AskAlphaSenderRole = user.role === "admin" ? "admin" : "coach";
    const { error: insertError } = await supabase.from("ask_alpha_messages").insert({
      thread_id: selectedThread.id,
      sender_id: user.id,
      sender_role: senderRole,
      body,
    });

    if (insertError) {
      setError(insertError.message || "Unable to send reply.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("ask_alpha_threads")
      .update({ status: "answered", updated_at: new Date().toISOString() })
      .eq("id", selectedThread.id);

    if (updateError) {
      setError(updateError.message || "Reply sent, but the thread status could not be updated.");
    } else {
      setMessage("Reply sent.");
      setReplyText("");
      await loadInbox(selectedThread.id);
    }

    setSaving(false);
  }

  async function setThreadStatus(thread: AskAlphaThread, status: AskAlphaThreadStatus) {
    setSaving(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("ask_alpha_threads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", thread.id);

    if (updateError) {
      setError(updateError.message || "Unable to update thread status.");
    } else {
      setMessage(status === "closed" ? "Thread closed." : "Thread reopened.");
      await loadInbox(thread.id);
    }

    setSaving(false);
  }

  useEffect(() => {
    loadInbox();
  }, []);

  if (user && !hasTrainerAccess(user.role)) {
    return (
      <DashboardShell>
        <div className="dashboard-container">
          <PageHeader title="Ask Alpha Inbox" subtitle="Coach or admin access is required." />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Ask Alpha Inbox" subtitle="Answer paid Ask Alpha and Ask Lee Q&A threads.">
          <button className="btn-primary toolbar-button" type="button" onClick={() => loadInbox(selectedThread?.id)}>
            <RefreshCw size={16} /> Refresh
          </button>
        </PageHeader>

        <main className="main-content">
          <section className="admin-stat-grid">
            <StatCard title="Open" value={stats.open} label="Awaiting reply" icon={<MessageSquareText size={17} />} />
            <StatCard title="Answered" value={stats.answered} label="Coach responded" icon={<CheckCircle2 size={17} />} />
            <StatCard title="Closed" value={stats.closed} label="Archived threads" icon={<Lock size={17} />} />
            <StatCard title="Total" value={stats.total} label="Ask Alpha threads" icon={<Mail size={17} />} />
          </section>

          {message ? <div className="auth-error success-message">{message}</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}

          {loading ? <section className="card text-muted">Loading Ask Alpha inbox...</section> : null}

          {!loading && sortedThreads.length === 0 ? (
            <section className="card empty-state">
              <strong>No Ask Alpha threads found</strong>
              <span className="text-muted">Verified Q&A conversations will appear here.</span>
            </section>
          ) : null}

          {!loading && sortedThreads.length > 0 ? (
            <section className="ask-alpha-inbox-layout">
              <aside className="card ask-alpha-thread-list">
                <div className="card-title">
                  <MessageSquareText size={18} /> Threads
                </div>
                {sortedThreads.map((thread) => {
                  const profile = profilesByUserId.get(thread.user_id);
                  const order = ordersById.get(thread.order_id);
                  const active = selectedThread?.id === thread.id;

                  return (
                    <button
                      className={`ask-alpha-thread-item ${active ? "active" : ""}`}
                      type="button"
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                    >
                      <strong>{thread.subject || order?.product_title || "Ask Alpha question"}</strong>
                      <span>{getProfileName(profile)}</span>
                      <span>{formatDate(thread.updated_at)}</span>
                      <span className={`status-pill ${getStatusClass(thread.status)}`}>{thread.status}</span>
                    </button>
                  );
                })}
              </aside>

              {selectedThread ? (
                <section className="card ask-alpha-conversation">
                  <div className="ask-alpha-conversation-header">
                    <div>
                      <div className="card-title">
                        <MessageSquareText size={18} /> {selectedThread.subject || "Ask Alpha question"}
                      </div>
                      <div className="ask-alpha-client-meta">
                        <span>{getProfileName(selectedProfile)}</span>
                        <span>{selectedProfile?.email || "Email unavailable"}</span>
                        <span>{selectedProfile?.phone || "Phone unavailable"}</span>
                      </div>
                    </div>
                    <div className="payment-actions">
                      <span className={`status-pill ${getStatusClass(selectedThread.status)}`}>{selectedThread.status}</span>
                      <button
                        className="btn-secondary inline-button"
                        type="button"
                        onClick={() => setThreadStatus(selectedThread, selectedThread.status === "closed" ? "open" : "closed")}
                        disabled={saving}
                      >
                        {selectedThread.status === "closed" ? <Unlock size={15} /> : <Lock size={15} />}
                        {selectedThread.status === "closed" ? "Reopen" : "Close"}
                      </button>
                    </div>
                  </div>

                  <div className="ask-alpha-order-strip">
                    <span>{selectedOrder?.product_title || "Order unavailable"}</span>
                    <span>{selectedOrder ? `${selectedOrder.question_credits} credits` : "Credits unavailable"}</span>
                    <span>{selectedOrder ? `LKR ${selectedOrder.amount_lkr.toLocaleString()}` : "Amount unavailable"}</span>
                    <span>{selectedOrder?.reference || "No reference"}</span>
                    {selectedOrder ? <span className="status-pill status-success">{selectedOrder.status}</span> : null}
                  </div>

                  <div className="ask-alpha-message-list">
                    {selectedMessages.length === 0 ? (
                      <div className="empty-state">
                        <strong>No messages yet</strong>
                        <span className="text-muted">Messages for this thread will appear here.</span>
                      </div>
                    ) : null}

                    {selectedMessages.map((threadMessage) => (
                      <article className={`ask-alpha-message ${threadMessage.sender_role === "client" ? "client" : "coach"}`} key={threadMessage.id}>
                        <div>
                          <strong>{threadMessage.sender_role === "client" ? getProfileName(selectedProfile) : threadMessage.sender_role}</strong>
                          <span>{formatDate(threadMessage.created_at)}</span>
                        </div>
                        <p>{threadMessage.body}</p>
                      </article>
                    ))}
                  </div>

                  <div className="ask-alpha-reply-box">
                    <textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      placeholder={selectedThread.status === "closed" ? "Reopen this thread before replying." : "Type your reply..."}
                      disabled={selectedThread.status === "closed"}
                    />
                    <button className="btn-primary toolbar-button" type="button" onClick={sendReply} disabled={saving || selectedThread.status === "closed"}>
                      <Send size={16} /> {saving ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}
        </main>
      </div>
    </DashboardShell>
  );
}

function StatCard({ title, value, label, icon }: { title: string; value: number; label: string; icon: React.ReactNode }) {
  return (
    <article className="card admin-stat-card">
      <div className="metric-header">
        <h4>{title}</h4>
        {icon}
      </div>
      <div className="metric-val">{value}</div>
      <span className="badge-tag">{label}</span>
    </article>
  );
}

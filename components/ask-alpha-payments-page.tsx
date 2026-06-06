"use client";

import { CheckCircle2, CreditCard, ExternalLink, RefreshCw, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { hasTrainerAccess } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";

type AskAlphaOrderStatus = "pending_verification" | "verified" | "rejected";

type AskAlphaOrder = {
  id: string;
  user_id: string;
  product_id: string | null;
  product_title: string;
  question_credits: number;
  amount_lkr: number;
  method: string | null;
  reference: string | null;
  status: AskAlphaOrderStatus;
  slip_file_name: string | null;
  slip_storage_path: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
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

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatAmount(amount: number) {
  return `LKR ${amount.toLocaleString()}`;
}

function getStatusLabel(status: AskAlphaOrderStatus) {
  return status.replace(/_/g, " ");
}

function getStatusClass(status: AskAlphaOrderStatus) {
  if (status === "verified") return "status-success";
  if (status === "rejected") return "status-danger";
  return "";
}

function normalizeSlipPath(storagePath: string) {
  const cleanPath = storagePath.replace(/^\/+/, "");
  return cleanPath.startsWith("payment-slips/") ? cleanPath.slice("payment-slips/".length) : cleanPath;
}

async function createSlipUrl(storagePath: string | null) {
  if (!storagePath) return "";
  if (/^https?:\/\//i.test(storagePath)) return storagePath;

  const { data, error } = await supabase.storage.from("payment-slips").createSignedUrl(normalizeSlipPath(storagePath), 60 * 15);
  if (error) return "";
  return data?.signedUrl ?? "";
}

async function fetchProfilesByUserIds(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, ProfileRecord>();

  const { data, error } = await supabase.from("profiles").select("id,first_name,last_name,full_name,email,phone").in("id", userIds);
  if (error) throw new Error(error.message || "Unable to load client profiles.");

  const profiles = new Map<string, ProfileRecord>();
  (data ?? []).forEach((profile) => profiles.set(profile.id, profile as ProfileRecord));
  return profiles;
}

export function AskAlphaPaymentsPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<AskAlphaOrder[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<Map<string, ProfileRecord>>(new Map());
  const [slipUrls, setSlipUrls] = useState<Map<string, string>>(new Map());
  const [selectedOrder, setSelectedOrder] = useState<AskAlphaOrder | null>(null);
  const [rejectOrder, setRejectOrder] = useState<AskAlphaOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (a.status === "pending_verification" && b.status !== "pending_verification") return -1;
      if (a.status !== "pending_verification" && b.status === "pending_verification") return 1;
      return new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime();
    });
  }, [orders]);

  const stats = useMemo(() => {
    return {
      pending: orders.filter((order) => order.status === "pending_verification").length,
      verified: orders.filter((order) => order.status === "verified").length,
      rejected: orders.filter((order) => order.status === "rejected").length,
      total: orders.length,
    };
  }, [orders]);

  async function loadOrders() {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase.from("ask_alpha_orders").select("*").order("submitted_at", { ascending: false });

    if (loadError) {
      setOrders([]);
      setError(loadError.message || "Unable to load Ask Alpha orders.");
      setLoading(false);
      return;
    }

    const nextOrders = (data ?? []) as AskAlphaOrder[];
    setOrders(nextOrders);

    try {
      const userIds = Array.from(new Set(nextOrders.map((order) => order.user_id).filter(Boolean)));
      setProfilesByUserId(await fetchProfilesByUserIds(userIds));

      const signedUrls = await Promise.all(nextOrders.map(async (order) => [order.id, await createSlipUrl(order.slip_storage_path)] as const));
      setSlipUrls(new Map(signedUrls));
    } catch (loadRelatedError) {
      setError(loadRelatedError instanceof Error ? loadRelatedError.message : "Unable to load order details.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOrder(order: AskAlphaOrder) {
    if (!user) return;

    setSavingId(order.id);
    setError("");
    setMessage("");

    const { data, error: verifyError } = await supabase
      .from("ask_alpha_orders")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: user.id,
        rejection_reason: null,
      })
      .eq("id", order.id)
      .select("*")
      .maybeSingle();

    if (verifyError || !data) {
      setError(verifyError?.message || "Supabase did not update this Ask Alpha order.");
    } else {
      setOrders((current) => current.map((currentOrder) => (currentOrder.id === order.id ? (data as AskAlphaOrder) : currentOrder)));
      setSelectedOrder(null);
      setMessage("Ask Alpha payment marked as verified.");
    }

    setSavingId(null);
  }

  async function rejectSelectedOrder() {
    if (!rejectOrder) return;
    const reason = rejectionReason.trim();

    if (!reason) {
      setError("Enter a rejection reason before rejecting this Ask Alpha payment.");
      return;
    }

    setSavingId(rejectOrder.id);
    setError("");
    setMessage("");

    const { data, error: rejectError } = await supabase
      .from("ask_alpha_orders")
      .update({
        status: "rejected",
        verified_at: null,
        verified_by: null,
        rejection_reason: reason,
      })
      .eq("id", rejectOrder.id)
      .select("*")
      .maybeSingle();

    if (rejectError || !data) {
      setError(rejectError?.message || "Supabase did not update this Ask Alpha order.");
    } else {
      setOrders((current) => current.map((currentOrder) => (currentOrder.id === rejectOrder.id ? (data as AskAlphaOrder) : currentOrder)));
      setRejectOrder(null);
      setRejectionReason("");
      setSelectedOrder(null);
      setMessage("Ask Alpha payment rejected.");
    }

    setSavingId(null);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  if (user && !hasTrainerAccess(user.role)) {
    return (
      <DashboardShell>
        <div className="dashboard-container">
          <PageHeader title="Ask Alpha Payments" subtitle="Coach or admin access is required." />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Ask Alpha Payments" subtitle="Verify paid Ask Alpha and Ask Lee Q&A submissions.">
          <button className="btn-primary toolbar-button" type="button" onClick={loadOrders}>
            <RefreshCw size={16} /> Refresh
          </button>
        </PageHeader>

        <main className="main-content">
          <section className="admin-stat-grid">
            <StatCard title="Pending" value={stats.pending} label="Needs verification" icon={<CreditCard size={17} />} />
            <StatCard title="Verified" value={stats.verified} label="Ready for replies" icon={<CheckCircle2 size={17} />} />
            <StatCard title="Rejected" value={stats.rejected} label="Returned to client" icon={<XCircle size={17} />} />
            <StatCard title="Total" value={stats.total} label="Ask Alpha orders" icon={<CreditCard size={17} />} />
          </section>

          {message ? <div className="auth-error success-message">{message}</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}

          <section className="card">
            <div className="card-title">
              <CreditCard size={18} /> Ask Alpha orders
            </div>

            {loading ? <div className="text-muted">Loading Ask Alpha payments...</div> : null}

            {!loading && sortedOrders.length === 0 ? (
              <div className="empty-state">
                <strong>No Ask Alpha orders found</strong>
                <span className="text-muted">Paid Q&A submissions will appear here for verification.</span>
              </div>
            ) : null}

            {!loading && sortedOrders.length > 0 ? (
              <div className="payments-table">
                {sortedOrders.map((order) => {
                  const profile = profilesByUserId.get(order.user_id);
                  const slipUrl = slipUrls.get(order.id) ?? "";

                  return (
                    <article className="payment-row ask-alpha-payment-row" key={order.id}>
                      <div>
                        <strong>{getProfileName(profile)}</strong>
                        <span>{profile?.email || "Email unavailable"}</span>
                        <span>{profile?.phone || "Phone unavailable"}</span>
                      </div>
                      <div>
                        <strong>{order.product_title}</strong>
                        <span>
                          {order.question_credits} credits - {formatAmount(order.amount_lkr)}
                        </span>
                        <span>{formatDate(order.submitted_at)}</span>
                      </div>
                      <span className={`status-pill ${getStatusClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                      <div className="payment-actions">
                        {slipUrl ? (
                          <a className="btn-secondary link-button inline-button" href={slipUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={15} /> View Slip
                          </a>
                        ) : (
                          <span className="text-muted">{order.slip_file_name || "No slip URL"}</span>
                        )}
                        <button className="btn-primary compact-button" type="button" onClick={() => setSelectedOrder(order)}>
                          Review
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        </main>
      </div>

      {selectedOrder ? (
        <AskAlphaPaymentReviewModal
          order={selectedOrder}
          profile={profilesByUserId.get(selectedOrder.user_id)}
          slipUrl={slipUrls.get(selectedOrder.id) ?? ""}
          saving={savingId === selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
          onVerify={() => verifyOrder(selectedOrder)}
          onReject={() => {
            setRejectionReason(selectedOrder.rejection_reason ?? "");
            setRejectOrder(selectedOrder);
          }}
        />
      ) : null}

      {rejectOrder ? (
        <div className="modal-overlay active payment-review-overlay">
          <div className="modal-content ask-alpha-reject-modal">
            <div className="modal-header">
              <div>
                <h2>Reject Ask Alpha Payment</h2>
                <p className="text-muted">{rejectOrder.reference || "No reference"}</p>
              </div>
              <button className="close-modal icon-btn" type="button" onClick={() => setRejectOrder(null)} aria-label="Close rejection dialog">
                <X size={20} />
              </button>
            </div>
            <div className="modal-form">
              <label className="form-group">
                <span>Rejection reason</span>
                <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Explain why this slip cannot be verified." />
              </label>
              <div className="modal-footer">
                <button className="btn-secondary" type="button" onClick={() => setRejectOrder(null)}>
                  Cancel
                </button>
                <button className="btn-primary" type="button" onClick={rejectSelectedOrder} disabled={savingId === rejectOrder.id}>
                  {savingId === rejectOrder.id ? "Rejecting..." : "Reject Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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

function AskAlphaPaymentReviewModal({
  order,
  profile,
  slipUrl,
  saving,
  onClose,
  onVerify,
  onReject,
}: {
  order: AskAlphaOrder;
  profile?: ProfileRecord;
  slipUrl: string;
  saving: boolean;
  onClose: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  const isImage = /\.(png|jpe?g|webp|gif)($|\?)/i.test(slipUrl);
  const isPdf = /\.pdf($|\?)/i.test(slipUrl);

  return (
    <div className="modal-overlay active payment-review-overlay">
      <div className="modal-content payment-review-modal">
        <div className="modal-header">
          <div>
            <h2>Review Ask Alpha Payment</h2>
            <p className="text-muted">{order.reference || "No reference"}</p>
          </div>
          <button className="close-modal icon-btn" type="button" onClick={onClose} aria-label="Close payment review">
            <X size={20} />
          </button>
        </div>

        <div className="payment-review-body">
          <section className="payment-slip-preview">
            {slipUrl && isImage ? <img src={slipUrl} alt="Payment slip preview" /> : null}
            {slipUrl && isPdf ? <iframe src={slipUrl} title="Payment slip preview" /> : null}
            {slipUrl && !isImage && !isPdf ? (
              <div className="payment-preview-empty">
                <CreditCard size={32} />
                <span>This slip type cannot be previewed inline.</span>
                <a className="btn-secondary link-button inline-button" href={slipUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} /> Open Slip
                </a>
              </div>
            ) : null}
            {!slipUrl ? (
              <div className="payment-preview-empty">
                <CreditCard size={32} />
                <span>No accessible slip URL found.</span>
                <small>{order.slip_file_name || order.slip_storage_path || "No file path"}</small>
              </div>
            ) : null}
          </section>

          <section className="payment-review-details">
            <Detail label="Name" value={getProfileName(profile)} />
            <Detail label="Email" value={profile?.email || "Email unavailable"} />
            <Detail label="Phone" value={profile?.phone || "Phone unavailable"} />
            <Detail label="Product" value={order.product_title} />
            <Detail label="Credits" value={String(order.question_credits)} />
            <Detail label="Amount" value={formatAmount(order.amount_lkr)} />
            <Detail label="Method" value={order.method || "Not provided"} />
            <Detail label="Reference" value={order.reference || "Not provided"} />
            <Detail label="Slip File" value={order.slip_file_name || "Not provided"} />
            <Detail label="Submitted" value={formatDate(order.submitted_at)} />
            <Detail label="Status" value={getStatusLabel(order.status)} />
            {order.rejection_reason ? <Detail label="Rejection" value={order.rejection_reason} /> : null}

            <div className="payment-review-actions">
              {slipUrl ? (
                <a className="btn-secondary link-button inline-button" href={slipUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} /> Open Original
                </a>
              ) : null}
              <button className="btn-secondary toolbar-button" type="button" onClick={onReject} disabled={saving}>
                <XCircle size={16} /> Reject
              </button>
              <button className="btn-primary toolbar-button" type="button" onClick={onVerify} disabled={order.status === "verified" || saving}>
                <CheckCircle2 size={16} /> {saving ? "Verifying..." : order.status === "verified" ? "Verified" : "Verify"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="payment-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

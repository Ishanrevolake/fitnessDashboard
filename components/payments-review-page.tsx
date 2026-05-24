"use client";

import { CheckCircle2, CreditCard, ExternalLink, RefreshCw, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { TabNavigation } from "@/components/tab-navigation";
import { hasTrainerAccess } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";

type PaymentRecord = Record<string, unknown> & {
  id?: string | number;
};

type ProfileRecord = Record<string, unknown> & {
  id?: string;
  user_id?: string;
};

type PackageSelectionRecord = Record<string, unknown> & {
  id?: string;
  user_id?: string;
};

const storageBucketCandidates = ["payment-slips", "payment_slips", "payments", "slips", "receipts"];
const profileTableCandidates = ["user_profiles", "users", "customers", "clients"];
const packageSelectionTableCandidates = ["package_selections", "package_selection", "user_package_selections", "selected_packages"];

function getText(payment: PaymentRecord, keys: string[], fallback = "Not provided") {
  for (const key of keys) {
    const value = payment[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "Verified" : "Pending";
  }

  return fallback;
}

function getDateText(payment: PaymentRecord) {
  const value = getText(payment, ["submitted_at", "verified_at", "created_at", "inserted_at", "paid_at"], "");
  if (!value) return "Date unavailable";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getPaymentTimestamp(payment: PaymentRecord) {
  const value = getText(payment, ["submitted_at", "created_at", "inserted_at", "paid_at", "updated_at"], "");
  if (!value) return 0;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getStatus(payment: PaymentRecord) {
  return getText(payment, ["status", "payment_status"], "pending").toLowerCase();
}

function getAmountText(payment: PaymentRecord) {
  const value = payment.amount_lkr ?? payment.amount ?? payment.total ?? payment.price ?? payment.payment_amount;
  if (typeof value === "number") return `LKR ${value.toLocaleString()}`;
  if (typeof value === "string" && value.trim()) return `LKR ${value}`;
  return "Amount unavailable";
}

function getUserId(payment: PaymentRecord) {
  return getText(payment, ["user_id"], "");
}

function getPackageSelectionId(payment: PaymentRecord) {
  return getText(payment, ["package_selection_id"], "");
}

function getProfileName(profile?: ProfileRecord) {
  if (!profile) return "";
  const firstName = getText(profile, ["first_name"], "");
  const lastName = getText(profile, ["last_name"], "");
  const combinedName = `${firstName} ${lastName}`.trim();

  return getText(profile, ["full_name", "name", "display_name", "customer_name", "client_name"], combinedName);
}

function getProfileEmail(profile?: ProfileRecord) {
  if (!profile) return "";
  return getText(profile, ["email", "user_email", "customer_email"], "");
}

function getPaymentName(
  payment: PaymentRecord,
  profilesByUserId: Map<string, ProfileRecord>,
  packageSelectionsById = new Map<string, PackageSelectionRecord>(),
) {
  const directName = getText(payment, ["client_name", "full_name", "name", "user_name", "customer_name"], "");
  if (directName) return directName;

  const packageSelection = packageSelectionsById.get(getPackageSelectionId(payment));
  const packageSelectionName = getProfileName(packageSelection);
  if (packageSelectionName) return packageSelectionName;

  const userId = getUserId(payment);
  const profileName = getProfileName(profilesByUserId.get(userId));
  return profileName || "Name unavailable";
}

function getPaymentEmail(
  payment: PaymentRecord,
  profilesByUserId: Map<string, ProfileRecord>,
  packageSelectionsById = new Map<string, PackageSelectionRecord>(),
) {
  const directEmail = getText(payment, ["email", "user_email", "customer_email"], "");
  if (directEmail) return directEmail;

  const packageSelection = packageSelectionsById.get(getPackageSelectionId(payment));
  const packageSelectionEmail = getProfileEmail(packageSelection);
  if (packageSelectionEmail) return packageSelectionEmail;

  const userId = getUserId(payment);
  const profileEmail = getProfileEmail(profilesByUserId.get(userId));
  return profileEmail || "Email unavailable";
}

function getPackageName(payment: PaymentRecord, packageSelectionsById: Map<string, PackageSelectionRecord>) {
  const directPackageName = getText(payment, ["package_name", "package_label", "package_title", "plan_name"], "");
  if (directPackageName) return directPackageName;

  const packageSelection = packageSelectionsById.get(getPackageSelectionId(payment));
  if (!packageSelection) return "Package unavailable";

  const packageName = getText(packageSelection, ["package_name", "package_label", "package_title", "plan_name", "name", "title"], "");
  if (packageName) return packageName;

  const nestedPackage = packageSelection.package;
  if (nestedPackage && typeof nestedPackage === "object") {
    return getText(nestedPackage as PackageSelectionRecord, ["name", "title", "label"], "Package unavailable");
  }

  return "Package unavailable";
}

function parseStoragePath(storagePath: string) {
  const cleanPath = storagePath.replace(/^\/+/, "");
  const [firstSegment, ...rest] = cleanPath.split("/");

  if (firstSegment && rest.length > 0 && storageBucketCandidates.includes(firstSegment)) {
    return { bucket: firstSegment, path: rest.join("/") };
  }

  return { bucket: "", path: cleanPath };
}

async function getSlipUrl(payment: PaymentRecord) {
  const directUrl = getText(payment, ["slip_url", "payment_slip_url", "receipt_url", "image_url", "screenshot_url", "file_url"], "");
  if (directUrl) return directUrl;

  const storagePath = getText(payment, ["slip_storage_path"], "");
  if (!storagePath) return "";
  if (/^https?:\/\//i.test(storagePath)) return storagePath;

  const parsed = parseStoragePath(storagePath);
  const bucketCandidates = parsed.bucket ? [parsed.bucket] : storageBucketCandidates;

  for (const bucket of bucketCandidates) {
    const publicUrl = supabase.storage.from(bucket).getPublicUrl(parsed.path).data.publicUrl;
    const signed = await supabase.storage.from(bucket).createSignedUrl(parsed.path, 60 * 10);

    if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;
    if (publicUrl) return publicUrl;
  }

  return "";
}

async function updatePaymentAsVerified(paymentId: string | number, userId: string) {
  const verifiedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("payments")
    .update({ status: "verified", verified_at: verifiedAt, verified_by: userId })
    .eq("id", paymentId)
    .select("id,status,verified_at,verified_by")
    .maybeSingle();

  if (error) throw new Error(error.message || "Unable to verify payment.");

  if (!data) {
    throw new Error(
      "Supabase did not update this payment. This is usually caused by Row Level Security blocking updates on the payments table.",
    );
  }

  return data as PaymentRecord;
}

async function fetchProfilesByUserIds(userIds: string[]) {
  const nextProfiles = new Map<string, ProfileRecord>();

  const { data: profiles } = await supabase.from("profiles").select("id,first_name,last_name,full_name,email,phone").in("id", userIds);

  (profiles ?? []).forEach((profile) => {
    const typedProfile = profile as ProfileRecord;
    if (typedProfile.id) nextProfiles.set(typedProfile.id, typedProfile);
  });

  if (nextProfiles.size === userIds.length) return nextProfiles;

  for (const table of profileTableCandidates) {
    const [{ data: idProfiles }, { data: userIdProfiles }] = await Promise.all([
      supabase.from(table).select("*").in("id", userIds),
      supabase.from(table).select("*").in("user_id", userIds),
    ]);

    [...(idProfiles ?? []), ...(userIdProfiles ?? [])].forEach((profile) => {
      const typedProfile = profile as ProfileRecord;
      const profileUserId = typedProfile.user_id ?? typedProfile.id;
      if (profileUserId && !nextProfiles.has(profileUserId)) nextProfiles.set(profileUserId, typedProfile);
    });
  }

  return nextProfiles;
}

async function fetchPackageSelectionsByIds(selectionIds: string[]) {
  const nextPackageSelections = new Map<string, PackageSelectionRecord>();

  for (const table of packageSelectionTableCandidates) {
    const { data } = await supabase.from(table).select("*").in("id", selectionIds);

    (data ?? []).forEach((selection) => {
      const typedSelection = selection as PackageSelectionRecord;
      if (typedSelection.id && !nextPackageSelections.has(typedSelection.id)) {
        nextPackageSelections.set(typedSelection.id, typedSelection);
      }
    });

    if (nextPackageSelections.size > 0) break;
  }

  return nextPackageSelections;
}

export function PaymentsReviewPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<Map<string, ProfileRecord>>(new Map());
  const [packageSelectionsById, setPackageSelectionsById] = useState<Map<string, PackageSelectionRecord>>(new Map());
  const [slipUrls, setSlipUrls] = useState<Map<string | number, string>>(new Map());
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const verified = payments.filter((payment) => getStatus(payment) === "verified").length;
    const pending = payments.length - verified;

    return { pending, verified, total: payments.length };
  }, [payments]);

  async function loadPayments() {
    setLoading(true);
    setError("");

    const orderedQueries = ["created_at", "submitted_at", "inserted_at", "paid_at", "updated_at"].map((column) =>
      supabase.from("payments").select("*").order(column, { ascending: false }),
    );

    let data: PaymentRecord[] | null = null;
    let loadErrorMessage = "";

    for (const query of orderedQueries) {
      const { data: queryData, error: queryError } = await query;

      if (!queryError) {
        data = (queryData ?? []) as PaymentRecord[];
        loadErrorMessage = "";
        break;
      }

      loadErrorMessage = queryError.message;
    }

    if (!data) {
      const { data: unorderedData, error: unorderedError } = await supabase.from("payments").select("*");

      if (unorderedError) {
        loadErrorMessage = unorderedError.message;
      } else {
        data = (unorderedData ?? []) as PaymentRecord[];
        loadErrorMessage = "";
      }
    }

    if (loadErrorMessage) {
      setError(loadErrorMessage);
      setPayments([]);
      setLoading(false);
      return;
    }

    const nextPayments = [...(data ?? [])].sort((a, b) => getPaymentTimestamp(b) - getPaymentTimestamp(a));
    setPayments(nextPayments);

    const userIds = Array.from(new Set(nextPayments.map(getUserId).filter(Boolean)));
    setProfilesByUserId(userIds.length > 0 ? await fetchProfilesByUserIds(userIds) : new Map());

    const packageSelectionIds = Array.from(new Set(nextPayments.map(getPackageSelectionId).filter(Boolean)));
    setPackageSelectionsById(packageSelectionIds.length > 0 ? await fetchPackageSelectionsByIds(packageSelectionIds) : new Map());

    const resolvedUrls = await Promise.all(
      nextPayments.map(async (payment) => {
        if (!payment.id) return null;
        return [payment.id, await getSlipUrl(payment)] as const;
      }),
    );
    const nextSlipUrls = new Map<string | number, string>();
    resolvedUrls.forEach((entry) => {
      if (entry) nextSlipUrls.set(entry[0], entry[1]);
    });
    setSlipUrls(nextSlipUrls);
    setLoading(false);
  }

  async function verifyPayment(payment: PaymentRecord) {
    if (!payment.id || !user) return;

    setVerifyingId(payment.id);
    setError("");
    setMessage("");

    try {
      const verifiedPayment = await updatePaymentAsVerified(payment.id, user.id);
      setPayments((currentPayments) =>
        currentPayments.map((currentPayment) => (currentPayment.id === payment.id ? { ...currentPayment, ...verifiedPayment } : currentPayment)),
      );
      setMessage("Payment marked as verified.");
      setSelectedPayment(null);
      await loadPayments();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify payment.");
    } finally {
      setVerifyingId(null);
    }
  }

  function openReview(payment: PaymentRecord) {
    setSelectedPayment(payment);
    setError("");
    setMessage("");
  }

  useEffect(() => {
    loadPayments();
  }, []);

  if (user && !hasTrainerAccess(user.role)) {
    return (
      <DashboardShell>
        <div className="dashboard-container">
          <PageHeader title="Payment Slips" subtitle="Trainer access is required." />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="dashboard-container">
        <PageHeader title="Payment Slips" subtitle="Review submitted payment slips and verify approved payments.">
          <button className="btn-primary toolbar-button" type="button" onClick={loadPayments}>
            <RefreshCw size={16} /> Refresh
          </button>
        </PageHeader>
        <TabNavigation label="Submitted Payments" />

        <main className="main-content">
          <section className="admin-stat-grid">
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Pending review</h4>
                <CreditCard size={17} />
              </div>
              <div className="metric-val">{stats.pending}</div>
              <span className="badge-tag">Needs trainer action</span>
            </article>
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Verified</h4>
                <CheckCircle2 size={17} />
              </div>
              <div className="metric-val">{stats.verified}</div>
              <span className="badge-tag">Approved payments</span>
            </article>
            <article className="card admin-stat-card">
              <div className="metric-header">
                <h4>Total submissions</h4>
                <CreditCard size={17} />
              </div>
              <div className="metric-val">{stats.total}</div>
              <span className="badge-tag">From payments table</span>
            </article>
          </section>

          {message ? <div className="auth-error success-message">{message}</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}

          <section className="card">
            <div className="card-title">
              <CreditCard size={18} /> Submitted slips
            </div>

            {loading ? <div className="text-muted">Loading payments...</div> : null}

            {!loading && payments.length === 0 ? (
              <div className="empty-state">
                <strong>No submitted payments found</strong>
                <span className="text-muted">When users submit payment slips, they will appear here.</span>
              </div>
            ) : null}

            {!loading && payments.length > 0 ? (
              <div className="payments-table">
                {payments.map((payment) => {
                  const status = getStatus(payment);
                  const slipUrl = payment.id ? slipUrls.get(payment.id) ?? "" : "";

                  return (
                    <article className="payment-row" key={String(payment.id ?? JSON.stringify(payment))}>
                      <div>
                        <strong>{getPaymentName(payment, profilesByUserId, packageSelectionsById)}</strong>
                        <span>{getPaymentEmail(payment, profilesByUserId, packageSelectionsById)}</span>
                      </div>
                      <div>
                        <strong>{getAmountText(payment)}</strong>
                        <span>{getDateText(payment)}</span>
                      </div>
                      <span className={`status-pill ${status === "verified" ? "status-success" : ""}`}>{status}</span>
                      <div className="payment-actions">
                        {slipUrl ? (
                          <a className="btn-secondary link-button inline-button" href={slipUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={15} /> View Slip
                          </a>
                        ) : (
                          <span className="text-muted">{getText(payment, ["slip_file_name"], "No slip URL")}</span>
                        )}
                        <button
                          className="btn-primary compact-button"
                          type="button"
                          onClick={() => openReview(payment)}
                          disabled={status === "verified" || verifyingId === payment.id}
                        >
                          {status === "verified" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                          {status === "verified" ? "Verified" : "Review"}
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

      {selectedPayment ? (
        <PaymentReviewModal
          payment={selectedPayment}
          profile={profilesByUserId.get(getUserId(selectedPayment))}
          packageSelectionsById={packageSelectionsById}
          slipUrl={selectedPayment.id ? slipUrls.get(selectedPayment.id) ?? "" : ""}
          verifying={verifyingId === selectedPayment.id}
          onClose={() => setSelectedPayment(null)}
          onVerify={() => verifyPayment(selectedPayment)}
        />
      ) : null}
    </DashboardShell>
  );
}

function PaymentReviewModal({
  payment,
  profile,
  packageSelectionsById,
  slipUrl,
  verifying,
  onClose,
  onVerify,
}: {
  payment: PaymentRecord;
  profile?: ProfileRecord;
  packageSelectionsById: Map<string, PackageSelectionRecord>;
  slipUrl: string;
  verifying: boolean;
  onClose: () => void;
  onVerify: () => void;
}) {
  const status = getStatus(payment);
  const isImage = /\.(png|jpe?g|webp|gif)$/i.test(slipUrl);
  const isPdf = /\.pdf($|\?)/i.test(slipUrl);

  return (
    <div className="modal-overlay active payment-review-overlay">
      <div className="modal-content payment-review-modal">
        <div className="modal-header">
          <div>
            <h2>Review Payment Slip</h2>
            <p className="text-muted">{getText(payment, ["reference"], "No reference")}</p>
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
                <small>{getText(payment, ["slip_file_name", "slip_storage_path"], "No file path")}</small>
              </div>
            ) : null}
          </section>

          <section className="payment-review-details">
            <Detail label="Name" value={getPaymentName(payment, new Map([[getUserId(payment), profile ?? {}]]), packageSelectionsById)} />
            <Detail label="Email" value={getPaymentEmail(payment, new Map([[getUserId(payment), profile ?? {}]]), packageSelectionsById)} />
            <Detail label="Amount" value={getAmountText(payment)} />
            <Detail label="Package" value={getPackageName(payment, packageSelectionsById)} />
            <Detail label="Method" value={getText(payment, ["method"])} />
            <Detail label="Reference" value={getText(payment, ["reference"])} />
            <Detail label="Slip File" value={getText(payment, ["slip_file_name"])} />
            <Detail label="Submitted" value={getDateText(payment)} />
            <Detail label="Status" value={status} />

            <div className="payment-review-actions">
              {slipUrl ? (
                <a className="btn-secondary link-button inline-button" href={slipUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} /> Open Original
                </a>
              ) : null}
              <button className="btn-primary toolbar-button" type="button" onClick={onVerify} disabled={status === "verified" || verifying}>
                <CheckCircle2 size={16} /> {verifying ? "Verifying..." : status === "verified" ? "Verified" : "Verify Payment"}
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

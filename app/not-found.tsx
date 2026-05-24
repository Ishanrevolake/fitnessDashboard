import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main-content" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <section className="card" style={{ maxWidth: 420 }}>
        <h1 style={{ marginBottom: 12 }}>Page not found</h1>
        <p className="text-muted">This dashboard section does not exist yet.</p>
        <Link href="/" className="btn-view-profile" style={{ marginTop: 20 }}>
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}

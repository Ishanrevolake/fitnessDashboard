"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type AuthPageProps = {
  mode: "login" | "signup";
};

export function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();
  const { user, loading, signIn, signUp } = useAuth();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("AlphaFitness");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isLogin = mode === "login";

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isLogin) {
        await signIn(email, password, remember);
      } else {
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          setSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setSubmitting(false);
          return;
        }

        await signUp({ name, email, businessName, password }, remember);
      }

      router.replace("/");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          <div className="brand-logo">A</div>
          <span>AlphaFitness</span>
        </Link>

        <div className="auth-heading">
          <h1>{isLogin ? "Welcome back" : "Create your trainer account"}</h1>
          <p>{isLogin ? "Sign in to manage clients, programs, and meal plans." : "Set up your workspace and start building your coaching dashboard."}</p>
        </div>

        <form className="auth-form" onSubmit={submitForm}>
          {!isLogin ? (
            <>
              <label className="auth-field">
                <span>Full Name</span>
                <div className="auth-input">
                  <UserRound size={18} />
                  <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Alex Trainer" />
                </div>
              </label>

              <label className="auth-field">
                <span>Business Name</span>
                <div className="auth-input">
                  <UserRound size={18} />
                  <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} required placeholder="AlphaFitness" />
                </div>
              </label>
            </>
          ) : null}

          <label className="auth-field">
            <span>Email Address</span>
            <div className="auth-input">
              <Mail size={18} />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="trainer@example.com" />
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-input">
              <Lock size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="Enter password"
              />
              <button className="auth-visibility" type="button" onClick={() => setShowPassword((current) => !current)} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {!isLogin ? (
            <label className="auth-field">
              <span>Confirm Password</span>
              <div className="auth-input">
                <Lock size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  placeholder="Repeat password"
                />
              </div>
            </label>
          ) : null}

          <div className="auth-options">
            <label className="remember-option">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              <span>Remember me</span>
            </label>
            {isLogin ? <Link href="/signup">Create account</Link> : <Link href="/login">Sign in instead</Link>}
          </div>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>
      </section>

      <section className="auth-aside">
        <div className="auth-aside-content">
          <div className="auth-stat">
            <strong>45</strong>
            <span>active clients tracked</span>
          </div>
          <div className="auth-stat">
            <strong>8</strong>
            <span>check-ins ready today</span>
          </div>
          <div className="auth-stat">
            <strong>3</strong>
            <span>new programs this week</span>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { FormEvent, useMemo, useState } from "react";
import type { SessionUser } from "@/lib/state/session-store";
import type { WaiAgentsApi } from "@/lib/api";
import type { SessionTokens } from "@/lib/types";

type AuthViewProps = {
  api: WaiAgentsApi;
  onAuthenticated: (payload: { user: SessionUser; tokens: SessionTokens }) => void;
};

type AuthMode = "login" | "register";
type LoginMethod = "password" | "magic-link";
type MagicLinkStep = "request" | "verify";

type PasswordStrength = "very-weak" | "weak" | "fair" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 6) return "very-weak";
  if (password.length < 8) return "weak";
  if (password.length < 12) return "fair";

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const mixCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;

  if (mixCount >= 3) return "strong";
  return "fair";
}

const strengthConfig: Record<PasswordStrength, { label: string; bars: number; color: string }> = {
  "very-weak": { label: "Very Weak", bars: 1, color: "var(--color-error)" },
  weak: { label: "Weak", bars: 2, color: "var(--color-warning)" },
  fair: { label: "Fair", bars: 3, color: "#d4b400" },
  strong: { label: "Strong", bars: 4, color: "var(--color-success)" },
};

export function AuthView({ api, onAuthenticated }: AuthViewProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
  const [magicLinkStep, setMagicLinkStep] = useState<MagicLinkStep>("request");

  // Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Magic link fields
  const [magicToken, setMagicToken] = useState("");

  // State
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  const registerValid =
    displayName.trim().length > 0 &&
    username.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword;

  const onSubmitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (loginMethod === "magic-link") {
        if (magicLinkStep === "request") {
          await api.requestMagicLink(email);
          setMagicLinkStep("verify");
          return;
        }
        // verify step
        const response = await api.verifyMagicLink(magicToken.trim());
        onAuthenticated({ user: toSessionUser(response.user), tokens: response.tokens });
        return;
      }

      // password login
      const response = await api.login({ email, password });
      onAuthenticated({ user: toSessionUser(response.user), tokens: response.tokens });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const onSubmitRegister = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await api.register({ username: username.trim(), email, password, display_name: displayName.trim() || undefined });
      onAuthenticated({ user: toSessionUser(response.user), tokens: response.tokens });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError(null);
  };

  const switchLoginMethod = (method: LoginMethod) => {
    setLoginMethod(method);
    setMagicLinkStep("request");
    setError(null);
  };

  return (
    <section className="auth-card" aria-label="auth-panel" style={cardStyle}>
      {/* Mode tabs: Login / Register */}
      <div style={modeTabsContainerStyle}>
        <button
          type="button"
          onClick={() => switchMode("login")}
          style={authMode === "login" ? modeTabActiveStyle : modeTabStyle}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          style={authMode === "register" ? modeTabActiveStyle : modeTabStyle}
        >
          Register
        </button>
      </div>

      {/* ---- LOGIN ---- */}
      {authMode === "login" && (
        <>
          {/* Sub-mode: Password vs Magic Link */}
          <div style={segmentedControlContainer}>
            <button
              type="button"
              onClick={() => switchLoginMethod("password")}
              style={loginMethod === "password" ? segmentActiveStyle : segmentStyle}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => switchLoginMethod("magic-link")}
              style={loginMethod === "magic-link" ? segmentActiveStyle : segmentStyle}
            >
              Magic Link
            </button>
          </div>

          {loginMethod === "password" && (
            <form onSubmit={onSubmitLogin} style={formStyle}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  style={inputStyle}
                  placeholder="you@example.com"
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={inputStyle}
                  placeholder="Enter your password"
                />
              </label>

              {error && <p style={errorTextStyle}>{error}</p>}

              <button type="submit" disabled={pending} style={primaryButtonStyle}>
                {pending ? "Logging in..." : "Log In"}
              </button>
            </form>
          )}

          {loginMethod === "magic-link" && (
            <form onSubmit={onSubmitLogin} style={formStyle}>
              {magicLinkStep === "request" && (
                <>
                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      style={inputStyle}
                      placeholder="you@example.com"
                    />
                  </label>

                  {error && <p style={errorTextStyle}>{error}</p>}

                  <button type="submit" disabled={pending} style={primaryButtonStyle}>
                    {pending ? "Sending..." : "Send Magic Link"}
                  </button>
                </>
              )}

              {magicLinkStep === "verify" && (
                <>
                  <div style={successBoxStyle}>
                    <p style={successTitleStyle}>Check your email!</p>
                    <p style={successDescStyle}>
                      We sent a magic link to <strong>{email}</strong>. Click the link in the email, or paste the
                      token below.
                    </p>
                  </div>

                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Token</span>
                    <input
                      type="text"
                      value={magicToken}
                      onChange={(e) => setMagicToken(e.target.value)}
                      required
                      style={inputStyle}
                      placeholder="Paste token from email"
                      autoComplete="one-time-code"
                    />
                  </label>

                  {error && <p style={errorTextStyle}>{error}</p>}

                  <button type="submit" disabled={pending || magicToken.trim().length === 0} style={primaryButtonStyle}>
                    {pending ? "Verifying..." : "Verify Token"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMagicLinkStep("request");
                      setMagicToken("");
                      setError(null);
                    }}
                    style={linkButtonStyle}
                  >
                    Use a different email
                  </button>
                </>
              )}
            </form>
          )}
        </>
      )}

      {/* ---- REGISTER ---- */}
      {authMode === "register" && (
        <form onSubmit={onSubmitRegister} style={formStyle}>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Display Name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
              style={inputStyle}
              placeholder="Your name"
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={inputStyle}
              placeholder="Choose a username"
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
              placeholder="you@example.com"
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={inputStyle}
              placeholder="Create a password"
            />
            {password.length > 0 && (
              <div style={strengthContainerStyle}>
                <div style={strengthBarsStyle}>
                  {[0, 1, 2, 3].map((i) => {
                    const cfg = strengthConfig[passwordStrength];
                    const filled = i < cfg.bars;
                    return (
                      <div
                        key={i}
                        style={{
                          ...strengthBarStyle,
                          background: filled ? cfg.color : "var(--color-border-primary)",
                        }}
                      />
                    );
                  })}
                </div>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: strengthConfig[passwordStrength].color,
                    fontWeight: "var(--weight-medium)" as unknown as number,
                  }}
                >
                  {strengthConfig[passwordStrength].label}
                </span>
              </div>
            )}
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={inputStyle}
              placeholder="Re-enter your password"
            />
            {!passwordsMatch && (
              <span style={mismatchStyle}>Passwords do not match</span>
            )}
          </label>

          {error && <p style={errorTextStyle}>{error}</p>}

          <button type="submit" disabled={pending || !registerValid} style={primaryButtonStyle}>
            {pending ? "Creating account..." : "Create Account"}
          </button>
        </form>
      )}
    </section>
  );
}

// ---- Helpers ----

function toSessionUser(user: {
  id: string;
  username: string;
  display_name: string | null;
  email?: string;
  avatar_url: string | null;
  bio: string | null;
}): SessionUser {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    email: user.email,
    avatar_url: user.avatar_url,
    bio: user.bio,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Request failed";
}

// ---- Styles ----

const cardStyle: React.CSSProperties = {
  maxWidth: 420,
  width: "100%",
  padding: "var(--space-6)",
  display: "grid",
  gap: "var(--space-5)",
};

const modeTabsContainerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 0,
  borderRadius: "var(--radius-lg)",
  overflow: "hidden",
  border: "1px solid var(--color-border-primary)",
};

const modeTabBase: React.CSSProperties = {
  padding: "var(--space-3) var(--space-4)",
  fontSize: "var(--text-base)",
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  borderRadius: 0,
  transition: "background var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default)",
};

const modeTabStyle: React.CSSProperties = {
  ...modeTabBase,
  background: "var(--color-bg-secondary)",
  color: "var(--color-text-secondary)",
};

const modeTabActiveStyle: React.CSSProperties = {
  ...modeTabBase,
  background: "var(--color-accent-primary)",
  color: "#fff",
};

const segmentedControlContainer: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 0,
  borderRadius: "var(--radius-md)",
  overflow: "hidden",
  border: "1px solid var(--color-border-primary)",
};

const segmentBase: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  fontSize: "var(--text-sm)",
  fontWeight: 500,
  cursor: "pointer",
  border: "none",
  borderRadius: 0,
  transition: "background var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default)",
};

const segmentStyle: React.CSSProperties = {
  ...segmentBase,
  background: "var(--color-bg-secondary)",
  color: "var(--color-text-secondary)",
};

const segmentActiveStyle: React.CSSProperties = {
  ...segmentBase,
  background: "var(--color-accent-subtle)",
  color: "var(--color-accent-primary)",
  fontWeight: 600,
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-4)",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--space-2)",
  fontSize: "var(--text-base)",
};

const labelTextStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  fontWeight: 500,
  color: "var(--color-text-secondary)",
};

const inputStyle: React.CSSProperties = {
  height: 48,
  padding: "0 var(--space-4)",
  fontSize: "var(--text-base)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border-primary)",
  background: "var(--color-bg-input)",
  color: "var(--color-text-primary)",
  outline: "none",
  transition: "border-color var(--duration-fast) var(--ease-default)",
};

const primaryButtonStyle: React.CSSProperties = {
  height: 48,
  borderRadius: "var(--radius-md)",
  border: "none",
  background: "var(--color-accent-primary)",
  color: "#fff",
  fontSize: "var(--text-base)",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background var(--duration-fast) var(--ease-default)",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-accent-primary)",
  fontSize: "var(--text-sm)",
  cursor: "pointer",
  padding: 0,
  textAlign: "center",
};

const errorTextStyle: React.CSSProperties = {
  color: "var(--color-error)",
  fontSize: "var(--text-sm)",
  margin: 0,
};

const successBoxStyle: React.CSSProperties = {
  background: "var(--color-accent-subtle)",
  border: "1px solid var(--color-accent-primary)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-4)",
  display: "grid",
  gap: "var(--space-2)",
};

const successTitleStyle: React.CSSProperties = {
  fontSize: "var(--text-md)",
  fontWeight: 600,
  color: "var(--color-accent-primary)",
};

const successDescStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  color: "var(--color-text-secondary)",
  lineHeight: "var(--leading-normal)",
};

const strengthContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
};

const strengthBarsStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-1)",
  flex: 1,
};

const strengthBarStyle: React.CSSProperties = {
  height: 4,
  flex: 1,
  borderRadius: "var(--radius-full)",
  transition: "background var(--duration-fast) var(--ease-default)",
};

const mismatchStyle: React.CSSProperties = {
  color: "var(--color-error)",
  fontSize: "var(--text-xs)",
};

export function AuthPlaceholder() {
  return <section aria-label="auth-placeholder">Auth module placeholder</section>;
}

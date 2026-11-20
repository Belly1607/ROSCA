
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Landmark,
  Eye,
  EyeOff,
  LockKeyhole,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import "../page_css/Login.css";

const API = "http://localhost:5000";

const scriptures = [
  {
    text: "Careful planning and diligence help build lasting security.",
    reference: "Proverbs 21:5",
    theme: "Planning"
  },
  {
    text: "Honest dealings and fairness matter in every transaction.",
    reference: "Proverbs 11:1",
    theme: "Integrity"
  },
  {
    text: "Support one another and share life's burdens.",
    reference: "Galatians 6:2",
    theme: "Community"
  },
  {
    text: "Be trustworthy with the resources entrusted to you.",
    reference: "1 Corinthians 4:2",
    theme: "Stewardship"
  }
];

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verseIndex, setVerseIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setVerseIndex(i => (i + 1) % scriptures.length);
    }, 9000);

    return () => clearInterval(timer);
  }, []);

  function switchMode(next) {
    setMode(next);
    setError("");
    setSuccess("");
    setPassword("");
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const isRegister = mode === "register";

      if (isRegister && password.length < 12) {
        throw new Error(
          "Password must contain at least 12 characters."
        );
      }

      const response = await fetch(
        `${API}${isRegister ? "/members" : "/login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isRegister
              ? {
                  name: name.trim(),
                  contact: contact.trim(),
                  email: email.trim(),
                  password
                }
              : { email: email.trim(), password }
          )
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      if (isRegister) {
        switchMode("login");
        setSuccess(
          "Registration submitted. An administrator must approve your account before you can sign in."
        );
      } else {
        onLogin(data.token, data.user, rememberMe);

        navigate(
          data.user.role === "admin"
            ? "/admin/home"
            : "/member/home",
          { replace: true }
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const verse = scriptures[verseIndex];

  return (
    <div className="ubc-auth-page">
      <div className="ubc-auth-glow one" />
      <div className="ubc-auth-glow two" />
      <div className="ubc-auth-glow three" />

      <main className="ubc-auth-glass">
        <div className="ubc-auth-heading">
          <div className="ubc-auth-logo">
            <Landmark size={24} />
            <span>UBC ROSCA</span>
          </div>

          <div className="ubc-auth-security">
            <LockKeyhole size={14} />
            Secure member access
          </div>
        </div>

        <div className="ubc-auth-grid">
          <section className="ubc-auth-formside">
            <span className="ubc-auth-eyebrow">
              COMMUNITY SAVINGS PLATFORM
            </span>

            <h1>
              UBC <span>ROSCA</span>
            </h1>

            <p className="ubc-auth-intro">
              Your money. Your community. Your future.
            </p>

            <div className="ubc-auth-tabs">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => switchMode("login")}
              >
                Login
              </button>

              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => switchMode("register")}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={submit} className="ubc-auth-form">
              {mode === "register" && (
                <>
                  <label htmlFor="ubc-name">Full Name</label>
                  <input
                    id="ubc-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    maxLength={100}
                  />

                  <label htmlFor="ubc-phone">Phone Number</label>
                  <input
                    id="ubc-phone"
                    type="tel"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="Your phone number"
                    maxLength={30}
                  />
                </>
              )}

              <label htmlFor="ubc-email">Email Address</label>
              <input
                id="ubc-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <label htmlFor="ubc-password">Password</label>
              <div className="ubc-auth-password">
                <input
                  id="ubc-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    mode === "register"
                      ? "Minimum 12 characters"
                      : "Enter password"
                  }
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword
                    ? <EyeOff size={17} />
                    : <Eye size={17} />}
                </button>
              </div>

              {mode === "login" && (
                <label className="ubc-auth-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
              )}

              {error && (
                <p className="ubc-auth-error" role="alert">
                  {error}
                </p>
              )}

              {success && (
                <p className="ubc-auth-success" role="status">
                  {success}
                </p>
              )}

              <button
                type="submit"
                className="ubc-auth-submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
                <ArrowRight size={19} />
              </button>
            </form>
          </section>

          <aside className="ubc-auth-verse">
            <div className="ubc-auth-verse-glass">
              <span>SCRIPTURE & SAVINGS</span>

              <p>{verse.text}</p>

              <strong>{verse.reference}</strong>
              <small>{verse.theme} · Paraphrased</small>

              <div className="ubc-auth-verse-navigation">
                <button
                  type="button"
                  onClick={() =>
                    setVerseIndex(
                      (verseIndex - 1 + scriptures.length) %
                      scriptures.length
                    )
                  }
                  aria-label="Previous verse"
                >
                  <ChevronLeft size={18} />
                </button>

                
                <div className="ubc-auth-dots">
                  {scriptures.map((item, index) => (
                    <button
                      key={item.reference}
                      type="button"
                      aria-label={`Show verse ${index + 1}`}
                      className={index === verseIndex ? "active" : ""}
                      onClick={() => setVerseIndex(index)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setVerseIndex(
                      (verseIndex + 1) % scriptures.length
                    )
                  }
                  aria-label="Next verse"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="ubc-auth-trust">
              <LockKeyhole size={15} />
              Saving together. Growing together.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

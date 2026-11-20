
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  UserRoundPlus,
  UserRound,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";

import "./../page_css/MemberForm.css";

const API = "http://localhost:5000";

export default function MemberForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function addMember(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !name.trim() ||
      !contact.trim() ||
      !email.trim() ||
      !password
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to register member."
        );
      }

      setSuccess(
        "Member registered successfully. Their account is awaiting administrator approval."
      );

      setName("");
      setContact("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ubc-memberform-page">

      {/* PAGE HEADING */}
      <div className="ubc-memberform-heading">
        <div>
          <span className="ubc-memberform-eyebrow">
            MEMBER MANAGEMENT
          </span>

          <h1>Add New Member</h1>

          <p>
            Register a new member of UBC ROSCA.
          </p>
        </div>

        <Link
          to="/admin/member"
          className="ubc-memberform-back"
        >
          <ArrowLeft size={17} />
          Back to Members
        </Link>
      </div>

      {/* FORM CARD */}
      <div className="ubc-memberform-card">

        <div className="ubc-memberform-card-heading">
          <span className="ubc-memberform-icon">
            <UserRoundPlus size={22} />
          </span>

          <div>
            <h2>Member Information</h2>
            <p>
              Enter the details of the new member.
            </p>
          </div>
        </div>

        <form onSubmit={addMember}>

          {/* FULL NAME */}
          <div className="ubc-memberform-field">
            <label htmlFor="member-name">
              Full Name
            </label>

            <div className="ubc-memberform-input">
              <UserRound size={18} />

              <input
                id="member-name"
                type="text"
                placeholder="Enter member's full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                required
              />
            </div>
          </div>

          {/* PHONE */}
          <div className="ubc-memberform-field">
            <label htmlFor="member-phone">
              Phone Number
            </label>

            <div className="ubc-memberform-input">
              <Phone size={18} />

              <input
                id="member-phone"
                type="tel"
                placeholder="Enter phone number"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={30}
                autoComplete="tel"
                required
              />
            </div>
          </div>

          {/* EMAIL */}
          <div className="ubc-memberform-field">
            <label htmlFor="member-email">
              Email Address
            </label>

            <div className="ubc-memberform-input">
              <Mail size={18} />

              <input
                id="member-email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="ubc-memberform-field">
            <label htmlFor="member-password">
              Initial Password
            </label>

            <div className="ubc-memberform-input">
              <LockKeyhole size={18} />

              <input
                id="member-password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={12}
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className="ubc-memberform-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />}
              </button>
            </div>

            <small>
              Use a temporary password of at least
              12 characters.
            </small>
          </div>

          {/* ACCOUNT NOTICE */}
          <div className="ubc-memberform-notice">
            <CheckCircle2 size={19} />

            <p>
              This account will be created as
              <strong> Pending Approval</strong>.
              The administrator must approve it
              before the member can log in.
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div
              className="ubc-memberform-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div
              className="ubc-memberform-success"
              role="status"
            >
              {success}
            </div>
          )}

          {/* ACTIONS */}
          <div className="ubc-memberform-actions">
            <Link
              to="/admin/member"
              className="ubc-memberform-cancel"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="ubc-memberform-submit"
              disabled={loading}
            >
              <UserRoundPlus size={18} />
              {loading
                ? "Registering..."
                : "Register Member"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

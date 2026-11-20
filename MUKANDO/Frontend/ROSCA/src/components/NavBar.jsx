
import { Link, useLocation } from "react-router-dom";
import {
  House,
  Moon,
  Sun,
  UserRound,
  LogOut,
  Menu
} from "lucide-react";

import "../page_css/Navbar.css";

export default function NavBar({
  user,
  theme = "light",
  onThemeChange,
  onLogout,
  onMenuToggle
}) {
  const location = useLocation();

  const isAdmin = user?.role === "admin";

  const base = isAdmin ? "/admin" : "/member";
  const homePath = `${base}/home`;

  const labels = {
    home: "Overview",
    member: "Member Management",
    memberform: "Add Member",
    loan: "Loan Management",
    balance: "Fund Balance",
    report: "Reports",
    savingscycle: "Savings Cycles",
    profile: "My Profile",
    settings: "Settings"
  };

  const memberLabels = {
    home: "My Dashboard",
    profile: "My Profile",
    settings: "Settings"
  };

  const section =
    location.pathname.split("/")[2] || "home";

  const pageTitle = isAdmin
    ? labels[section] || "UBC ROSCA"
    : memberLabels[section] || "UBC ROSCA";

  const displayName =
    user?.name ||
    user?.full_name ||
    "User";

  const initial = displayName
    .charAt(0)
    .toUpperCase();

  const isDark = theme === "dark";

  return (
    <header className="ubc-topbar">
      {/* LEFT SIDE */}

      <div className="ubc-topbar-left">
        {isAdmin && (
          <button
            type="button"
            className="ubc-mobile-menu"
            onClick={onMenuToggle}
            aria-label="Toggle sidebar"
            title="Open menu"
          >
            <Menu size={22} />
          </button>
        )}

        <div className="ubc-topbar-heading">
          <h2>{pageTitle}</h2>

          <p>
            UBC ROSCA / {pageTitle}
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}

      <div className="ubc-topbar-actions">

        {/* HOME - ADMIN AND MEMBER */}

        <Link
          to={homePath}
          className={`ubc-icon-button ${
            location.pathname === homePath
              ? "ubc-icon-active"
              : ""
          }`}
          aria-label="Go to dashboard"
          title="Home"
        >
          <House size={21} />
        </Link>

        {/* LIGHT / DARK MODE - BOTH ROLES */}

        <button
          type="button"
          className="ubc-icon-button ubc-theme-nav"
          onClick={onThemeChange}
          aria-label={
            isDark
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          aria-pressed={isDark}
          title={
            isDark
              ? "Light Mode"
              : "Dark Mode"
          }
        >
          {isDark ? (
            <Sun size={21} />
          ) : (
            <Moon size={21} />
          )}
        </button>

        {/* USER PROFILE */}

        <Link
          to={`${base}/profile`}
          className="ubc-user-chip"
          title="My Profile"
        >
          <span className="ubc-user-avatar">
            {initial}
          </span>

          <span className="ubc-user-details">
            <strong>{displayName}</strong>

            <small>
              {isAdmin
                ? "Administrator"
                : "Member"}
            </small>
          </span>

          <UserRound
            size={17}
            className="ubc-user-profile-icon"
          />
        </Link>

        {/* LOGOUT */}

        <button
          type="button"
          className="ubc-icon-button ubc-logout-button"
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={20} />
        </button>

      </div>
    </header>
  );
}


import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  Moon,
  Sun,
  UserRound,
  LogOut,
  Menu
} from "lucide-react";

export default function NavBar({
  user,
  theme,
  onThemeChange,
  onLogout,
  onMenuToggle
}) {
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const base = isAdmin ? "/admin" : "/member";

  const labels = {
    home: "Overview",
    member: "Member Management",
    loan: "Loan Management",
    balance: "Fund Balance",
    report: "Reports",
    profile: "My Profile",
    settings: "Settings"
  };

  const section = location.pathname.split("/")[2] || "home";
  const pageTitle = labels[section] || "UBC ROSCA";

  return (
    <header className="ubc-topbar">
      <div className="ubc-topbar-left">
        {isAdmin && (
          <button
            type="button"
            className="ubc-mobile-menu"
            onClick={onMenuToggle}
            aria-label="Toggle sidebar"
          >
            <Menu size={21} />
          </button>
        )}

        <div>
          <h2>{pageTitle}</h2>
          <p>UBC ROSCA / {pageTitle}</p>
        </div>
      </div>

      <div className="ubc-topbar-actions">
        {isAdmin && (
          <button
            type="button"
            className="ubc-icon-button"
            onClick={onThemeChange}
            aria-label="Toggle light and dark mode"
            title="Change theme"
          >
            {theme === "dark"
              ? <Sun size={19} />
              : <Moon size={19} />}
          </button>
        )}

        <Link
          to={`${base}/home`}
          className="ubc-icon-button"
          title="Dashboard"
          aria-label="Dashboard"
        >
          <Bell size={19} />
        </Link>

        <Link
          to={`${base}/profile`}
          className="ubc-user-chip"
        >
          <span className="ubc-user-avatar">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </span>

          <span className="ubc-user-details">
            <strong>{user?.name || "User"}</strong>
            <small>
              {isAdmin ? "Administrator" : "Member"}
            </small>
          </span>

          <UserRound size={16} />
        </Link>

        <button
          type="button"
          className="ubc-icon-button"
          onClick={onLogout}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

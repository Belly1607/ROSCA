
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  HandCoins,
  Wallet,
  ChartNoAxesCombined,
  UserRound,
  Settings,
  ChevronLeft,
  ChevronRight,
  Landmark,
  LogOut
} from "lucide-react";

const sections = [
  {
    label: "WORKSPACE",
    items: [
      { to: "/admin/home", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/member", label: "Members", icon: Users },
      { to: "/admin/loan", label: "Loans", icon: HandCoins },
      { to: "/admin/balance", label: "Fund Balance", icon: Wallet },
      { to: "/admin/report", label: "Reports", icon: ChartNoAxesCombined }
    ]
  },
  {
    label: "ACCOUNT",
    items: [
      { to: "/admin/profile", label: "My Profile", icon: UserRound },
      { to: "/admin/settings", label: "Settings", icon: Settings }
    ]
  }
];

export default function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onLogout
}) {
  return (
    <aside className={`ubc-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="ubc-sidebar-brand">
        <div className="ubc-brand-icon">
          <Landmark size={23} />
        </div>

        {!collapsed && (
          <div className="ubc-brand-copy">
            <strong>UBC ROSCA</strong>
            <small>ADMIN WORKSPACE</small>
          </div>
        )}

        <button
          type="button"
          className="ubc-collapse-button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed
            ? <ChevronRight size={17} />
            : <ChevronLeft size={17} />}
        </button>
      </div>

      <div className="ubc-sidebar-scroll">
        {sections.map((section) => (
          <div className="ubc-menu-section" key={section.label}>
            {!collapsed && (
              <div className="ubc-menu-heading">
                {section.label}
              </div>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `ubc-menu-link ${isActive ? "selected" : ""}`
                  }
                >
                  <Icon size={19} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div className="ubc-sidebar-bottom">
        {!collapsed && (
          <div className="ubc-sidebar-note">
            <div className="ubc-note-icon">
              <Wallet size={18} />
            </div>
            <strong>Save together.</strong>
            <small>Grow together.</small>
          </div>
        )}

        <button
          type="button"
          className="ubc-sidebar-logout"
          onClick={onLogout}
          title="Sign out"
        >
          <LogOut size={19} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

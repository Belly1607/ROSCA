
import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate
} from "react-router-dom";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import NavBar from "./components/NavBar";
import MemberForm from "./components/MemberForm";

import Home from "./pages/Home";
import Member from "./pages/Member";
import MemberHome from "./pages/MemberHome";
import Loan from "./pages/Loan";
import Balance from "./pages/Balance";
import Report from "./pages/Report";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import { apiRequest } from "./utils/api";

import "./App.css";
import "./page_css/Admin.css";
import "./page_css/Member.css";
import "./page_css/Loan.css";
import "./page_css/Balance.css";
import "./page_css/Report.css";
import "./page_css/Account.css";
import "./page_css/Theme.css";

// ============================================
// THEME SETTINGS
// ============================================

const THEME_KEY = "ubc-rosca-theme";

// ============================================
// PROTECTED ROUTES
// ============================================

function ProtectedRoute({ user, requiredRole }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== requiredRole) {
    return (
      <Navigate
        to={
          user.role === "admin"
            ? "/admin/home"
            : "/member/home"
        }
        replace
      />
    );
  }

  return <Outlet />;
}

// ============================================
// ADMIN LAYOUT
// ============================================

function AdminLayout({
  user,
  theme,
  onThemeChange,
  onLogout
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`ubc-shell theme-${theme}`}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() =>
          setCollapsed((previous) => !previous)
        }
        onLogout={onLogout}
      />

      <div className="ubc-workspace">
        <NavBar
          user={user}
          theme={theme}
          onThemeChange={onThemeChange}
          onLogout={onLogout}
          onMenuToggle={() =>
            setMobileOpen((previous) => !previous)
          }
        />

        <main className="ubc-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ============================================
// MEMBER LAYOUT
// ============================================

function MemberLayout({
  user,
  theme,
  onThemeChange,
  onLogout
}) {
  return (
    <div className={`ubc-member-shell theme-${theme}`}>
      <NavBar
        user={user}
        theme={theme}
        onThemeChange={onThemeChange}
        onLogout={onLogout}
      />

      <main className="ubc-member-main">
        <Outlet />
      </main>
    </div>
  );
}

// ============================================
// MAIN APPLICATION
// ============================================

function AppContent() {
  const navigate = useNavigate();

  // ============================================
  // SHARED LIGHT / DARK THEME
  // ============================================

  const [theme, setTheme] = useState(() => {
    const savedTheme =
      localStorage.getItem(THEME_KEY) ||
      localStorage.getItem("ubc_theme");

    return savedTheme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-ubc-theme",
      theme
    );

    document.documentElement.style.colorScheme = theme;

    localStorage.setItem(THEME_KEY, theme);

    // Keep compatibility with any older code
    // still reading the previous theme key.
    localStorage.setItem("ubc_theme", theme);
  }, [theme]);

  function handleThemeChange() {
    setTheme((previous) =>
      previous === "light" ? "dark" : "light"
    );
  }

  // ============================================
  // AUTHENTICATION STATE
  // ============================================

  const [token, setToken] = useState(() =>
    sessionStorage.getItem("rosca_token") ||
    localStorage.getItem("rosca_token")
  );

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // ============================================
  // RESTORE LOGGED-IN USER
  // ============================================

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!token) {
        setUser(null);
        setChecking(false);
        return;
      }

      setChecking(true);

      try {
        const data = await apiRequest("/me");

        if (!cancelled) {
          setUser({
            user_id: data.user_id,
            name: data.full_name,
            email: data.email,
            role: data.role
          });
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem("rosca_token");
          sessionStorage.removeItem("rosca_token");

          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    restore();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // ============================================
  // LOGIN
  // ============================================

  function handleLogin(
    newToken,
    newUser,
    rememberMe = false
  ) {
    localStorage.removeItem("rosca_token");
    sessionStorage.removeItem("rosca_token");

    if (rememberMe) {
      localStorage.setItem("rosca_token", newToken);
    } else {
      sessionStorage.setItem("rosca_token", newToken);
    }

    setToken(newToken);
    setUser(newUser);
  }

  // ============================================
  // LOGOUT
  // ============================================

  function handleLogout() {
    localStorage.removeItem("rosca_token");
    sessionStorage.removeItem("rosca_token");

    setToken(null);
    setUser(null);

    navigate("/login", { replace: true });
  }

  // ============================================
  // LOADING SCREEN
  // ============================================

  if (checking) {
    return (
      <div className="ubc-loading-screen">
        Loading UBC ROSCA...
      </div>
    );
  }

  // ============================================
  // DEFAULT HOME
  // ============================================

  const home = !user
    ? "/login"
    : user.role === "admin"
      ? "/admin/home"
      : "/member/home";

  // ============================================
  // ROUTES
  // ============================================

  return (
    <Routes>
      {/* LOGIN */}

      <Route
        path="/login"
        element={
          user
            ? <Navigate to={home} replace />
            : <Login onLogin={handleLogin} />
        }
      />

      <Route
        path="/"
        element={<Navigate to={home} replace />}
      />

      {/* ADMIN ROUTES */}

      <Route
        element={
          <ProtectedRoute
            user={user}
            requiredRole="admin"
          />
        }
      >
        <Route
          path="/admin"
          element={
            <AdminLayout
              user={user}
              theme={theme}
              onThemeChange={handleThemeChange}
              onLogout={handleLogout}
            />
          }
        >
          <Route
            index
            element={<Navigate to="home" replace />}
          />

          <Route path="home" element={<Home />} />

          <Route
            path="member"
            element={<Member />}
          />

          <Route
            path="memberform"
            element={<MemberForm />}
          />

          <Route path="loan" element={<Loan />} />

          <Route
            path="balance"
            element={<Balance />}
          />

          <Route
            path="report"
            element={<Report />}
          />

          <Route
            path="profile"
            element={<Profile />}
          />

          <Route
            path="settings"
            element={
              <Settings onLogout={handleLogout} />
            }
          />

          <Route
            path="*"
            element={<Navigate to="home" replace />}
          />
        </Route>
      </Route>

      {/* MEMBER ROUTES */}

      <Route
        element={
          <ProtectedRoute
            user={user}
            requiredRole="member"
          />
        }
      >
        <Route
          path="/member"
          element={
            <MemberLayout
              user={user}
              theme={theme}
              onThemeChange={handleThemeChange}
              onLogout={handleLogout}
            />
          }
        >
          <Route
            index
            element={<Navigate to="home" replace />}
          />

          <Route
            path="home"
            element={<MemberHome user={user} />}
          />

          <Route
            path="profile"
            element={<Profile />}
          />

          <Route
            path="settings"
            element={
              <Settings onLogout={handleLogout} />
            }
          />

          <Route
            path="*"
            element={<Navigate to="home" replace />}
          />
        </Route>
      </Route>

      {/* UNKNOWN ROUTES */}

      <Route
        path="*"
        element={<Navigate to={home} replace />}
      />
    </Routes>
  );
}

// ============================================
// APP ROOT
// ============================================

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

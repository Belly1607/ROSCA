
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

function AdminLayout({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("ubc_theme") || "light"
  );

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    localStorage.setItem("ubc_theme", next);
    setTheme(next);
  }

  return (
    <div className={`ubc-shell theme-${theme}`}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed(s => !s)}
        onLogout={onLogout}
      />

      <div className="ubc-workspace">
        <NavBar
          user={user}
          theme={theme}
          onThemeChange={toggleTheme}
          onLogout={onLogout}
          onMenuToggle={() => setMobileOpen(s => !s)}
        />

        <main className="ubc-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MemberLayout({ user, onLogout }) {
  return (
    <div className="ubc-member-shell">
      <NavBar
        user={user}
        theme="light"
        onThemeChange={() => {}}
        onLogout={onLogout}
      />

      <main style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px"
      }}>
        <Outlet />
      </main>
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();

  const [token, setToken] = useState(
    () =>
      sessionStorage.getItem("rosca_token") ||
      localStorage.getItem("rosca_token")
  );

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

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
        if (!cancelled) setChecking(false);
      }
    }

    restore();
    return () => { cancelled = true; };
  }, [token]);

  function handleLogin(newToken, newUser, rememberMe = false) {
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

  function handleLogout() {
    localStorage.removeItem("rosca_token");
    sessionStorage.removeItem("rosca_token");
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }

  if (checking) {
    return (
      <div style={{
        background: "#111115",
        color: "#fff",
        minHeight: "100vh",
        display: "grid",
        placeItems: "center"
      }}>
        Loading UBC ROSCA...
      </div>
    );
  }

  const home = !user
    ? "/login"
    : user.role === "admin"
      ? "/admin/home"
      : "/member/home";

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user
            ? <Navigate to={home} replace />
            : <Login onLogin={handleLogin} />
        }
      />

      <Route path="/" element={<Navigate to={home} replace />} />

      <Route
        element={
          <ProtectedRoute user={user} requiredRole="admin" />
        }
      >
        <Route
          path="/admin"
          element={
            <AdminLayout user={user} onLogout={handleLogout} />
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="member" element={<Member />} />
          <Route path="memberform" element={<MemberForm />} />
          <Route path="loan" element={<Loan />} />
          <Route path="balance" element={<Balance />} />
          <Route path="report" element={<Report />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="settings"
            element={<Settings onLogout={handleLogout} />}
          />
          <Route path="*" element={<Navigate to="home" replace />} />
        </Route>
      </Route>

      <Route
        element={
          <ProtectedRoute user={user} requiredRole="member" />
        }
      >
        <Route
          path="/member"
          element={
            <MemberLayout user={user} onLogout={handleLogout} />
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route
            path="home"
            element={<MemberHome user={user} />}
          />
          <Route path="profile" element={<Profile />} />
          <Route
            path="settings"
            element={<Settings onLogout={handleLogout} />}
          />
          <Route path="*" element={<Navigate to="home" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

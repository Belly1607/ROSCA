
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays, Plus, Pencil, CheckCircle2,
  LockKeyhole, Eye, EyeOff, RefreshCw,
  X, ShieldCheck, Info
} from "lucide-react";
import { apiRequest } from "../utils/api";
import "../page_css/Account.css";
import "../page_css/SavingsCycle.css";

const currentYear = new Date().getFullYear();

const emptyCycle = {
  cycle_year: String(currentYear),
  start_date: `${currentYear}-01-01`,
  end_date: `${currentYear}-12-31`,
  share_price: "5.00"
};

const price = (value) =>
  Number(value || 0).toFixed(2);

export default function Settings() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyCycle);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("ubc_admin_notifications") !== "false"
  );

  const loadCycles = useCallback(async () => {
    try {
      const data = await apiRequest("/admin/savings-cycles");

      if (!Array.isArray(data)) {
        throw new Error("Invalid savings cycle response");
      }

      setCycles(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  async function runCycleAction(request, message) {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await request();

      await loadCycles();

      setFormOpen(false);
      setEditingId(null);
      setSuccess(result.message || message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyCycle });
    setError("");
    setFormOpen(true);
  }

  function openEdit(cycle) {
    setEditingId(cycle.cycle_id);

    setForm({
      cycle_year: String(cycle.cycle_year),
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      share_price: String(cycle.share_price)
    });

    setError("");
    setFormOpen(true);
  }

  function changeYear(value) {
    const year = String(value);

    setForm((previous) => ({
      ...previous,
      cycle_year: year,
      start_date: /^\d{4}$/.test(year)
        ? `${year}-01-01`
        : "",
      end_date: /^\d{4}$/.test(year)
        ? `${year}-12-31`
        : ""
    }));
  }

  function saveCycle(event) {
    event.preventDefault();

    runCycleAction(
      () => apiRequest(
        editingId
          ? `/admin/savings-cycles/${editingId}`
          : "/admin/savings-cycles",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify({
            cycle_year: Number(form.cycle_year),
            start_date: form.start_date,
            end_date: form.end_date,
            share_price: form.share_price
          })
        }
      ),
      editingId ? "Cycle updated" : "Cycle created"
    );
  }

  function activateCycle(cycle) {
    if (!window.confirm(
      `Activate the ${cycle.cycle_year} savings cycle?`
    )) return;

    runCycleAction(
      () => apiRequest(
        `/admin/savings-cycles/${cycle.cycle_id}/activate`,
        { method: "PATCH" }
      ),
      "Cycle activated"
    );
  }

  function closeCycle(cycle) {
    if (!window.confirm(
      `Close the ${cycle.cycle_year} savings cycle?`
    )) return;

    runCycleAction(
      () => apiRequest(
        `/admin/savings-cycles/${cycle.cycle_id}/close`,
        { method: "PATCH" }
      ),
      "Cycle closed"
    );
  }

  async function changePassword(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setPasswordBusy(true);

    try {
      const result = await apiRequest("/settings/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setSuccess(result.message || "Password updated");
    } catch (err) {
      setError(err.message);
    } finally {
      setPasswordBusy(false);
    }
  }

  const activeCycle = cycles.find(
    (cycle) => cycle.status === "active"
  );

  return (
    <div className="ubc-page ubc-settings-page">
      <div className="ubc-page-heading">
        <div>
          <h1>Settings</h1>
          <p>Manage your savings cycles and account security.</p>
        </div>
      </div>

      {error && (
        <div className="ubc-alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="ubc-alert success" role="status">
          {success}
        </div>
      )}

      <section className="ubc-panel ubc-cycle-panel">
        <div className="ubc-panel-title ubc-cycle-title">
          <div>
            <h2>
              <CalendarDays size={20} />
              Savings Cycle Management
            </h2>
            <p>
              Configure annual savings periods for loans,
              contributions and reports.
            </p>
          </div>

          <button
            type="button"
            className="ubc-button-primary"
            onClick={openNew}
            disabled={busy}
          >
            <Plus size={17} />
            New Cycle
          </button>
        </div>

        <div className="ubc-cycle-highlight">
          <span className="ubc-cycle-eyebrow">
            CURRENT ACTIVE CYCLE
          </span>

          {activeCycle ? (
            <>
              <div className="ubc-cycle-big-year">
                {activeCycle.cycle_year}
              </div>

              <p>
                {activeCycle.start_date} to{" "}
                {activeCycle.end_date}
              </p>

              <div className="ubc-cycle-price">
                Share price: {price(activeCycle.share_price)}
              </div>

              <span className="ubc-cycle-status active">
                <CheckCircle2 size={14} />
                Active
              </span>
            </>
          ) : (
            <>
              <div className="ubc-cycle-big-year">
                No active cycle
              </div>

              <p>
                Create a savings cycle and activate it to
                enable loan applications and contributions.
              </p>
            </>
          )}
        </div>

        <div className="ubc-cycle-table-wrap">
          <table className="ubc-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Share Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading cycles...</td>
                </tr>
              ) : cycles.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    No savings cycles found.
                    Click New Cycle to create one.
                  </td>
                </tr>
              ) : (
                cycles.map((cycle) => (
                  <tr key={cycle.cycle_id}>
                    <td>
                      <strong>{cycle.cycle_year}</strong>
                    </td>
                    <td>{cycle.start_date}</td>
                    <td>{cycle.end_date}</td>
                    <td>{price(cycle.share_price)}</td>

                    <td>
                      <span className={
                        `ubc-cycle-status ${cycle.status}`
                      }>
                        {cycle.status}
                      </span>
                    </td>

                    <td>
                      <div className="ubc-cycle-actions">
                        {cycle.status === "planned" && (
                          <>
                            <button
                              type="button"
                              className="ubc-button-secondary"
                              onClick={() => openEdit(cycle)}
                              disabled={busy}
                            >
                              <Pencil size={14} />
                              Edit
                            </button>

                            <button
                              type="button"
                              className="ubc-button-primary"
                              onClick={() => activateCycle(cycle)}
                              disabled={busy || Boolean(activeCycle)}
                            >
                              Activate
                            </button>
                          </>
                        )}

                        {cycle.status === "active" && (
                          <button
                            type="button"
                            className="ubc-button-secondary"
                            onClick={() => closeCycle(cycle)}
                            disabled={busy}
                          >
                            Close Cycle
                          </button>
                        )}

                        {cycle.status === "closed" && (
                          <span className="ubc-cycle-muted">
                            Read-only history
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="ubc-cycle-note">
          <Info size={16} />
          Only unused planned cycles can be edited.
          Existing financial records are protected.
        </p>

        <button
          type="button"
          className="ubc-cycle-refresh"
          onClick={loadCycles}
          disabled={busy}
        >
          <RefreshCw size={15} />
          Refresh cycles
        </button>
      </section>

      <section className="ubc-panel ubc-cycle-account">
        <div className="ubc-panel-title">
          <h2>
            <LockKeyhole size={20} />
            Change Password
          </h2>
        </div>

        <form
          className="ubc-cycle-password-form"
          onSubmit={changePassword}
        >
          <div className="ubc-field">
            <label htmlFor="current-password">
              Current Password
            </label>

            <input
              id="current-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) =>
                setCurrentPassword(e.target.value)
              }
              required
            />
          </div>

          <div className="ubc-field">
            <label htmlFor="new-password">
              New Password
            </label>

            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={12}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="ubc-field">
            <label htmlFor="confirm-password">
              Confirm New Password
            </label>

            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              required
            />
          </div>

          <button
            type="button"
            className="ubc-cycle-visibility"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword
              ? <EyeOff size={16} />
              : <Eye size={16} />}

            {showPassword
              ? "Hide passwords"
              : "Show passwords"}
          </button>

          <div>
            <button
              type="submit"
              className="ubc-button-primary"
              disabled={passwordBusy}
            >
              <ShieldCheck size={17} />
              {passwordBusy
                ? "Updating..."
                : "Update Password"}
            </button>
          </div>
        </form>
      </section>

      <section className="ubc-panel ubc-cycle-account">
        <div className="ubc-panel-title">
          <h2>Preferences</h2>
        </div>

        <label className="ubc-cycle-preference">
          <span>
            <strong>Notification Preference</strong>
            <small>
              Saved in this browser only.
              Live notifications are not enabled yet.
            </small>
          </span>

          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => {
              setNotifications(e.target.checked);

              localStorage.setItem(
                "ubc_admin_notifications",
                String(e.target.checked)
              );
            }}
          />
        </label>
      </section>

      {formOpen && (
        <div
          className="ubc-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !busy
            ) {
              setFormOpen(false);
            }
          }}
        >
          <div
            className="ubc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cycle-form-title"
          >
            <div className="ubc-panel-title">
              <h2 id="cycle-form-title">
                {editingId
                  ? "Edit Savings Cycle"
                  : "Create Savings Cycle"}
              </h2>

              <button
                type="button"
                className="ubc-button-secondary"
                onClick={() => setFormOpen(false)}
                disabled={busy}
              >
                <X size={16} />
              </button>
            </div>

            <p>
              New cycles begin as planned.
              Activate the cycle when its dates include today.
            </p>

            <form
              className="ubc-cycle-modal-form"
              onSubmit={saveCycle}
            >
              <div className="ubc-field">
                <label htmlFor="cycle-year">
                  Cycle Year
                </label>

                <input
                  id="cycle-year"
                  type="number"
                  min="2000"
                  max="2200"
                  value={form.cycle_year}
                  onChange={(e) =>
                    changeYear(e.target.value)
                  }
                  required
                />
              </div>

              <div className="ubc-cycle-dates">
                <div className="ubc-field">
                  <label htmlFor="cycle-start">
                    Start Date
                  </label>

                  <input
                    id="cycle-start"
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        start_date: e.target.value
                      })
                    }
                    required
                  />
                </div>

                <div className="ubc-field">
                  <label htmlFor="cycle-end">
                    End Date
                  </label>

                  <input
                    id="cycle-end"
                    type="date"
                    min={form.start_date}
                    value={form.end_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        end_date: e.target.value
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="ubc-field">
                <label htmlFor="share-price">
                  Share Price
                </label>

                <input
                  id="share-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.share_price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      share_price: e.target.value
                    })
                  }
                  required
                />
              </div>

              <div className="ubc-modal-actions">
                <button
                  type="button"
                  className="ubc-button-secondary"
                  onClick={() => setFormOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ubc-button-primary"
                  disabled={busy}
                >
                  {busy
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Create Cycle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

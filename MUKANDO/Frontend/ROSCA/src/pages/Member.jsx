
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, UserCheck, Clock3, Coins,
  Search, Plus, X, History, RefreshCw,
  UserX, UserRoundCheck, Trash2
} from "lucide-react";
import { apiRequest } from "../utils/api";
import "../page_css/Member.css";

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const displayDate = (value) =>
  value ? String(value).slice(0, 10) : "—";

const overlay = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0,0,0,.68)",
  display: "grid",
  placeItems: "center",
  padding: 16
};

const dialog = {
  background: "var(--theme-surface,#fff)",
  color: "var(--theme-text,#111)",
  border: "1px solid var(--theme-border,#ddd)",
  borderRadius: 18,
  width: "min(100%,580px)",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,.2)"
};

const actionRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center"
};

export default function Member() {
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] =
    useState("");
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [m, c, s] = await Promise.all([
        apiRequest("/members"),
        apiRequest("/admin/contributions"),
        apiRequest("/savings-cycles")
      ]);

      if (!Array.isArray(m) ||
          !Array.isArray(c) ||
          !Array.isArray(s)) {
        throw new Error("Unexpected response from backend");
      }

      setMembers(m);
      setContributions(c);
      setCycles(s);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeCycle = cycles.find(
    (cycle) => cycle.status === "active"
  );

  const sharePrice = Number(activeCycle?.share_price || 0);

  const amountNumber = Number(amount);

  const calculatedShares =
    amount.trim() &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    sharePrice > 0 &&
    Math.abs(
      amountNumber / sharePrice -
      Math.round(amountNumber / sharePrice)
    ) < 1e-8
      ? Math.round(amountNumber / sharePrice)
      : null;

  const counts = {
    active: members.filter(m => m.status === "active").length,
    pending: members.filter(m => m.status === "pending").length,
    inactive: members.filter(m => m.status === "inactive").length
  };

  const filtered = members.filter((member) =>
    member.status === tab &&
    `${member.user_id} ${member.full_name} ${member.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const history = selected
    ? contributions.filter(
        (item) =>
          Number(item.user_id) ===
          Number(selected.user_id)
      )
    : [];

  const totalMoney = members.reduce(
    (sum, member) =>
      sum + Number(member.total_contributions || 0),
    0
  );

  const totalShares = members.reduce(
    (sum, member) =>
      sum + Number(member.total_shares || 0),
    0
  );

  function openModal(type, member) {
    setSelected(member);
    setModal(type);
    setModalError("");
    setDeleteConfirmation("");
    setAmount("");
    setReceiptRef(
      type === "cash" ? crypto.randomUUID() : ""
    );
  }

  function closeModal() {
    if (busy) return;
    setModal("");
    setSelected(null);
    setModalError("");
    setDeleteConfirmation("");
  }

  async function reviewMember(member, action) {
    if (busy) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest(
        `/admin/members/${member.user_id}/${action}`,
        { method: "PATCH" }
      );

      await load();
      setSuccess(result.message || "Member updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeMembership(action) {
    if (!selected || busy) return;

    setBusy(true);
    setModalError("");
    setSuccess("");

    try {
      const result = await apiRequest(
        `/admin/members/${selected.user_id}/${action}`,
        {
          method:
            action === "delete" ? "DELETE" : "PATCH"
        }
      );

      closeModalAfterSuccess();
      await load();

      setSuccess(
        result.message || "Member account updated successfully."
      );
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function closeModalAfterSuccess() {
    setModal("");
    setSelected(null);
    setDeleteConfirmation("");
    setModalError("");
  }

  async function recordCash(event) {
    event.preventDefault();

    if (!selected || busy) return;

    if (calculatedShares === null) {
      setModalError(
        "The amount must purchase a whole number of shares."
      );
      return;
    }

    setBusy(true);
    setModalError("");
    setSuccess("");

    try {
      const result = await apiRequest(
        "/admin/cash-contributions",
        {
          method: "POST",
          body: JSON.stringify({
            user_id: selected.user_id,
            amount,
            receipt_reference: receiptRef
          })
        }
      );

      closeModalAfterSuccess();
      await load();

      setSuccess(
        result.message || "Cash contribution recorded."
      );
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ubc-page">
      <div className="ubc-page-heading">
        <div>
          <h1>Member Management</h1>
          <p>
            Manage church membership, savings and shares.
          </p>
        </div>

        <Link
          to="/admin/memberform"
          className="ubc-button-primary"
          style={{textDecoration:"none",display:"inline-flex",gap:8}}
        >
          <Plus size={17}/>
          Add Member
        </Link>
      </div>

      <div className="ubc-cards" style={{marginTop:20}}>
        {[
          {
            label:"Total Members",
            value:members.length,
            icon:Users
          },
          {
            label:"Active Members",
            value:counts.active,
            icon:UserCheck
          },
          {
            label:"Verified Contributions",
            value:money(totalMoney),
            icon:Coins
          },
          {
            label:"Verified Shares",
            value:totalShares.toLocaleString(),
            icon:Clock3
          }
        ].map(({label,value,icon:Icon}) => (
          <div className="ubc-card" key={label}>
            <div className="ubc-card-top">
              <span>{label}</span>
              <span className="ubc-card-icon">
                <Icon size={19}/>
              </span>
            </div>
            <strong>{value}</strong>
          </div>
        ))}
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

      <section
        className="ubc-panel"
        style={{marginTop:22}}
      >
        <div className="ubc-panel-title">
          <h2>Registered Members</h2>

          <button
            className="ubc-button-secondary"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={16}/>
            Refresh
          </button>
        </div>

        <div style={{
          display:"flex",
          alignItems:"center",
          gap:10,
          flexWrap:"wrap",
          margin:"20px 0"
        }}>
          {["active","pending","inactive"].map((status) => (
            <button
              key={status}
              type="button"
              className={
                tab === status
                  ? "ubc-button-primary"
                  : "ubc-button-secondary"
              }
              onClick={() => setTab(status)}
            >
              {status.charAt(0).toUpperCase() +
                status.slice(1)}
              {" "}({counts[status]})
            </button>
          ))}
        </div>

        <div style={{
          display:"flex",
          alignItems:"center",
          gap:10,
          marginBottom:20,
          maxWidth:420
        }}>
          <Search size={19}/>
          <input
            className="ubc-search"
            style={{flex:1,minWidth:0}}
            type="search"
            placeholder="Search by name, email or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="ubc-table-wrap">
          <table className="ubc-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Phone</th>
                <th>Total Contributions</th>
                <th>Total Shares</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">
                    Loading members...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    No members found.
                  </td>
                </tr>
              ) : filtered.map((member) => (
                <tr key={member.user_id}>
                  <td>
                    <strong>{member.full_name}</strong>
                    <div style={{
                      color:"var(--theme-muted,#777)",
                      fontSize:12,
                      marginTop:5
                    }}>
                      {member.email} · #{member.user_id}
                    </div>
                  </td>

                  <td>{member.phone || "—"}</td>

                  <td>
                    <strong>
                      {money(member.total_contributions)}
                    </strong>
                  </td>

                  <td>
                    {Number(
                      member.total_shares || 0
                    ).toLocaleString()}
                  </td>

                  <td>
                    <span className={`ubc-status ${member.status}`}>
                      {member.status}
                    </span>
                  </td>

                  <td>
                    <div style={actionRow}>
                      {member.status === "pending" && (
                        <>
                          <button
                            className="ubc-button-primary"
                            disabled={busy}
                            onClick={() =>
                              reviewMember(member,"approve")
                            }
                          >
                            Approve
                          </button>

                          <button
                            className="ubc-button-secondary"
                            disabled={busy}
                            onClick={() =>
                              reviewMember(member,"reject")
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}

                      <button
                        className="ubc-button-secondary"
                        onClick={() =>
                          openModal("history",member)
                        }
                      >
                        <History size={15}/>
                        History
                      </button>

                      {member.status === "active" && (
                        <>
                          <button
                            className="ubc-button-primary"
                            onClick={() =>
                              openModal("cash",member)
                            }
                          >
                            <Plus size={15}/>
                            Cash
                          </button>

                          <button
                            className="ubc-button-secondary"
                            onClick={() =>
                              openModal("deactivate",member)
                            }
                          >
                            <UserX size={15}/>
                            Set Inactive
                          </button>
                        </>
                      )}

                      {member.status === "inactive" && (
                        <button
                          className="ubc-button-secondary"
                          onClick={() =>
                            openModal("reactivate",member)
                          }
                        >
                          <UserRoundCheck size={15}/>
                          Reactivate
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          openModal("delete",member)
                        }
                        style={{
                          display:"inline-flex",
                          alignItems:"center",
                          gap:7,
                          background:"transparent",
                          border:"1px solid #c42b37",
                          color:"#c42b37",
                          borderRadius:9,
                          padding:"9px 12px",
                          cursor:"pointer",
                          fontWeight:700
                        }}
                      >
                        <Trash2 size={15}/>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal && selected && (
        <div style={overlay}>
          <div
            style={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={`${modal} member`}
          >
            <div style={{
              display:"flex",
              justifyContent:"space-between",
              gap:15,
              alignItems:"center"
            }}>
              <h2 style={{margin:0}}>
                {modal === "cash" && "Record Cash Contribution"}
                {modal === "history" && "Contribution History"}
                {modal === "deactivate" && "Set Member Inactive"}
                {modal === "reactivate" && "Reactivate Member"}
                {modal === "delete" && "Delete Member"}
              </h2>

              <button
                className="ubc-button-secondary"
                type="button"
                disabled={busy}
                onClick={closeModal}
                aria-label="Close"
              >
                <X size={19}/>
              </button>
            </div>

            <p style={{
              color:"var(--theme-muted,#666)",
              margin:"16px 0"
            }}>
              <strong>{selected.full_name}</strong>
              {" · "}Member #{selected.user_id}
            </p>

            {modalError && (
              <div
                role="alert"
                style={{
                  padding:14,
                  borderRadius:10,
                  background:"#601c1c",
                  color:"#fff",
                  marginBottom:16
                }}
              >
                {modalError}
              </div>
            )}

            {modal === "cash" && (
              <form onSubmit={recordCash}>
                <p>
                  Active savings cycle:{" "}
                  <strong>
                    {activeCycle?.cycle_year || "None"}
                  </strong>
                </p>

                <p>
                  Share price:{" "}
                  <strong>{money(sharePrice)}</strong>
                </p>

                <label
                  htmlFor="member-cash-amount"
                  style={{display:"block",margin:"15px 0 8px"}}
                >
                  Cash Received
                </label>

                <input
                  id="member-cash-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width:"100%",
                    padding:13,
                    border:"1px solid var(--theme-border,#ccc)",
                    borderRadius:10
                  }}
                />

                <div
                  className="ubc-card"
                  style={{margin:"18px 0",padding:18}}
                >
                  <small>Calculated Shares</small>
                  <strong style={{display:"block",fontSize:28}}>
                    {calculatedShares ?? "—"}
                  </strong>
                </div>

                <p style={{
                  color:"var(--theme-muted,#666)",
                  fontSize:13
                }}>
                  Confirm only after physically receiving
                  and counting the cash.
                </p>

                <div style={actionRow}>
                  <button
                    type="button"
                    className="ubc-button-secondary"
                    onClick={closeModal}
                    disabled={busy}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="ubc-button-primary"
                    disabled={busy || calculatedShares === null}
                  >
                    {busy
                      ? "Recording..."
                      : "Confirm Cash Received"}
                  </button>
                </div>
              </form>
            )}

            {modal === "history" && (
              <>
                <div className="ubc-table-wrap">
                  <table className="ubc-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Shares</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan="4">
                            No contributions recorded.
                          </td>
                        </tr>
                      ) : history.map((item) => (
                        <tr key={item.contribution_id}>
                          <td>{displayDate(item.payment_date)}</td>
                          <td>{money(item.amount)}</td>
                          <td>{item.number_of_shares}</td>
                          <td>{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{...actionRow,marginTop:20}}>
                  <button
                    className="ubc-button-secondary"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {modal === "deactivate" && (
              <>
                <p>
                  This member will no longer be able to log in,
                  submit contributions or apply for loans.
                </p>

                <p>
                  Their contribution and loan records will remain
                  available for accounting and reporting.
                </p>

                <div style={actionRow}>
                  <button
                    className="ubc-button-secondary"
                    onClick={closeModal}
                    disabled={busy}
                  >
                    Cancel
                  </button>

                  <button
                    className="ubc-button-primary"
                    disabled={busy}
                    onClick={() =>
                      changeMembership("deactivate")
                    }
                  >
                    {busy ? "Updating..." : "Set Inactive"}
                  </button>
                </div>
              </>
            )}

            {modal === "reactivate" && (
              <>
                <p>
                  Reactivating this member will restore their
                  access to the member portal.
                </p>

                <div style={actionRow}>
                  <button
                    className="ubc-button-secondary"
                    onClick={closeModal}
                    disabled={busy}
                  >
                    Cancel
                  </button>

                  <button
                    className="ubc-button-primary"
                    disabled={busy}
                    onClick={() =>
                      changeMembership("reactivate")
                    }
                  >
                    {busy ? "Updating..." : "Reactivate Member"}
                  </button>
                </div>
              </>
            )}

            {modal === "delete" && (
              <>
                <p>
                  Permanently deleting a member cannot
                  be undone.
                </p>

                <p>
                  <strong>
                    Deletion is only allowed when the member
                    has no contributions, loan applications
                    or loan history.
                  </strong>
                </p>

                <p>
                  If they contributed money or borrowed funds,
                  use <strong>Set Inactive</strong> instead.
                </p>

                <label
                  htmlFor="confirm-delete"
                  style={{
                    display:"block",
                    fontWeight:700,
                    marginBottom:8
                  }}
                >
                  Type DELETE to confirm
                </label>

                <input
                  id="confirm-delete"
                  value={deleteConfirmation}
                  onChange={(e) =>
                    setDeleteConfirmation(e.target.value)
                  }
                  placeholder="DELETE"
                  autoComplete="off"
                  style={{
                    width:"100%",
                    padding:13,
                    borderRadius:10,
                    border:"1px solid var(--theme-border,#ccc)",
                    marginBottom:20
                  }}
                />

                <div style={actionRow}>
                  <button
                    className="ubc-button-secondary"
                    disabled={busy}
                    onClick={closeModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      deleteConfirmation !== "DELETE"
                    }
                    onClick={() =>
                      changeMembership("delete")
                    }
                    style={{
                      background:"#b4232d",
                      color:"#fff",
                      border:0,
                      borderRadius:10,
                      padding:"12px 18px",
                      cursor:
                        deleteConfirmation === "DELETE"
                          ? "pointer"
                          : "not-allowed",
                      opacity:
                        deleteConfirmation === "DELETE" ? 1 : 0.5
                    }}
                  >
                    <Trash2 size={15}/>
                    {" "}
                    {busy ? "Deleting..." : "Delete Permanently"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

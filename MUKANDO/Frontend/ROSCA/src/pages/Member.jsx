
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, UserCheck, UserRoundPlus, Clock3,
  Search, Plus, X, Banknote, History, RefreshCw
} from "lucide-react";
import { apiRequest } from "../utils/api";

const cash = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const date = (value) =>
  value ? String(value).slice(0, 10) : "—";

export default function Member() {
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      const [m, c, s] = await Promise.all([
        apiRequest("/members"),
        apiRequest("/admin/contributions"),
        apiRequest("/savings-cycles")
      ]);
      if (!Array.isArray(m) || !Array.isArray(c) || !Array.isArray(s)) {
        throw new Error("Unexpected data returned by the backend");
      }
      setMembers(m);
      setContributions(c);
      setCycles(s);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeCycle = cycles.find((c) => c.status === "active");
  const sharePrice = Number(activeCycle?.share_price || 0);
  const amountNumber = Number(amount);
  const calculatedShares =
    amount.trim() && Number.isFinite(amountNumber) &&
    amountNumber > 0 && sharePrice > 0 &&
    Math.abs(amountNumber / sharePrice -
      Math.round(amountNumber / sharePrice)) < 1e-8
      ? Math.round(amountNumber / sharePrice)
      : null;

  const counts = {
    active: members.filter((m) => m.status === "active").length,
    pending: members.filter((m) => m.status === "pending").length,
    inactive: members.filter((m) => m.status === "inactive").length
  };

  const filtered = members.filter((m) =>
    m.status === tab &&
    `${m.full_name} ${m.email} ${m.user_id}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const memberHistory = selected
    ? contributions.filter(
        (c) => Number(c.user_id) === Number(selected.user_id)
      )
    : [];

  const verifiedTotal = members.reduce(
    (sum, m) => sum + Number(m.total_contributions || 0), 0
  );

  const verifiedShares = members.reduce(
    (sum, m) => sum + Number(m.total_shares || 0), 0
  );

  function openCash(member) {
    setSelected(member);
    setAmount("");
    setReceiptRef(crypto.randomUUID());
    setError("");
    setModal("cash");
  }

  async function recordCash(event) {
    event.preventDefault();
    if (busy) return;
    if (calculatedShares === null) {
      setError("Enter cash that buys a whole number of shares.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest("/admin/cash-contributions", {
        method: "POST",
        body: JSON.stringify({
          user_id: selected.user_id,
          amount,
          receipt_reference: receiptRef
        })
      });
      await load();
      setModal("");
      setSuccess(result.message || "Cash contribution recorded.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function review(id, action) {
    if (busy) return;
    const member = members.find((m) => m.user_id === id);
    if (!member) return;
    if (action === "reject" && !window.confirm(
      `Reject ${member.full_name}'s registration?`
    )) return;

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiRequest(
        `/admin/members/${id}/${action}`,
        { method: "PATCH" }
      );
      await load();
      setSuccess(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const stats = [
    { label: "Total Members", value: members.length, icon: Users },
    { label: "Active Members", value: counts.active, icon: UserCheck },
    { label: "Verified Cash Received", value: cash(verifiedTotal), icon: Banknote },
    { label: "Total Shares", value: verifiedShares.toLocaleString(), icon: Clock3 }
  ];

  return (
    <div className="ubc-page">
      <div className="ubc-page-heading">
        <div>
          <h1>Member Management</h1>
          <p>Manage registrations, cash contributions and member shares.</p>
        </div>
        <Link to="/admin/memberform" className="ubc-button-primary"
          style={{display:"inline-flex",alignItems:"center",gap:8,textDecoration:"none"}}>
          <UserRoundPlus size={18}/> Add Member
        </Link>
      </div>

      <div className="ubc-cards">
        {stats.map(({label,value,icon:Icon}) => (
          <div className="ubc-card" key={label}>
            <div className="ubc-card-top">
              <span>{label}</span>
              <span className="ubc-card-icon"><Icon size={19}/></span>
            </div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      {error && <div className="ubc-alert error" role="alert">{error}</div>}
      {success && <div className="ubc-alert success">{success}</div>}

      <section className="ubc-panel" style={{marginTop:22}}>
        <div className="ubc-panel-title">
          <h2>Registered Members</h2>
          <button type="button" className="ubc-button-secondary" onClick={load}>
            <RefreshCw size={15}/> Refresh
          </button>
        </div>

        <div style={{display:"flex",gap:9,flexWrap:"wrap",margin:"18px 0"}}>
          {["active","pending","inactive"].map((item) => (
            <button
              key={item}
              type="button"
              className={tab === item ? "ubc-button-primary" : "ubc-button-secondary"}
              onClick={() => setTab(item)}
            >
              {item[0].toUpperCase()+item.slice(1)} ({counts[item]})
            </button>
          ))}
        </div>

        <div style={{position:"relative",maxWidth:390,marginBottom:18}}>
          <Search size={17} style={{
            position:"absolute",top:14,left:12,color:"#85858e"
          }}/>
          <input className="ubc-search" style={{paddingLeft:39,width:"100%"}}
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}/>
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
                <tr><td colSpan="6">Loading members...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6">No members in this category.</td></tr>
              ) : filtered.map((member) => (
                <tr key={member.user_id}>
                  <td>
                    <strong>{member.full_name}</strong>
                    <div style={{fontSize:12,color:"var(--ubc-muted)",marginTop:5}}>
                      {member.email} · #{member.user_id}
                    </div>
                  </td>
                  <td>{member.phone || "—"}</td>
                  <td><strong>{cash(member.total_contributions)}</strong></td>
                  <td>{Number(member.total_shares || 0).toLocaleString()}</td>
                  <td>
                    <span className={`ubc-status ${member.status}`}>
                      {member.status}
                    </span>
                  </td>
                  <td>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                      {member.status === "pending" && (
                        <>
                          <button className="ubc-button-primary" disabled={busy}
                            onClick={() => review(member.user_id,"approve")}>
                            Approve
                          </button>
                          <button className="ubc-button-secondary" disabled={busy}
                            onClick={() => review(member.user_id,"reject")}>
                            Reject
                          </button>
                        </>
                      )}
                      <button className="ubc-button-secondary" onClick={() => {
                        setSelected(member);
                        setModal("history");
                      }}>
                        <History size={15}/> History
                      </button>
                      {member.status === "active" && (
                        <button className="ubc-button-primary"
                          onClick={() => openCash(member)}>
                          <Plus size={15}/> Record Cash
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal === "cash" && selected && (
        <div className="ubc-modal-backdrop">
          <div className="ubc-modal" role="dialog" aria-modal="true">
            <div className="ubc-panel-title">
              <h2>Record Cash Contribution</h2>
              <button type="button" className="ubc-button-secondary"
                disabled={busy} onClick={() => setModal("")}>
                <X size={16}/>
              </button>
            </div>
            <p>Member: <strong>{selected.full_name}</strong></p>
            <p>
              Current cycle: <strong>{activeCycle?.cycle_year || "None"}</strong>
              {" · "}Share price: <strong>{cash(sharePrice)}</strong>
            </p>
            <form onSubmit={recordCash}>
              <div className="ubc-field">
                <label htmlFor="member-cash">Cash Received</label>
                <input id="member-cash" type="number" min="0.01" step="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount physically received" required/>
              </div>
              <div className="ubc-card" style={{margin:"16px 0"}}>
                <small>Shares to be credited</small>
                <strong>{calculatedShares ?? "—"}</strong>
                <small>Calculated and validated again by the backend</small>
              </div>
              <p style={{fontSize:13,color:"var(--ubc-muted)"}}>
                Confirm only after counting the cash. This is a verified
                financial record and should not be entered twice.
              </p>
              <div className="ubc-modal-actions">
                <button type="button" className="ubc-button-secondary"
                  disabled={busy} onClick={() => setModal("")}>Cancel</button>
                <button type="submit" className="ubc-button-primary"
                  disabled={busy || calculatedShares === null}>
                  {busy ? "Recording..." : "Confirm Cash Received"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "history" && selected && (
        <div className="ubc-modal-backdrop">
          <div className="ubc-modal" role="dialog" aria-modal="true">
            <div className="ubc-panel-title">
              <h2>{selected.full_name} — Contributions</h2>
              <button className="ubc-button-secondary" onClick={() => setModal("")}>
                <X size={16}/>
              </button>
            </div>
            <div className="ubc-table-wrap">
              <table className="ubc-table">
                <thead><tr>
                  <th>Date</th><th>Cash</th><th>Shares</th>
                  <th>Cycle</th><th>Status</th><th>Receipt</th>
                </tr></thead>
                <tbody>
                  {memberHistory.length === 0 ? (
                    <tr><td colSpan="6">No contributions recorded.</td></tr>
                  ) : memberHistory.map((c) => (
                    <tr key={c.contribution_id}>
                      <td>{date(c.payment_date)}</td>
                      <td>{cash(c.amount)}</td>
                      <td>{c.number_of_shares}</td>
                      <td>{c.cycle_year}</td>
                      <td><span className={`ubc-status ${c.status}`}>{c.status}</span></td>
                      <td>{c.payment_reference || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ubc-modal-actions">
              <button className="ubc-button-secondary" onClick={() => setModal("")}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

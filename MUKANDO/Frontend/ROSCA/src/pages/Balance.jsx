
import { useCallback, useEffect, useState } from "react";
import {
  Wallet, Plus, Banknote, Coins, ArrowDownLeft,
  ArrowUpRight, RefreshCw, X, History, AlertTriangle
} from "lucide-react";
import { apiRequest } from "../utils/api";

const cash = (v) => Number(v || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});
const date = (v) => v ? String(v).slice(0,10) : "—";

const grid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",
  gap:16
};
const muted = {fontSize:13,color:"var(--ubc-muted)",lineHeight:1.6};

export default function Balance() {
  const [dashboard,setDashboard] = useState(null);
  const [members,setMembers] = useState([]);
  const [contributions,setContributions] = useState([]);
  const [cycles,setCycles] = useState([]);
  const [loans,setLoans] = useState([]);
  const [modal,setModal] = useState(false);
  const [memberId,setMemberId] = useState("");
  const [amount,setAmount] = useState("");
  const [receiptRef,setReceiptRef] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      const [d,m,c,s,l] = await Promise.all([
        apiRequest("/dashboard"),
        apiRequest("/members"),
        apiRequest("/admin/contributions"),
        apiRequest("/savings-cycles"),
        apiRequest("/admin/loan-ledger")
      ]);
      if (!d || !Array.isArray(m) || !Array.isArray(c) ||
          !Array.isArray(s) || !Array.isArray(l)) {
        throw new Error("Invalid financial data returned");
      }
      setDashboard(d);
      setMembers(m);
      setContributions(c);
      setCycles(s);
      setLoans(l);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cycle = cycles.find(c => c.status === "active");
  const sharePrice = Number(cycle?.share_price || 0);
  const entered = Number(amount);
  const shares =
    amount.trim() && entered > 0 &&
    Number.isFinite(entered) && sharePrice > 0 &&
    Math.abs(entered / sharePrice - Math.round(entered / sharePrice)) < 1e-8
      ? Math.round(entered / sharePrice)
      : null;

  const verified = contributions.filter(c => c.status === "verified");
  const pending = contributions.filter(c => c.status === "pending");

  const totalVerified = verified.reduce(
    (sum,c) => sum + Number(c.amount || 0), 0
  );
  const totalShares = verified.reduce(
    (sum,c) => sum + Number(c.number_of_shares || 0), 0
  );
  const owed = loans.reduce(
    (sum,l) => sum + Number(l.total_owed || 0), 0
  );

  function openCash() {
    setMemberId("");
    setAmount("");
    setReceiptRef(crypto.randomUUID());
    setError("");
    setModal(true);
  }

  async function recordCash(event) {
    event.preventDefault();
    if (busy) return;
    if (!memberId || shares === null) {
      setError("Select a member and enter a valid whole-share cash amount.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest("/admin/cash-contributions",{
        method:"POST",
        body:JSON.stringify({
          user_id:Number(memberId),
          amount,
          receipt_reference:receiptRef
        })
      });
      await load();
      setModal(false);
      setSuccess(response.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const cards = [
    {label:"Verified Contributions",value:totalVerified,icon:Coins},
    {label:"Cash Disbursed",value:dashboard?.totalIssued,icon:ArrowUpRight},
    {label:"Loan Repayments Received",
      value:Number(dashboard?.principalRepaid || 0) +
      Number(dashboard?.interestEarned || 0),icon:ArrowDownLeft},
    {label:"Outstanding Loans",value:owed,icon:Wallet}
  ];

  return (
    <div className="ubc-page">
      <div className="ubc-page-heading">
        <div>
          <h1>Fund Balance</h1>
          <p>Track cash share contributions and lending activity.</p>
        </div>
        <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
          <button className="ubc-button-secondary" onClick={load}>
            <RefreshCw size={16}/> Refresh
          </button>
          <button className="ubc-button-primary" onClick={openCash}>
            <Plus size={17}/> Record Cash Contribution
          </button>
        </div>
      </div>

      {error && <div className="ubc-alert error" role="alert">{error}</div>}
      {success && <div className="ubc-alert success">{success}</div>}

      {loading ? (
        <section className="ubc-panel">Loading fund records...</section>
      ) : dashboard && (
        <>
          <div style={{
            background:"linear-gradient(125deg,#17171c,#501a30)",
            borderRadius:20,color:"white",padding:"28px 30px",margin:"20px 0"
          }}>
            <div style={{fontSize:12,letterSpacing:1.2,color:"#edced8"}}>
              ESTIMATED AVAILABLE FUNDS
            </div>
            <div style={{
              fontSize:"clamp(30px,5vw,46px)",fontWeight:800,
              margin:"12px 0",fontVariantNumeric:"tabular-nums"
            }}>
              {cash(dashboard.availableFunds)}
            </div>
            <p style={{color:"#eedce2",fontSize:13,margin:0}}>
              Calculated from recorded transactions. Not yet reconciled
              against physical cash in hand.
            </p>
          </div>

          <div className="ubc-cards" style={grid}>
            {cards.map(({label,value,icon:Icon}) => (
              <div className="ubc-card" key={label}>
                <div className="ubc-card-top">
                  <span>{label}</span>
                  <span className="ubc-card-icon"><Icon size={19}/></span>
                </div>
                <strong>{cash(value)}</strong>
              </div>
            ))}
          </div>

          <div style={{...grid,gridTemplateColumns:
            "repeat(auto-fit,minmax(300px,1fr))",marginTop:22}}>
            <section className="ubc-panel">
              <div className="ubc-panel-title">
                <h2>Cash Contributions</h2>
                <Coins size={19}/>
              </div>
              {[
                ["Verified Cash",cash(totalVerified)],
                ["Verified Shares",totalShares.toLocaleString()],
                ["Pending Contributions",pending.length],
                ["Current Savings Cycle",cycle?.cycle_year || "None"],
                ["Current Share Price",cash(sharePrice)]
              ].map(([label,value]) => (
                <div key={label} style={{
                  display:"flex",justifyContent:"space-between",
                  gap:12,padding:"14px 0",
                  borderBottom:"1px solid var(--ubc-border,#e8e8ee)"
                }}>
                  <span style={muted}>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>

            <section className="ubc-panel">
              <div className="ubc-panel-title">
                <h2>Fund Breakdown</h2>
                <Banknote size={19}/>
              </div>
              {[
                ["Verified Contributions",dashboard.totalContributions],
                ["Principal Repaid",dashboard.principalRepaid],
                ["Interest Received",dashboard.interestEarned],
                ["Loans Disbursed",dashboard.totalIssued],
                ["Verified Expenses",dashboard.totalExpenses]
              ].map(([label,value]) => (
                <div key={label} style={{
                  display:"flex",justifyContent:"space-between",
                  padding:"14px 0",gap:12,
                  borderBottom:"1px solid var(--ubc-border,#e8e8ee)"
                }}>
                  <span style={muted}>{label}</span>
                  <strong>{cash(value)}</strong>
                </div>
              ))}
              <p style={{...muted,marginTop:16}}>
                The backend also deducts recorded distribution payments
                from its available-funds estimate.
              </p>
            </section>
          </div>

          <section className="ubc-panel" style={{marginTop:22}}>
            <div className="ubc-panel-title">
              <h2>Cash Contribution History</h2>
              <span>{contributions.length} records</span>
            </div>
            <div className="ubc-table-wrap">
              <table className="ubc-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Member</th><th>Cash Received</th>
                    <th>Shares</th><th>Cycle</th><th>Status</th><th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.length === 0 ? (
                    <tr><td colSpan="7">No contributions recorded yet.</td></tr>
                  ) : contributions.map((c) => (
                    <tr key={c.contribution_id}>
                      <td>{date(c.payment_date)}</td>
                      <td><strong>{c.full_name}</strong></td>
                      <td>{cash(c.amount)}</td>
                      <td>{c.number_of_shares}</td>
                      <td>{c.cycle_year}</td>
                      <td><span className={`ubc-status ${c.status}`}>{c.status}</span></td>
                      <td style={{fontSize:12}}>{c.payment_reference || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pending.length > 0 && (
              <p style={{...muted,display:"flex",gap:8,marginTop:18}}>
                <AlertTriangle size={16}/>
                Pending member-submitted contributions do not count
                toward verified fund totals.
              </p>
            )}
          </section>
        </>
      )}

      {modal && (
        <div className="ubc-modal-backdrop">
          <div className="ubc-modal" role="dialog" aria-modal="true">
            <div className="ubc-panel-title">
              <h2>Record Cash Contribution</h2>
              <button className="ubc-button-secondary" type="button"
                disabled={busy} onClick={() => setModal(false)}>
                <X size={17}/>
              </button>
            </div>

            <p>Choose the member who physically handed in the cash.</p>
            <form onSubmit={recordCash}>
              <div className="ubc-field">
                <label htmlFor="cash-member">Member</label>
                <select id="cash-member" value={memberId}
                  onChange={e => setMemberId(e.target.value)} required>
                  <option value="">Select member</option>
                  {members.filter(m => m.status === "active").map(m => (
                    <option value={m.user_id} key={m.user_id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ubc-field">
                <label htmlFor="cash-amount">Cash Received</label>
                <input id="cash-amount" type="number" min="0.01" step="0.01"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="Enter actual amount received" required/>
              </div>

              <div className="ubc-card" style={{margin:"18px 0"}}>
                <small>Savings Cycle</small>
                <strong>{cycle?.cycle_year || "No active cycle"}</strong>
                <small>Share Price: {cash(sharePrice)}</small>
                <small>Shares Calculated</small>
                <strong>{shares ?? "—"}</strong>
              </div>

              <p style={muted}>
                Cash entries are immediately verified. Only confirm
                after counting the money and confirming the member.
              </p>

              <div className="ubc-modal-actions">
                <button type="button" className="ubc-button-secondary"
                  disabled={busy} onClick={() => setModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ubc-button-primary"
                  disabled={busy || !cycle || shares === null}>
                  {busy ? "Recording..." : "Confirm Cash Received"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

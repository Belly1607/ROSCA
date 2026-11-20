
import { useCallback, useEffect, useState } from "react";
import {
  FileBarChart2, Users, Coins, HandCoins, Wallet,
  Download, RefreshCw, TrendingUp, AlertTriangle
} from "lucide-react";
import { apiRequest } from "../utils/api";

const cash = (v) => Number(v || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});
const n = (v) => Number(v || 0);
const date = (v) => v ? String(v).slice(0,10) : "—";
const year = (v) => v ? Number(String(v).slice(0,4)) : null;

function csvDownload(name, headings, rows) {
  const escape = (value) => {
    const original = String(value ?? "");
    const safe = /^[\s]*[=+\-@\t\r]/.test(original)
      ? "'" + original
      : original;
    return `"${safe.replace(/"/g,'""')}"`;
  };
  const lines = [
    headings.map(escape).join(","),
    ...rows.map(row => row.map(escape).join(","))
  ];
  const blob = new Blob(["\uFEFF",lines.join("\r\n")],
    {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const reportGrid = {
  display:"grid",gridTemplateColumns:
  "repeat(auto-fit,minmax(210px,1fr))",gap:16
};

export default function Report() {
  const [members,setMembers] = useState([]);
  const [contributions,setContributions] = useState([]);
  const [loans,setLoans] = useState([]);
  const [applications,setApplications] = useState([]);
  const [dashboard,setDashboard] = useState(null);
  const [period,setPeriod] = useState("all");
  const [type,setType] = useState("contributions");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [m,c,l,a,d] = await Promise.all([
        apiRequest("/members"),
        apiRequest("/admin/contributions"),
        apiRequest("/admin/loan-ledger"),
        apiRequest("/loan-applications"),
        apiRequest("/dashboard")
      ]);
      if (!Array.isArray(m) || !Array.isArray(c) ||
          !Array.isArray(l) || !Array.isArray(a) || !d) {
        throw new Error("Invalid data returned by the backend");
      }
      setMembers(m);
      setContributions(c);
      setLoans(l);
      setApplications(a);
      setDashboard(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const years = [...new Set([
    new Date().getFullYear(),
    ...contributions.map(c => year(c.payment_date)),
    ...loans.map(l => year(l.issued_date)),
    ...members.map(m => year(m.created_at)),
    ...applications.map(a => year(a.applied_at))
  ])].filter(Boolean).sort((a,b) => b-a);

  const filterDate = (value) =>
    period === "all" || String(year(value)) === period;

  const filteredContributions = contributions.filter(
    c => filterDate(c.payment_date)
  );
  const verified = filteredContributions.filter(
    c => c.status === "verified"
  );
  const filteredLoans = loans.filter(l => filterDate(l.issued_date));
  const filteredMembers = members.filter(m => filterDate(m.created_at));
  const filteredApplications = applications.filter(
    a => filterDate(a.applied_at)
  );

  const contributionTotal = verified.reduce(
    (sum,c) => sum + n(c.amount),0
  );
  const shareTotal = verified.reduce(
    (sum,c) => sum + n(c.number_of_shares),0
  );
  const disbursed = filteredLoans.reduce(
    (sum,l) => sum + n(l.principal),0
  );
  const repaidOnSelectedLoans = filteredLoans.reduce(
    (sum,l) => sum + n(l.total_paid),0
  );
  const outstanding = filteredLoans.reduce(
    (sum,l) => sum + n(l.total_owed),0
  );

  const tableData = {
    contributions: {
      headings: ["Date","Member","Cash Amount","Shares","Cycle","Status","Receipt"],
      rows: filteredContributions.map(c => [
        date(c.payment_date),c.full_name,c.amount,
        c.number_of_shares,c.cycle_year,c.status,
        c.payment_reference || ""
      ])
    },
    members: {
      headings: ["Member ID","Member","Email","Status",
        "All-Time Verified Contributions","All-Time Shares","Joined"],
      rows: filteredMembers.map(m => [
        m.user_id,m.full_name,m.email,m.status,
        m.total_contributions,m.total_shares,date(m.created_at)
      ])
    },
    loans: {
      headings: ["Loan ID","Borrower","Disbursed","Paid",
        "Principal Remaining","Interest Remaining","Total Owed","Due Date","Status"],
      rows: filteredLoans.map(l => [
        l.loan_id,l.full_name,l.principal,l.total_paid,
        l.outstanding_principal,l.outstanding_interest,
        l.total_owed,date(l.due_date),l.status
      ])
    },
    applications: {
      headings: ["Application ID","Member","Amount","Status","Date","Reason"],
      rows: filteredApplications.map(a => [
        a.application_id,a.full_name,a.requested_amount,
        a.status,date(a.applied_at),a.reason
      ])
    }
  };

  const chosen = tableData[type];

  function exportReport() {
    csvDownload(
      `ubc-rosca-${type}-${period}.csv`,
      chosen.headings,
      chosen.rows
    );
  }

  const stats = [
    {label:"Verified Cash Contributions",value:cash(contributionTotal),icon:Coins},
    {label:"Shares Purchased",value:shareTotal.toLocaleString(),icon:TrendingUp},
    {label:"Loans Disbursed",value:cash(disbursed),icon:HandCoins},
    {label:"Outstanding Loans",value:cash(outstanding),icon:Wallet}
  ];

  return (
    <div className="ubc-page">
      <div className="ubc-page-heading">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Cash contributions, shares, members and lending records.</p>
        </div>
        <button type="button" className="ubc-button-secondary"
          disabled={busy} onClick={load}>
          <RefreshCw size={16}/> {busy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="ubc-alert error" role="alert">{error}</div>}

      <section className="ubc-panel" style={{margin:"20px 0"}}>
        <div className="ubc-panel-title">
          <h2>Report Controls</h2>
          <FileBarChart2 size={19}/>
        </div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:18,
          alignItems:"flex-end"}}>
          <div className="ubc-field" style={{flex:"1 1 185px"}}>
            <label htmlFor="r-year">Reporting Period</label>
            <select id="r-year" className="ubc-select" value={period}
              onChange={e => setPeriod(e.target.value)}>
              <option value="all">All Years</option>
              {years.map(y => (
                <option value={String(y)} key={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="ubc-field" style={{flex:"1 1 185px"}}>
            <label htmlFor="r-type">Report Type</label>
            <select id="r-type" className="ubc-select" value={type}
              onChange={e => setType(e.target.value)}>
              <option value="contributions">Contributions</option>
              <option value="members">Members</option>
              <option value="loans">Loans</option>
              <option value="applications">Loan Applications</option>
            </select>
          </div>
          <button type="button" className="ubc-button-primary"
            disabled={loading || Boolean(error)} onClick={exportReport}>
            <Download size={16}/> Export CSV
          </button>
        </div>
      </section>

      {loading ? <section className="ubc-panel">Loading reports...</section> : (
        <>
          <div className="ubc-cards" style={reportGrid}>
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

          <div style={{...reportGrid,
            gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",
            marginTop:22}}>
            <section className="ubc-panel">
              <div className="ubc-panel-title">
                <h2>Contribution Activity</h2>
                <Coins size={19}/>
              </div>
              {[
                ["Verified Transactions",verified.length],
                ["Verified Cash",cash(contributionTotal)],
                ["Shares Purchased",shareTotal],
                ["Pending Contributions",
                  filteredContributions.filter(c => c.status === "pending").length]
              ].map(([label,value]) => (
                <div key={label} style={{
                  display:"flex",justifyContent:"space-between",gap:10,
                  padding:"15px 0",
                  borderBottom:"1px solid var(--ubc-border,#e8e8ee)"
                }}>
                  <span style={{color:"var(--ubc-muted)"}}>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>

            <section className="ubc-panel">
              <div className="ubc-panel-title">
                <h2>Membership & Loans</h2>
                <Users size={19}/>
              </div>
              {[
                ["New Members in Period",filteredMembers.length],
                ["Loan Applications",filteredApplications.length],
                ["Loans Issued",filteredLoans.length],
                ["Repayments on Selected Loans",cash(repaidOnSelectedLoans)]
              ].map(([label,value]) => (
                <div key={label} style={{
                  display:"flex",justifyContent:"space-between",gap:10,
                  padding:"15px 0",
                  borderBottom:"1px solid var(--ubc-border,#e8e8ee)"
                }}>
                  <span style={{color:"var(--ubc-muted)"}}>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>
          </div>

          <section className="ubc-panel" style={{marginTop:22}}>
            <div className="ubc-panel-title">
              <h2>{type[0].toUpperCase()+type.slice(1)} Report</h2>
              <span>{chosen.rows.length} records</span>
            </div>
            <div className="ubc-table-wrap">
              <table className="ubc-table">
                <thead><tr>
                  {chosen.headings.map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {chosen.rows.length === 0 ? (
                    <tr><td colSpan={chosen.headings.length}>
                      No records for this period.
                    </td></tr>
                  ) : chosen.rows.map((row,index) => (
                    <tr key={index}>
                      {row.map((value,i) => (
                        <td key={i}>{value == null ? "—" : String(value)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div style={{
            display:"flex",alignItems:"flex-start",gap:10,
            marginTop:20,padding:18,
            border:"1px solid var(--ubc-border,#e8e8ee)",
            borderRadius:14
          }}>
            <AlertTriangle size={18} color="#a61e42"/>
            <p style={{margin:0,fontSize:13,color:"var(--ubc-muted)",
              lineHeight:1.6}}>
              Contribution figures use verified transactions dated within
              the selected period. The member export includes all-time
              share totals, while its year filter selects members by
              registration date. Repayments on selected loans are grouped
              by loan issue year, not the actual repayment year.
              Estimated available funds across all periods:{" "}
              <strong>{dashboard ? cash(dashboard.availableFunds) : "—"}</strong>.
              This is not an audited cash ledger.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

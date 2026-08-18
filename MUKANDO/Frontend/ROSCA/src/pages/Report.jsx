import { useEffect, useState } from "react";

function Report() {
    const [members, setMembers] = useState([]);
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [membersRes, loansRes] = await Promise.all([
                    fetch("http://localhost:5000/members"),
                    fetch("http://localhost:5000/loans")
                ]);

                const membersData = await membersRes.json();
                const loansData = await loansRes.json();

                setMembers(membersData);
                setLoans(loansData);
            } catch (err) {
                console.error("Failed to fetch report data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Derived stats from real data
    const activeLoans = loans.filter(l => l.statusapproval !== "repaid");
    const repaidLoans = loans.filter(l => l.statusapproval === "repaid");
    const outstandingBalance = activeLoans.reduce((sum, l) => sum + Number(l.amount), 0);

    const stats = [
        { label: "Active Members",      value: members.length,        icon: "👥", change: "Registered members" },
        { label: "Active Loans",        value: activeLoans.length,    icon: "🔑", change: "Pending repayment" },
        { label: "Repaid Loans",        value: repaidLoans.length,    icon: "✅", change: "Fully settled" },
        { label: "Outstanding Balance", value: `$${outstandingBalance.toLocaleString()}`, icon: "⏳", change: "Total active loan value" }
    ];

    // Build recent activities from loans — newest first
    const activities = [...loans]
        .sort((a, b) => b.id - a.id)
        .slice(0, 5)
        .map(loan => ({
            date: new Date(loan.created_at || Date.now()).toLocaleDateString(),
            member: `Member #${loan.member_id}`,
            activity: loan.statusapproval === "repaid" ? "Repayment" : "Loan Approved",
            amount: `$${Number(loan.amount).toLocaleString()}`,
            status: loan.statusapproval === "repaid" ? "completed" : "approved"
        }));

    if (loading) return <p style={{ padding: "2rem" }}>Loading report...</p>;

    return (
        <div className="report-page">
            <div className="report-hero">
                <h1>Welfare Reports</h1>
                <p>Community activities, financial trends, and impact metrics</p>
            </div>

            <div className="stats-section">
                <h2 className="section-title">Key Metrics</h2>
                <div className="stats-grid">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="stat-card">
                            <div className="stat-icon">{stat.icon}</div>
                            <h3 className="stat-label">{stat.label}</h3>
                            <p className="stat-value">{stat.value}</p>
                            <p className="stat-change">{stat.change}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="activities-section">
                <h2 className="section-title">Recent Activities</h2>
                <div className="activities-list">
                    {activities.length === 0 ? (
                        <p>No activities yet.</p>
                    ) : (
                        activities.map((activity, idx) => (
                            <div key={idx} className={`activity-item status-${activity.status}`}>
                                <div className="activity-left">
                                    <div className="activity-details">
                                        <h4 className="activity-member">{activity.member}</h4>
                                        <p className="activity-action">{activity.activity}</p>
                                        <p className="activity-date">{activity.date}</p>
                                    </div>
                                </div>
                                <div className="activity-right">
                                    <span className="activity-amount">{activity.amount}</span>
                                    <span className={`activity-badge badge-${activity.status}`}>
                                        {activity.status === "approved" ? "Approved" : "Completed"}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="report-footer">
                <div className="footer-content">
                    <h3>Need Detailed Reports?</h3>
                    <p>Generate custom reports for audits or archive purposes</p>
                </div>
                <div className="footer-buttons">
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        🖨️ Print
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Report;
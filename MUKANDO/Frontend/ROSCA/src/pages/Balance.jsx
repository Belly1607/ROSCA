import React, { useState, useEffect } from 'react';

function Balance() {
    const [animateCards, setAnimateCards] = useState(false);
    const [members, setMembers] = useState([]);
    const [loans, setLoans] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [membersRes, loansRes] = await Promise.all([
                    fetch("http://localhost:5000/members"),
                    fetch("http://localhost:5000/loans")
                ]);
                setMembers(await membersRes.json());
                setLoans(await loansRes.json());
            } catch (err) {
                console.error("Failed to fetch balance data", err);
            } finally {
                setAnimateCards(true);
            }
        };

        fetchData();
    }, []);

    // Derived financials
    const activeLoans = loans.filter(l => l.statusapproval !== "repaid");
    const repaidLoans = loans.filter(l => l.statusapproval === "repaid");

    const totalLoaned     = loans.reduce((sum, l) => sum + Number(l.amount), 0);
    const activeLoansAmt  = activeLoans.reduce((sum, l) => sum + Number(l.amount), 0);
    const repaidAmt       = repaidLoans.reduce((sum, l) => sum + Number(l.totalRepayment ?? l.amount), 0);
    const availableFunds  = repaidAmt - activeLoansAmt;

    const repaymentRate = totalLoaned > 0
        ? Math.round((repaidAmt / totalLoaned) * 100)
        : 0;

    const metrics = [
        {
            id: 1,
            label: 'Community Pool',
            value: repaidAmt.toLocaleString(),
            icon: '🤝',
            accent: 'primary',
            description: 'Collective savings for mutual support'
        },
        {
            id: 2,
            label: 'Active Loans',
            value: activeLoansAmt.toLocaleString(),
            icon: '🙏',
            accent: 'secondary',
            description: 'Members being helped right now'
        },
        {
            id: 3,
            label: 'Repayments',
            value: repaidAmt.toLocaleString(),
            icon: '✨',
            accent: 'success',
            description: 'Strong commitment from community'
        },
        {
            id: 4,
            label: 'Ready to Help',
            value: availableFunds > 0 ? availableFunds.toLocaleString() : '0',
            icon: '❤️',
            accent: 'primary',
            description: 'Available for next member in need'
        }
    ];

    const impact = [
        { label: 'Families Supported', value: members.length,      icon: '👨‍👩‍👧‍👦' },
        { label: 'Emergency Relief',   value: activeLoans.length,  icon: '🆘' },
        { label: 'Repayment Rate',     value: `${repaymentRate}%`, icon: '⭐' }
    ];

    const liquidityRate = totalLoaned > 0
        ? Math.min(Math.round((availableFunds / totalLoaned) * 100), 100)
        : 0;

    return (
        <div className="balance-page">
            <div className="balance-hero">
                <div className="hero-accent hero-accent-1"></div>
                <div className="hero-accent hero-accent-2"></div>

                <div className="hero-content">
                    <h1 className="hero-title">Community Welfare Fund</h1>
                    <p className="hero-subtitle">Building stronger neighborhoods through mutual care</p>
                </div>

                <div className="hero-stats">
                    <div className="hero-stat">
                        <span className="hero-value">{members.length}</span>
                        <span className="hero-label">Members</span>
                    </div>
                    <div className="hero-stat-divider"></div>
                    <div className="hero-stat">
                        <span className="hero-value">${(totalLoaned / 1000).toFixed(1)}K</span>
                        <span className="hero-label">Total Circulation</span>
                    </div>
                    <div className="hero-stat-divider"></div>
                    <div className="hero-stat">
                        <span className="hero-value">{activeLoans.length}</span>
                        <span className="hero-label">Active Loans</span>
                    </div>
                </div>
            </div>

            <div className="metrics-section">
                <h2 className="section-title">Financial Health</h2>
                <div className={`metrics-grid ${animateCards ? 'loaded' : ''}`}>
                    {metrics.map((metric) => (
                        <div
                            key={metric.id}
                            className={`metric-card accent-${metric.accent}`}
                            style={{ animationDelay: `${metric.id * 80}ms` }}
                        >
                            <div className="metric-icon">{metric.icon}</div>
                            <h3 className="metric-label">{metric.label}</h3>
                            <div className="metric-value">
                                <span className="currency">$</span>{metric.value}
                            </div>
                            <p className="metric-description">{metric.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="impact-section">
                <h2 className="section-title">Community Impact</h2>
                <p className="section-subtitle">Lives touched, needs met, hope restored</p>
                <div className="impact-grid">
                    {impact.map((item, idx) => (
                        <div key={idx} className="impact-card">
                            <div className="impact-icon">{item.icon}</div>
                            <div className="impact-stat">
                                <span className="impact-value">{item.value}</span>
                                <span className="impact-label">{item.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="health-section">
                <div className="health-card">
                    <div className="health-header">
                        <h3>Fund Stability</h3>
                        <span className="health-badge">
                            {repaymentRate >= 80 ? 'Excellent' : repaymentRate >= 50 ? 'Good' : 'Needs Attention'}
                        </span>
                    </div>
                    <div className="health-metrics">
                        <div className="health-item">
                            <span className="health-label">Liquidity</span>
                            <div className="health-bar">
                                <div className="health-fill" style={{ width: `${liquidityRate}%` }}></div>
                            </div>
                            <span className="health-value">{liquidityRate}%</span>
                        </div>
                        <div className="health-item">
                            <span className="health-label">Repayment Rate</span>
                            <div className="health-bar">
                                <div className="health-fill" style={{ width: `${repaymentRate}%` }}></div>
                            </div>
                            <span className="health-value">{repaymentRate}%</span>
                        </div>
                        <div className="health-item">
                            <span className="health-label">Active Borrowers</span>
                            <div className="health-bar">
                                <div className="health-fill" style={{ width: `${members.length > 0 ? Math.round((activeLoans.length / members.length) * 100) : 0}%` }}></div>
                            </div>
                            <span className="health-value">
                                {members.length > 0 ? Math.round((activeLoans.length / members.length) * 100) : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="cta-section">
                <div className="cta-content">
                    <h2>Ready to Make a Difference?</h2>
                    <p>Join our community welfare initiative. Together, we care for those in need.</p>
                </div>
                <div className="cta-buttons">
                    <button className="btn btn-primary">💝 Contribute to Fund</button>
                    <button className="btn btn-secondary">👥 View Members</button>
                </div>
            </div>
        </div>
    );
}

export default Balance;
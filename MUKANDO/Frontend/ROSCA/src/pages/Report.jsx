import React, { useState } from 'react';


function Report() {
    const [activeTab, setActiveTab] = useState('monthly');

    const stats = [
        { label: 'Active Members', value: '54', icon: '👥', change: '+3 this month' },
        { label: 'Active Loans', value: '12', icon: '🔑', change: '+2 new loans' },
        { label: 'Repaid This Month', value: '8', icon: '✅', change: '+15% from last month' },
        { label: 'Outstanding Balance', value: '$25K', icon: '⏳', change: 'On track for recovery' }
    ];

    const activities = [
        {
            date: '12/06/2026',
            member: 'John Doe',
            activity: 'Loan Approved',
            amount: '$500',
            status: 'approved',
            icon: '✨'
        },
        {
            date: '14/06/2026',
            member: 'Sarah Doe',
            activity: 'Repayment',
            amount: '$1,500',
            status: 'completed',
            icon: '✅'
        },
        {
            date: '15/06/2026',
            member: 'Michael Paul',
            activity: 'New Member',
            amount: '$100',
            status: 'joined',
            icon: '🎉'
        },
        {
            date: '16/06/2026',
            member: 'Grace Mwila',
            activity: 'Contribution',
            amount: '$2,000',
            status: 'completed',
            icon: '💝'
        },
        {
            date: '17/06/2026',
            member: 'David Chanda',
            activity: 'Partial Payment',
            amount: '$800',
            status: 'completed',
            icon: '📊'
        }
    ];

    const monthlyData = [
        { month: 'April', loans: 4, repayments: 3, contributions: 8 },
        { month: 'May', loans: 6, repayments: 5, contributions: 10 },
        { month: 'June', loans: 12, repayments: 8, contributions: 15 }
    ];

    return (
        <div className="report-page">
            {/* Hero Header */}
            <div className="report-hero">
                <div className="hero-accent"></div>
                <h1>Welfare Reports</h1>
                <p>Community activities, financial trends, and impact metrics</p>
            </div>

            {/* Key Statistics */}
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

            {/* Monthly Summary */}
            <div className="summary-section">
                <h2 className="section-title">Monthly Activity Trend</h2>
                <div className="summary-cards">
                    {monthlyData.map((data, idx) => (
                        <div key={idx} className="summary-card">
                            <h3>{data.month}</h3>
                            <div className="summary-stats">
                                <div className="summary-item">
                                    <span className="summary-icon">🔑</span>
                                    <div>
                                        <p className="summary-label">Loans</p>
                                        <p className="summary-number">{data.loans}</p>
                                    </div>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-icon">✅</span>
                                    <div>
                                        <p className="summary-label">Repaid</p>
                                        <p className="summary-number">{data.repayments}</p>
                                    </div>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-icon">💝</span>
                                    <div>
                                        <p className="summary-label">Contributions</p>
                                        <p className="summary-number">{data.contributions}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activities Table */}
            <div className="activities-section">
                <h2 className="section-title">Recent Activities</h2>
                
                <div className="activities-container">
                    <div className="activities-list">
                        {activities.map((activity, idx) => (
                            <div key={idx} className={`activity-item status-${activity.status}`}>
                                <div className="activity-left">
                                    <span className="activity-icon">{activity.icon}</span>
                                    <div className="activity-details">
                                        <h4 className="activity-member">{activity.member}</h4>
                                        <p className="activity-action">{activity.activity}</p>
                                        <p className="activity-date">{activity.date}</p>
                                    </div>
                                </div>
                                <div className="activity-right">
                                    <span className="activity-amount">{activity.amount}</span>
                                    <span className={`activity-badge badge-${activity.status}`}>
                                        {activity.status === 'approved' && 'Approved'}
                                        {activity.status === 'completed' && 'Completed'}
                                        {activity.status === 'joined' && 'Joined'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Report Footer */}
            <div className="report-footer">
                <div className="footer-content">
                    <h3>Need Detailed Reports?</h3>
                    <p>Generate custom reports for audits, member communications, or archive purposes</p>
                </div>
                <div className="footer-buttons">
                    <button className="btn btn-primary">📥 Download Report</button>
                    <button className="btn btn-secondary">🖨️ Print</button>
                </div>
            </div>
        </div>
    );
}

export default Report;

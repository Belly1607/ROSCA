import React, { useState, useEffect } from 'react';


function Balance() {
    const [animateCards, setAnimateCards] = useState(false);

    useEffect(() => {
        setAnimateCards(true);
    }, []);

    const metrics = [
        {
            id: 1,
            label: 'Community Pool',
            value: '4,000',
            icon: '🤝',
            accent: 'primary',
            description: 'Collective savings for mutual support'
        },
        {
            id: 2,
            label: 'Active Loans',
            value: '5,000',
            icon: '🙏',
            accent: 'secondary',
            description: 'Members being helped right now'
        },
        {
            id: 3,
            label: 'Repayments',
            value: '6,000',
            icon: '✨',
            accent: 'success',
            description: 'Strong commitment from community'
        },
        {
            id: 4,
            label: 'Ready to Help',
            value: '1,000',
            icon: '❤️',
            accent: 'primary',
            description: 'Available for next member in need'
        }
    ];

    const impact = [
        { label: 'Families Supported', value: '18', icon: '👨‍👩‍👧‍👦' },
        { label: 'Emergency Relief', value: '3', icon: '🆘' },
        { label: 'Member Satisfaction', value: '98%', icon: '⭐' }
    ];

    return (
        <div className="balance-page">
            {/* Hero Header */}
            <div className="balance-hero">
                <div className="hero-accent hero-accent-1"></div>
                <div className="hero-accent hero-accent-2"></div>
                
                <div className="hero-content">
                    <h1 className="hero-title">Community Welfare Fund</h1>
                    <p className="hero-subtitle">Building stronger neighborhoods through mutual care</p>
                </div>

                <div className="hero-stats">
                    <div className="hero-stat">
                        <span className="hero-value">24</span>
                        <span className="hero-label">Members</span>
                    </div>
                    <div className="hero-stat-divider"></div>
                    <div className="hero-stat">
                        <span className="hero-value">$16K</span>
                        <span className="hero-label">Total Circulation</span>
                    </div>
                    <div className="hero-stat-divider"></div>
                    <div className="hero-stat">
                        <span className="hero-value">4 yrs</span>
                        <span className="hero-label">Strong Track Record</span>
                    </div>
                </div>
            </div>

            {/* Main Metrics Cards */}
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

            {/* Impact Section */}
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

            {/* Fund Health Indicator */}
            <div className="health-section">
                <div className="health-card">
                    <div className="health-header">
                        <h3>Fund Stability</h3>
                        <span className="health-badge">Excellent</span>
                    </div>
                    <div className="health-metrics">
                        <div className="health-item">
                            <span className="health-label">Liquidity</span>
                            <div className="health-bar">
                                <div className="health-fill" style={{ width: '85%' }}></div>
                            </div>
                            <span className="health-value">85%</span>
                        </div>
                        <div className="health-item">
                            <span className="health-label">Repayment Rate</span>
                            <div className="health-bar">
                                <div className="health-fill" style={{ width: '96%' }}></div>
                            </div>
                            <span className="health-value">96%</span>
                        </div>
                        <div className="health-item">
                            <span className="health-label">Member Trust</span>
                            <div className="health-bar">
                                <div className="health-fill" style={{ width: '98%' }}></div>
                            </div>
                            <span className="health-value">98%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Call to Action */}
            <div className="cta-section">
                <div className="cta-content">
                    <h2>Ready to Make a Difference?</h2>
                    <p>Join our community welfare initiative. Together, we care for those in need.</p>
                </div>
                <div className="cta-buttons">
                    <button className="btn btn-primary">
                        💝 Contribute to Fund
                    </button>
                    <button className="btn btn-secondary">
                        👥 View Members
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Balance;

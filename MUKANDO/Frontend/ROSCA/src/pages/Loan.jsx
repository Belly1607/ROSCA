import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoanForm from "../components/LoanForm";


export default function Loan() {
    const [loans, setLoans] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const navigate = useNavigate();

    const handleLoanSubmit = (data) => {
        const newLoan = {
            ...data,
            id: Date.now(),
            status: "pending",
            appliedDate: new Date().toLocaleDateString()
        };
        setLoans((prevLoans) => [newLoan, ...prevLoans]);
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
    };

    return (
        <div className="loan-page">
            {/* Hero Header */}
            <div className="loan-hero">
                <div className="hero-accent"></div>
                <h1>Welfare Loan Program</h1>
                <p>Fast, fair lending to support community members in times of need</p>
            </div>

            {/* Info Cards */}
            <div className="loan-info-section">
                <div className="info-card">
                    <span className="info-icon">⚡</span>
                    <h3>Quick Process</h3>
                    <p>Apply online, get approved in 3-5 days</p>
                </div>
                <div className="info-card">
                    <span className="info-icon">💯</span>
                    <h3>Transparent Rates</h3>
                    <p>Clear interest rates, no hidden fees</p>
                </div>
                <div className="info-card">
                    <span className="info-icon">🤝</span>
                    <h3>Community First</h3>
                    <p>Flexible repayment terms for members</p>
                </div>
            </div>

            {/* Success Message */}
            {submitted && (
                <div className="success-banner">
                    <span className="success-icon">✅</span>
                    <div className="success-content">
                        <h3>Application Submitted!</h3>
                        <p>Your loan application has been received. You'll hear from our committee soon.</p>
                    </div>
                </div>
            )}

            {/* Loan Form */}
            <div className="loan-form-section">
                <LoanForm onSubmit={handleLoanSubmit} />
            </div>

            {/* Loan History */}
            {loans.length > 0 && (
                <div className="loan-history-section">
                    <h2 className="section-title">Your Loan Applications</h2>
                    <div className="loan-history-grid">
                        {loans.map((loan) => (
                            <div key={loan.id} className="loan-history-card">
                                <div className="history-header">
                                    <h3>Loan Application</h3>
                                    <span className={`status-badge status-${loan.status}`}>
                                        {loan.status === "pending" ? "⏳ Pending" : "✅ Approved"}
                                    </span>
                                </div>

                                <div className="history-items">
                                    <div className="history-item">
                                        <span className="history-label">Amount</span>
                                        <span className="history-value">$ {loan.amount.toLocaleString()}</span>
                                    </div>

                                    <div className="history-item">
                                        <span className="history-label">Duration</span>
                                        <span className="history-value">{loan.duration} months</span>
                                    </div>

                                    <div className="history-item">
                                        <span className="history-label">Interest Rate</span>
                                        <span className="history-value">{loan.interestRate}%</span>
                                    </div>

                                    <div className="history-item">
                                        <span className="history-label">Total Repayment</span>
                                        <span className="history-value highlight">$ {loan.totalRepayment.toFixed(2)}</span>
                                    </div>

                                    <div className="history-divider"></div>

                                    <div className="history-item full-width">
                                        <span className="history-label">Purpose</span>
                                        <p className="history-text">{loan.reason}</p>
                                    </div>

                                    <div className="history-item">
                                        <span className="history-label">Applied Date</span>
                                        <span className="history-value">{loan.appliedDate}</span>
                                    </div>
                                </div>

                                <div className="history-footer">
                                    <p className="monthly-payment">
                                        Monthly Payment: <strong>$ {(loan.totalRepayment / loan.duration).toFixed(2)}</strong>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FAQ Section */}
            <div className="loan-faq-section">
                <h2 className="section-title">Frequently Asked Questions</h2>
                <div className="faq-grid">
                    <div className="faq-item">
                        <h4>❓ Who can apply?</h4>
                        <p>Active members of our community welfare program in good standing</p>
                    </div>
                    <div className="faq-item">
                        <h4>💰 What's the maximum loan amount?</h4>
                        <p>Up to $1,200 depending on your contribution history and creditworthiness</p>
                    </div>
                    <div className="faq-item">
                        <h4>⏱️ How long does approval take?</h4>
                        <p>3-5 business days after submission. You'll be notified via phone/email</p>
                    </div>
                    <div className="faq-item">
                        <h4>🎯 Can I repay early?</h4>
                        <p>Yes! Early repayment is encouraged with no penalties. You'll save on interest.</p>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="loan-cta">
                <h2>Questions or Need Help?</h2>
                <p>Contact our welfare committee for guidance on your application</p>
                <button className="btn btn-primary" onClick={() => navigate('/member')}>
                    👥 Contact Committee
                </button>
            </div>
        </div>
    );
}

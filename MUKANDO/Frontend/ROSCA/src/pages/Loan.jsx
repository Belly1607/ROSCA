import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoanForm from "../components/LoanForm";

export default function Loan() {

    const [loans, setLoans] = useState([]);
    const [submitted, setSubmitted] = useState(false);

    const navigate = useNavigate();

    const fetchLoans = () => {
        fetch("http://localhost:5000/loans")
            .then((res) => res.json())
            .then((data) => setLoans(data))
            .catch((err) => console.error(err));
    };

    useEffect(() => {
        fetchLoans();
    }, []);

    const handleLoanSubmit = () => {

        fetchLoans();

        setSubmitted(true);

        setTimeout(() => {
            setSubmitted(false);
        }, 3000);
    };

    return (
        <div className="loan-page">

            {/* Hero Section */}
            <div className="loan-hero">
                <div className="hero-accent"></div>

                <h1>Welfare Loan Program</h1>

                <p>
                    Fast, fair lending to support members
                    during times of need.
                </p>
            </div>

            <div className="loan-info-section">

                <div className="info-card">
                    <span className="info-icon">⚡</span>

                    <h3>Quick Process</h3>

                    <p>
                        Applications reviewed within
                        3–5 working days.
                    </p>
                </div>

                <div className="info-card">
                    <span className="info-icon">💯</span>

                    <h3>Transparent Rates</h3>

                    <p>
                        Clear interest calculations
                        with no hidden charges.
                    </p>
                </div>

                <div className="info-card">
                    <span className="info-icon">🤝</span>

                    <h3>Community First</h3>

                    <p>
                        Flexible repayment plans
                        designed for members.
                    </p>
                </div>

            </div>

            {submitted && (

                <div className="success-banner">

                    <span className="success-icon">
                        ✅
                    </span>

                    <div>
                        <h3>Loan Submitted</h3>

                        <p>
                            Your application has been
                            successfully recorded.
                        </p>
                    </div>

                </div>

            )}

            <div className="loan-form-section">
                <LoanForm onSubmit={handleLoanSubmit} />
            </div>

            {/* Loan History */}
            <div className="loan-history-section">

                <h2 className="section-title">
                    Loan Applications
                </h2>

                {loans.length === 0 ? (

                    <div className="empty-state">
                        No loan applications found.
                    </div>

                ) : (

                    <div className="loan-history-grid">

                        {loans.map((loan) => (

                            <div
                                key={loan.id}
                                className="loan-history-card"
                            >

                                <div className="history-header">

                                    <h3>
                                        Loan #{loan.id}
                                    </h3>

                                    <span
                                        className={`status-badge status-${loan.statusapproval?.toLowerCase()}`}
                                    >
                                        {loan.statusapproval}
                                    </span>

                                </div>

                                <div className="history-items">

                                    <div className="history-item">
                                        <span className="history-label">
                                            Amount
                                        </span>

                                        <span className="history-value">
                                            $
                                            {Number(
                                                loan.amount
                                            ).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="history-item">
                                        <span className="history-label">
                                            Duration
                                        </span>

                                        <span className="history-value">
                                            {loan.duration} Months
                                        </span>
                                    </div>

                                    <div className="history-item">
                                        <span className="history-label">
                                            Interest Rate
                                        </span>

                                        <span className="history-value">
                                            {loan.interest_rate}%
                                        </span>
                                    </div>

                                    <div className="history-item">
                                        <span className="history-label">
                                            Total Repayment
                                        </span>

                                        <span className="history-value highlight">
                                            $
                                            {Number(
                                                loan.total_repayment
                                            ).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="history-divider"></div>

                                    <div className="history-item full-width">

                                        <span className="history-label">
                                            Reason
                                        </span>

                                        <p className="history-text">
                                            {loan.reason}
                                        </p>

                                    </div>

                                    <div className="history-item">

                                        <span className="history-label">
                                            Applied Date
                                        </span>

                                        <span className="history-value">
                                            {new Date(
                                                loan.date_applied
                                            ).toLocaleDateString()}
                                        </span>

                                    </div>

                                </div>

                                <div className="history-footer">

                                    <p className="monthly-payment">

                                        Monthly Payment:

                                        <strong>
                                            {" "}
                                            $
                                            {(
                                                loan.total_repayment /
                                                loan.duration
                                            ).toFixed(2)}
                                        </strong>

                                    </p>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </div>

            {/* FAQ */}
            <div className="loan-faq-section">

                <h2 className="section-title">
                    Frequently Asked Questions
                </h2>

                <div className="faq-grid">

                    <div className="faq-item">
                        <h4>❓ Who can apply?</h4>

                        <p>
                            Active welfare members in
                            good standing.
                        </p>
                    </div>

                    <div className="faq-item">
                        <h4>💰 Maximum Loan?</h4>

                        <p>
                            Based on contribution history
                            and approval committee review.
                        </p>
                    </div>

                    <div className="faq-item">
                        <h4>⏱️ Approval Time?</h4>

                        <p>
                            Normally between
                            3–5 working days.
                        </p>
                    </div>

                    <div className="faq-item">
                        <h4>🎯 Early Repayment?</h4>

                        <p>
                            Yes. No penalties apply for
                            early settlement.
                        </p>
                    </div>

                </div>

            </div>

            <div className="loan-cta">

                <h2>Need Assistance?</h2>

                <p>
                    Contact the welfare committee
                    for support.
                </p>

                <button
                    className="btn btn-primary"
                    onClick={() => navigate("/member")}
                >
                    Contact Committee
                </button>

            </div>

        </div>
    );
}
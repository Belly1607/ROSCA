import { useEffect, useState } from "react";
import LoanForm from "../components/LoanForm";

function Loan() {
    const [loans, setLoans] = useState([]);

    const fetchLoans = async () => {
        try {
            const response = await fetch("http://localhost:5000/loans");
            const data = await response.json();
            setLoans(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchLoans();
    }, []);

    return (
        <div className="loan-page">
            <div className="loan-hero">
                <div className="hero-accent"></div>
                <h1>Loan Management</h1>
                <p>Apply for a loan or review submitted applications</p>
            </div>

            <div className="loan-info-section">
                <div className="info-card">
                    <span className="info-icon">💰</span>
                    <h3>Flexible Amounts</h3>
                    <p>Borrow what you need, repaid over a comfortable duration</p>
                </div>
                <div className="info-card">
                    <span className="info-icon">📅</span>
                    <h3>20% Interest</h3>
                    <p>Applied only on loans with duration of 3 months or more</p>
                </div>
                <div className="info-card">
                    <span className="info-icon">✅</span>
                    <h3>Quick Approval</h3>
                    <p>Applications reviewed promptly by the welfare committee</p>
                </div>
            </div>

            <div className="loan-form-section">
                <div className="loan-form-wrapper">
                    <LoanForm onLoanAdded={fetchLoans} />
                </div>
            </div>

            <div className="loan-history-section">
                <h2 className="section-title">Submitted Loans</h2>
                <div className="loan-history-grid">
                    {loans.length === 0 ? (
                        <p style={{ color: "var(--gray-500)" }}>No loans submitted yet.</p>
                    ) : (
                        loans.map((loan) => (
                            <div key={loan.id} className="loan-history-card">
                                <div className="history-header">
                                    <h3>Loan #{loan.id}</h3>
                                    <span className={`status-badge ${
                                        loan.statusapproval === "repaid"
                                            ? "status-completed"
                                            : "status-pending"
                                    }`}>
                                        {loan.statusapproval}
                                    </span>
                                </div>
                                <div className="history-items">
                                    <div className="history-item">
                                        <span className="history-label">Member ID</span>
                                        <span className="history-value">{loan.member_id}</span>
                                    </div>
                                    <div className="history-item">
                                        <span className="history-label">Amount</span>
                                        <span className="history-value highlight">
                                            ${Number(loan.amount).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="history-item">
                                        <span className="history-label">Duration</span>
                                        <span className="history-value">{loan.duration} months</span>
                                    </div>
                                    <div className="history-item">
                                        <span className="history-label">Interest Rate</span>
                                        <span className="history-value">{loan.interest_rate}%</span>
                                    </div>
                                    <div className="history-divider"></div>
                                    <div className="history-footer">
                                        <p className="monthly-payment">
                                            Total repayment:{" "}
                                            <strong>
                                                ${Number(loan.totalRepayment ?? loan.amount).toLocaleString()}
                                            </strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Loan;
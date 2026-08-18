import { useState } from "react";

function LoanForm({ onLoanAdded }) {
    const [amount, setAmount] = useState("");
    const [duration, setDuration] = useState("");
    const [reason, setReason] = useState("");

    const amt = Number(amount);
    const months = Number(duration);
    const interestRate = months >= 3 ? 20 : 0;
    const totalInterest = (amt * interestRate) / 100;
    const totalRepayment = amt + totalInterest;
    const monthlyPayment = months > 0 ? (totalRepayment / months).toFixed(2) : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!amt || !months || !reason) {
            alert("Please fill in all fields");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/loans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    member_id: 1,
                    amount: amt,
                    duration: months,
                    interestRate,
                    totalInterest,
                    totalRepayment,
                    reason
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            alert("Loan submitted successfully");
            setAmount("");
            setDuration("");
            setReason("");
            if (onLoanAdded) onLoanAdded();
        } catch (error) {
            console.error(error);
            alert("Failed to submit loan");
        }
    };

    return (
        <form className="loan-form" onSubmit={handleSubmit}>
            <h2 className="form-title">Apply For a Loan</h2>
            <p className="form-subtitle">Fill in the details below to submit your application</p>

            <div className="form-group">
                <label>Loan Amount</label>
                <div className="input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
            </div>

            <div className="form-group">
                <label>Duration</label>
                <div className="input-wrapper">
                    <input
                        type="number"
                        placeholder="Number of months"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                    />
                    <span className="input-suffix">months</span>
                </div>
                <span className="field-hint">Interest of 20% applies for 3 months or more</span>
            </div>

            <div className="interest-info">
                <div className="interest-item">
                    <span className="interest-label">Interest Rate</span>
                    <span className="interest-value">{interestRate}%</span>
                </div>
                <div className="interest-item">
                    <span className="interest-label">Interest Amount</span>
                    <span className="interest-value">${totalInterest.toLocaleString()}</span>
                </div>
                {interestRate === 0 && (
                    <p className="interest-note">✅ No interest for loans under 3 months</p>
                )}
            </div>

            {amt > 0 && months > 0 && (
                <div className="loan-summary-card">
                    <div className="summary-header">
                        <h3>Loan Summary</h3>
                        <span className="summary-status">Preview</span>
                    </div>
                    <div className="summary-items">
                        <div className="summary-item">
                            <span className="summary-label">Principal</span>
                            <span className="summary-value">${amt.toLocaleString()}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Interest</span>
                            <span className="summary-value">${totalInterest.toLocaleString()}</span>
                        </div>
                        <div className="summary-divider"></div>
                        <div className="summary-item total">
                            <span className="summary-label">Total Repayment</span>
                            <span className="summary-value total-value">
                                ${totalRepayment.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="repayment-info" style={{ marginTop: "12px" }}>
                        Monthly payment: <strong>${monthlyPayment}</strong> / month
                    </div>
                </div>
            )}

            <div className="form-group">
                <label>Reason for Loan</label>
                <textarea
                    placeholder="Briefly describe why you need this loan..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
            </div>

            <button type="submit" className="btn btn-submit">
                Submit Application
            </button>
            <p className="form-footer">
                Your application will be reviewed by the welfare committee
            </p>
        </form>
    );
}

export default LoanForm;
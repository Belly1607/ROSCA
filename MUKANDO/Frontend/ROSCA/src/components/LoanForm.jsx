import { useState } from "react";


function LoanForm({ onSubmit }) {
    const [amount, setAmount] = useState("");
    const [duration, setDuration] = useState("");
    const [reason, setReason] = useState("");
    const [errors, setErrors] = useState({});

    const calculateInterestRate = (months) => {
        if (months >= 3) return 20;
        return 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const newErrors = {};
        if (!amount || parseFloat(amount) <= 0) newErrors.amount = "Enter a valid amount";
        if (!duration || parseInt(duration) <= 0) newErrors.duration = "Enter valid duration";
        if (!reason.trim()) newErrors.reason = "Please explain your loan purpose";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const amt = parseFloat(amount);
        const months = parseInt(duration);
        const interestRate = calculateInterestRate(months);
        const totalInterest = (amt * interestRate) / 100;
        const totalRepayment = amt + totalInterest;

        onSubmit({
            amount: amt,
            duration: months,
            interestRate,
            totalInterest,
            totalRepayment,
            reason,
        });

        setAmount("");
        setDuration("");
        setReason("");
        setErrors({});
    };

    const interestRate = calculateInterestRate(duration || 0);
    const totalRepayment = Number(amount || 0) + (Number(amount || 0) * interestRate) / 100;

    return (
        <div className="loan-form-wrapper">
            <form onSubmit={handleSubmit} className="loan-form">
                
                <h2 className="form-title">Loan Application</h2>
                <p className="form-subtitle">Quick, transparent process for community members</p>

                {/* Loan Amount */}
                <div className="form-group">
                    <label htmlFor="amount">Loan Amount ($)</label>
                    <div className="input-wrapper">
                        <span className="currency-symbol">$</span>
                        <input
                            id="amount"
                            type="number"
                            placeholder="100"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                if (errors.amount) setErrors({...errors, amount: ""});
                            }}
                            min="0"
                            step="100"
                        />
                    </div>
                    {errors.amount && <span className="error-message">{errors.amount}</span>}
                    <p className="field-hint">Loan amounts from $50 to $1200</p>
                </div>

                <div className="form-group">
                    <label htmlFor="duration">Duration (Months)</label>
                    <div className="input-wrapper">
                        <input
                            id="duration"
                            type="number"
                            placeholder="6"
                            value={duration}
                            onChange={(e) => {
                                setDuration(e.target.value);
                                if (errors.duration) setErrors({...errors, duration: ""});
                            }}
                            min="1"
                            max="11"
                        />
                        <span className="input-suffix">months</span>
                    </div>
                    {errors.duration && <span className="error-message">{errors.duration}</span>}
                    <p className="field-hint">Repayment term: 1-11 months</p>
                </div>

                {amount && duration && (
                    <div className="interest-info">
                        <div className="interest-item">
                            <span className="interest-label">Interest Rate</span>
                            <span className="interest-value">{interestRate}%</span>
                        </div>
                        <p className="interest-note">
                            {interestRate === 0 
                                ? "✨ Interest-free for loans under 3 months!" 
                                : `Applied for loans 3+ months`}
                        </p>
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="reason">Reason for Loan</label>
                    <textarea
                        id="reason"
                        rows="4"
                        placeholder="Share your need... (Medical emergency, Education, Housing repairs, etc.)"
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            if (errors.reason) setErrors({...errors, reason: ""});
                        }}
                        className={errors.reason ? "error" : ""}
                    />
                    {errors.reason && <span className="error-message">{errors.reason}</span>}
                    <p className="field-hint">{reason.length}/500 characters</p>
                </div>

                {amount && duration && (
                    <div className="loan-summary-card">
                        <div className="summary-header">
                            <h3>💰 Loan Summary</h3>
                            <span className="summary-status">Preview</span>
                        </div>

                        <div className="summary-items">
                            <div className="summary-item">
                                <span className="summary-label">Loan Amount</span>
                                <span className="summary-value">$ {parseFloat(amount).toLocaleString()}</span>
                            </div>

                            <div className="summary-item">
                                <span className="summary-label">Interest Rate</span>
                                <span className="summary-value">{interestRate}%</span>
                            </div>

                            <div className="summary-item">
                                <span className="summary-label">Interest Amount</span>
                                <span className="summary-value">$ {((parseFloat(amount) * interestRate) / 100).toFixed(2)}</span>
                            </div>

                            <div className="summary-divider"></div>

                            <div className="summary-item total">
                                <span className="summary-label">Total Repayment</span>
                                <span className="summary-value total-value">$ {totalRepayment.toFixed(2)}</span>
                            </div>

                            <div className="repayment-info">
                                <p>Monthly Payment: <strong>$ {(totalRepayment / parseInt(duration || 1)).toFixed(2)}</strong></p>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-submit"
                >
                    ✨ Submit Application
                </button>

                <p className="form-footer">
                    Your application will be reviewed by the committee within 3-5 business days.
                </p>

            </form>
        </div>
    );
}

export default LoanForm;

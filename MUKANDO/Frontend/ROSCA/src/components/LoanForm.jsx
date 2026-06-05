import { useState } from "react";
import backgroundImage from "../assets/church-bg.jpg";

function LoanForm({ onSubmit }) {
    const [amount, setAmount] = useState("");
    const [duration, setDuration] = useState("");
    const [reason, setReason] = useState("");

    const calculateInterestRate = (months) => {
        if (months >= 3) return 20;
        return 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

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
    };

    const interestRate = calculateInterestRate(duration || 0);
    const totalRepayment =
        Number(amount || 0) +
        (Number(amount || 0) * interestRate) / 100;

    return (
        <div className="loan-page">
            <div className="loan-container">

                <div className="loan-header">
                    <h2>Loan Application</h2>
                    <p>
                        Complete the form below to request a welfare loan.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="loan-form">

                    <div className="form-group">
                        <label>Loan Amount (P)</label>

                        <input
                            type="number"
                            placeholder="Enter loan amount"
                            value={amount}
                            onChange={(e) =>
                                setAmount(e.target.value)
                            }
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Duration (Months)</label>

                        <input
                            type="number"
                            placeholder="Enter duration"
                            value={duration}
                            onChange={(e) =>
                                setDuration(e.target.value)
                            }
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Reason for Loan</label>

                        <textarea
                            rows="4"
                            placeholder="Explain why you need the loan"
                            value={reason}
                            onChange={(e) =>
                                setReason(e.target.value)
                            }
                            required
                        />
                    </div>

                    {amount && duration && (
                        <div className="loan-summary">
                            <h3>Loan Summary</h3>

                            <p>
                                <strong>Amount:</strong> P {amount}
                            </p>

                            <p>
                                <strong>Interest Rate:</strong>{" "}
                                {interestRate}%
                            </p>

                            <p>
                                <strong>Total Repayment:</strong>{" "}
                                P {totalRepayment.toFixed(2)}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="submit-btn"
                    >
                        Apply for Loan
                    </button>

                </form>

            </div>
        </div>
    );
}

export default LoanForm;
import { useState } from "react";
import { Link } from "react-router-dom";
import LoanForm from "../components/LoanForm";

export default function Loan() {
    const [loans, setLoans] = useState([]);

    const handleLoanSubmit = (data) => {
        setLoans((prevLoans) => [...prevLoans, data]);
        console.log("Loan Application Submitted:", data);
    };

    return (
        <div className="loan-page">
            <h1>Apply for a Loan</h1>
            <LoanForm onSubmit={handleLoanSubmit} />

            {loans.length > 0 && (
                <div className="loan-summary">
                    <h2>Loan History</h2>

                    {loans.map((loan, index) => (
                        <div key={index}>
                            <p><strong>Amount:</strong> ${loan.amount.toFixed(2)}</p>
                            <p><strong>Duration:</strong> {loan.duration} months</p>
                            <p><strong>Interest Rate:</strong> {loan.interestRate}%</p>
                            <p><strong>Total Interest:</strong> ${loan.totalInterest.toFixed(2)}</p>
                            <p><strong>Total Repayment:</strong> ${loan.totalRepayment.toFixed(2)}</p>
                            <p><strong>Reason:</strong> {loan.reason}</p>
                            <hr />
                        </div>
                    ))}
                </div>
            )}

            <Link to="/home">Back to Dashboard</Link>
        </div>
    );
}
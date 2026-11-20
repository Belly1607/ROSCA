
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Wallet,
    HandCoins,
    Layers,
    UserRound,
    Settings
} from "lucide-react";
import { apiRequest } from "../utils/api";
import "../page_css/Account.css";
import "../page_css/Member.css";

export default function MemberHome({ user }) {
    const [contributions, setContributions] = useState([]);
    const [loans, setLoans] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [contributionData, loanData] =
                    await Promise.all([
                        apiRequest("/my-contributions"),
                        apiRequest("/my-loans")
                    ]);

                setContributions(contributionData);
                setLoans(loanData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    const verified = contributions.filter(
        (item) => item.status === "verified"
    );

    const shares = verified.reduce(
        (sum, item) =>
            sum + Number(item.number_of_shares || 0),
        0
    );

    const totalSavings = verified.reduce(
        (sum, item) => {
            const amount =
                item.amount ??
                Number(item.number_of_shares || 0) *
                Number(item.share_price || 0);

            return sum + Number(amount || 0);
        },
        0
    );

    const outstandingLoans = loans.reduce(
        (sum, loan) => {
            const principal =
                Number(loan.principal || 0) -
                Number(loan.principal_paid || 0);

            const interest =
                Number(loan.interest_charged || 0) -
                Number(loan.interest_paid || 0);

            return sum +
                Math.max(0, principal) +
                Math.max(0, interest);
        },
        0
    );

    const formatMoney = (amount) =>
        Number(amount).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    const basePath = "/member";

    return (
        <div className="account-page">
            <div className="account-page-heading">
                <span className="account-eyebrow">
                    MEMBER DASHBOARD
                </span>
                <h1>Welcome, {user.name}</h1>
                <p>Here's your ROSCA savings overview.</p>
            </div>

            {loading && <p>Loading your financial details...</p>}

            {error && (
                <p className="account-error" role="alert">
                    {error}
                </p>
            )}

            {!loading && !error && (
                <div className="member-stats-grid">
                    <div className="member-stat-box">
                        <Layers size={21} />
                        <span>My Shares</span>
                        <h2>{shares}</h2>
                    </div>

                    <div className="member-stat-box">
                        <Wallet size={21} />
                        <span>Verified Contributions</span>
                        <h2>{formatMoney(totalSavings)}</h2>
                    </div>

                    <div className="member-stat-box">
                        <HandCoins size={21} />
                        <span>Outstanding Loans</span>
                        <h2>{formatMoney(outstandingLoans)}</h2>
                    </div>

                    <div className="member-stat-box">
                        <Layers size={21} />
                        <span>Pending Contributions</span>
                        <h2>
                            {contributions.filter(
                                (item) => item.status === "pending"
                            ).length}
                        </h2>
                    </div>
                </div>
            )}

            <div className="account-card">
                <div className="account-card-heading">
                    <UserRound size={20} />
                    <h2>Quick Actions</h2>
                </div>

                <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px"
                }}>
                    <Link
                        className="account-primary-button"
                        to={`${basePath}/profile`}
                    >
                        <UserRound size={17} />
                        My Profile
                    </Link>

                    <Link
                        className="account-primary-button"
                        to={`${basePath}/settings`}
                    >
                        <Settings size={17} />
                        Settings
                    </Link>
                </div>
            </div>
        </div>
    );
}

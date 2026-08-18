import { useEffect, useState } from "react";

function Home() {
    const [members, setMembers] = useState([]);
    const [loans, setLoans] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [membersRes, loansRes] = await Promise.all([
                    fetch("http://localhost:5000/members"),
                    fetch("http://localhost:5000/loans")
                ]);
                setMembers(await membersRes.json());
                setLoans(await loansRes.json());
            } catch (err) {
                console.error("Failed to fetch home data", err);
            }
        };

        fetchData();
    }, []);

    const activeLoans = loans.filter(l => l.statusapproval !== "repaid");
    const totalBalance = loans.reduce((sum, l) => sum + Number(l.amount), 0);

    const verses = [
        { text: "Be strong and courageous. Do not be afraid.", reference: "Joshua 1:9" },
        { text: "Trust in the Lord with all your heart.", reference: "Proverbs 3:5" },
        { text: "God loves a cheerful giver.", reference: "2 Corinthians 9:7" },
        { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" }
    ];

    const verse = verses[new Date().getDate() % verses.length];

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    return (
        <div className="home">
            <div className="hero-card">
                <div>
                    <h1>{greeting()}, Admin</h1>
                    <p className="hero-subtitle">
                        Serving {members.length} church members through the welfare ministry.
                    </p>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Members</h3>
                    <p>{members.length}</p>
                    <span>Registered Members</span>
                </div>

                <div className="stat-card">
                    <h3>Loans</h3>
                    <p>{activeLoans.length}</p>
                    <span>Active Loans</span>
                </div>

                <div className="stat-card">
                    <h3>Total Loaned</h3>
                    <p>${totalBalance.toLocaleString()}</p>
                    <span>Across All Loans</span>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="verse-card">
                    <h2>Verse of the Day</h2>
                    <blockquote>"{verse.text}"</blockquote>
                    <p className="verse-reference">{verse.reference}</p>
                </div>
            </div>
        </div>
    );
}

export default Home;
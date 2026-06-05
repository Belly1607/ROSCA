function Home() {
    const verses = [
        {
            text: "Be strong and courageous. Do not be afraid.",
            reference: "Joshua 1:9"
        },
        {
            text: "Trust in the Lord with all your heart.",
            reference: "Proverbs 3:5"
        },
        {
            text: "God loves a cheerful giver.",
            reference: "2 Corinthians 9:7"
        },
        {
            text: "I can do all things through Christ who strengthens me.",
            reference: "Philippians 4:13"
        }
    ];

    const verse = verses[new Date().getDate() % verses.length];

    const greeting = () => {
        const hour = new Date().getHours();

        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    return (
        <div className="home">
            <div className="hero-card">
                <div>
                    <h1>{greeting()}, Admin</h1>
                    <p className="hero-subtitle">
                        Serving 54 church members through the welfare ministry.
                    </p>
                </div>
            </div>

            <div className="stats-grid">

                <div className="stat-card">
                    <h3>Members</h3>
                    <p>54</p>
                    <span>Registered Members</span>
                </div>

                <div className="stat-card">
                    <h3>Loans</h3>
                    <p>12</p>
                    <span>Active Loans</span>
                </div>

                <div className="stat-card">
                    <h3>Savings</h3>
                    <p>P125,000</p>
                    <span>Total Balance</span>
                </div>

            </div>

            <div className="dashboard-grid">

                <div className="verse-card">
                    <h2>Verse of the Day</h2>

                    <blockquote>
                        "{verse.text}"
                    </blockquote>

                    <p className="verse-reference">
                        {verse.reference}
                    </p>
                </div>

            </div>

        </div>
    );
}

export default Home;
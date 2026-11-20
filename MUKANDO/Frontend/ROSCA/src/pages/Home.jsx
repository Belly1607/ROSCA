
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Wallet,
  Users,
  HandCoins,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  Pause,
  Play,
  BookOpen,
  Sparkles,
  ShieldCheck
} from "lucide-react";

import { apiRequest } from "../utils/api";

// ======================================
// BIBLE VERSES
// ======================================

// Scripture paraphrases, not direct quotations.

const verses = [
  {
    theme: "Stewardship",
    text: "Be faithful and responsible with what has been entrusted to you.",
    reference: "Luke 16:10"
  },
  {
    theme: "Generosity",
    text: "Give willingly and cheerfully, rather than under pressure.",
    reference: "2 Corinthians 9:7"
  },
  {
    theme: "Planning",
    text: "Careful planning and diligence help us build a stable future.",
    reference: "Proverbs 21:5"
  },
  {
    theme: "Honesty",
    text: "Conduct financial dealings with honesty and fair measures.",
    reference: "Proverbs 11:1"
  },
  {
    theme: "Community",
    text: "Help carry one another's burdens.",
    reference: "Galatians 6:2"
  },
  {
    theme: "Responsibility",
    text: "Those entrusted with resources should prove trustworthy.",
    reference: "1 Corinthians 4:2"
  }
];

// ======================================
// FORMATTING HELPERS
// ======================================

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

// ======================================
// SCRIPTURE CARD
// ======================================

function VerseCard() {
  const [index, setIndex] = useState(
    () => new Date().getDate() % verses.length
  );

  const [automatic, setAutomatic] = useState(true);

  // Automatically change verse every 12 seconds.
  useEffect(() => {
    if (!automatic) return;

    const timer = setInterval(() => {
      setIndex((current) => {
        return (current + 1) % verses.length;
      });
    }, 12000);

    return () => clearInterval(timer);
  }, [automatic]);

  const verse = verses[index];

  function changeVerse(direction) {
    setIndex((current) => {
      return (
        current + direction + verses.length
      ) % verses.length;
    });
  }

  return (
    <section className="ubc-scripture-card">

      {/* HEADER */}
      <div className="ubc-scripture-header">
        <div className="ubc-scripture-heading">
          <span className="ubc-scripture-icon">
            <BookOpen size={19} />
          </span>

          <span>Scripture & Stewardship</span>
        </div>

        <Sparkles
          size={18}
          className="ubc-scripture-sparkle"
        />
      </div>

      {/* VERSE CONTENT */}
      <div
        key={index}
        className="ubc-scripture-content"
        aria-live="off"
      >
        <span className="ubc-scripture-reference">
          {verse.reference} · {verse.theme}
        </span>

        <h2>{verse.text}</h2>

        <p className="ubc-scripture-caption">
          A reminder to lead with integrity,
          responsibility and generosity.
        </p>

        <span className="ubc-scripture-disclaimer">
          Scripture paraphrase
        </span>
      </div>

      {/* FOOTER */}
      <div className="ubc-scripture-footer">

        {/* VERSE INDICATORS */}
        <div className="ubc-scripture-dots">
          {verses.map((item, dotIndex) => (
            <button
              key={item.reference}
              type="button"
              aria-label={`Show verse ${dotIndex + 1}`}
              aria-current={
                index === dotIndex ? "true" : undefined
              }
              className={
                index === dotIndex ? "active" : ""
              }
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>

        {/* SMALL CONTROLS */}
        <div className="ubc-scripture-actions">

          <button
            type="button"
            className="ubc-scripture-control"
            onClick={() => changeVerse(-1)}
            title="Previous verse"
            aria-label="Previous verse"
          >
            <ChevronLeft size={17} />
          </button>

          <button
            type="button"
            className="ubc-scripture-control"
            onClick={() =>
              setAutomatic((current) => !current)
            }
            title={
              automatic
                ? "Pause rotation"
                : "Resume rotation"
            }
            aria-label={
              automatic
                ? "Pause rotation"
                : "Resume rotation"
            }
            aria-pressed={!automatic}
          >
            {automatic ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
          </button>

          <button
            type="button"
            className="ubc-scripture-control next"
            onClick={() => changeVerse(1)}
            title="Next verse"
            aria-label="Next verse"
          >
            <ArrowRight size={17} />
          </button>

        </div>
      </div>
    </section>
  );
}

// ======================================
// ADMIN HOME DASHBOARD
// ======================================

export default function Home() {
  const [data, setData] = useState(null);
  const [loans, setLoans] = useState([]);
  const [applications, setApplications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ======================================
  // FETCH DASHBOARD INFORMATION
  // ======================================

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        const [
          summary,
          loanData,
          applicationData
        ] = await Promise.all([
          apiRequest("/dashboard"),
          apiRequest("/loans"),
          apiRequest("/loan-applications")
        ]);

        if (cancelled) return;

        setData(summary);

        setLoans(
          Array.isArray(loanData)
            ? loanData
            : []
        );

        setApplications(
          Array.isArray(applicationData)
            ? applicationData
            : []
        );

        setError("");
      } catch (err) {
        if (!cancelled) {
          console.error("Dashboard error:", err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  // ======================================
  // PENDING APPLICATIONS
  // ======================================

  const pendingApplications = applications.filter(
    (application) => application.status === "pending"
  );

  // ======================================
  // DASHBOARD STATISTICS
  // ======================================

  const cards = [
    {
      label: "Available Funds (Estimated)",
      value: formatMoney(data?.availableFunds),
      helper: "Calculated fund balance",
      icon: Wallet,
      featured: true
    },
    {
      label: "Active Members",
      value: data?.activeMembers ?? 0,
      helper: `${data?.pendingMembers ?? 0} pending approval`,
      icon: Users
    },
    {
      label: "Active Loans",
      value: data?.activeLoans ?? 0,
      helper: "Includes recorded overdue loans",
      icon: HandCoins
    },
    {
      label: "Verified Contributions",
      value: formatMoney(data?.totalContributions),
      helper: `${data?.totalShares ?? 0} shares purchased`,
      icon: ShieldCheck
    }
  ];

  // ======================================
  // RECENT LOANS
  // ======================================

  const recentLoans = [...loans]
    .sort(
      (a, b) =>
        Number(b.loan_id) - Number(a.loan_id)
    )
    .slice(0, 5);

  // ======================================
  // LOAN STATUS STATISTICS
  // ======================================

  const loanStatuses = [
    {
      label: "Active",
      value: loans.filter(
        (loan) => loan.status === "active"
      ).length,
      color: "#a61e42"
    },
    {
      label: "Overdue",
      value: loans.filter(
        (loan) => loan.status === "overdue"
      ).length,
      color: "#f59e0b"
    },
    {
      label: "Paid",
      value: loans.filter(
        (loan) => loan.status === "paid"
      ).length,
      color: "#16a34a"
    }
  ];

  const highestLoanCount = Math.max(
    1,
    ...loanStatuses.map((item) => item.value)
  );

  // ======================================
  // LOADING
  // ======================================

  if (loading) {
    return (
      <div className="ubc-page">
        <p>Loading UBC ROSCA dashboard...</p>
      </div>
    );
  }

  // ======================================
  // ERROR
  // ======================================

  if (error) {
    return (
      <div className="ubc-page">
        <div className="ubc-alert error" role="alert">
          {error}
        </div>

        <button
          type="button"
          className="ubc-button-secondary"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ======================================
  // DASHBOARD INTERFACE
  // ======================================

  return (
    <div className="ubc-page">

      {/* WELCOME HEADER */}
      <div className="ubc-page-heading">
        <div>
          <h1>{getGreeting()}, Admin</h1>

          <p>
            Here's what's happening with UBC ROSCA today.
          </p>
        </div>

        <Link
          to="/admin/report"
          className="ubc-button-primary"
        >
          View Reports
          <ArrowUpRight size={16} />
        </Link>
      </div>

      {/* FINANCIAL SUMMARY CARDS */}
      <div className="ubc-cards">

        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className={`ubc-card ${
                card.featured ? "featured" : ""
              }`}
            >
              <div className="ubc-card-top">
                <span>{card.label}</span>

                <span className="ubc-card-icon">
                  <Icon size={19} />
                </span>
              </div>

              <strong>{card.value}</strong>

              <small>{card.helper}</small>
            </div>
          );
        })}

      </div>

      {/* RECENT LOANS AND SCRIPTURE */}
      <div className="ubc-dashboard-grid">

        {/* RECENT LOANS */}
        <div className="ubc-panel">

          <div className="ubc-panel-title">
            <h2>Recent Loans</h2>

            <Link to="/admin/loan">
              View all
            </Link>
          </div>

          {recentLoans.length === 0 ? (
            <p
              style={{
                color: "var(--ubc-muted)"
              }}
            >
              No loans have been issued yet.
            </p>
          ) : (
            recentLoans.map((loan) => (
              <div
                key={loan.loan_id}
                className="ubc-activity-row"
              >
                <div>
                  <strong>
                    {loan.full_name ||
                      `Member #${loan.user_id}`}
                  </strong>

                  <small>
                    Loan #{loan.loan_id} · {loan.status}
                  </small>
                </div>

                <strong>
                  {formatMoney(loan.principal)}
                </strong>
              </div>
            ))
          )}
        </div>

        {/* NEW SCRIPTURE CARD - NO EXTRA BOX */}
        <VerseCard />

      </div>

      {/* LOAN OVERVIEW AND APPROVALS */}
      <div className="ubc-dashboard-grid">

        {/* LOAN STATUS */}
        <div className="ubc-panel">

          <div className="ubc-panel-title">
            <h2>Loan Status Overview</h2>

            <Link to="/admin/loan">
              Manage Loans
            </Link>
          </div>

          {loanStatuses.map((item) => (
            <div
              key={item.label}
              style={{
                marginBottom: 24
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 9,
                  fontSize: 12
                }}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>

              <div
                style={{
                  height: 9,
                  borderRadius: 20,
                  background: "var(--ubc-border)",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${
                      (item.value / highestLoanCount) * 100
                    }%`,
                    background: item.color,
                    borderRadius: 20,
                    transition: "width 0.35s ease"
                  }}
                />
              </div>
            </div>
          ))}

        </div>

        {/* NEEDS ATTENTION */}
        <div className="ubc-panel">

          <div className="ubc-panel-title">
            <h2>Needs Your Attention</h2>
          </div>

          <div className="ubc-activity-row">
            <div>
              <strong>Member Registrations</strong>
              <small>Awaiting approval</small>
            </div>

            <Link
              to="/admin/member"
              className="ubc-button-secondary"
            >
              {data?.pendingMembers ?? 0}
            </Link>
          </div>

          <div className="ubc-activity-row">
            <div>
              <strong>Loan Applications</strong>
              <small>Awaiting review</small>
            </div>

            <Link
              to="/admin/loan"
              className="ubc-button-secondary"
            >
              {pendingApplications.length}
            </Link>
          </div>

          <div className="ubc-activity-row">
            <div>
              <strong>Overdue Loans</strong>
              <small>
                Currently marked overdue
              </small>
            </div>

            <Link
              to="/admin/loan"
              className="ubc-button-secondary"
            >
              {loanStatuses[1].value}
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}

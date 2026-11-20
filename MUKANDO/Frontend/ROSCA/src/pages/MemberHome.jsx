
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight, Bell, BookOpen, CalendarDays,
  CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Coins, HandCoins, Pause, Play,
  Plus, RefreshCw, Wallet, X, AlertTriangle
} from "lucide-react";

import { apiRequest } from "../utils/api";
import "../page_css/MemberHome.css";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function dateParts(value) {
  if (!value) return null;

  const match = String(value)
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return match
    ? match.slice(1).map(Number)
    : null;
}

function displayDate(value) {
  const parts = dateParts(value);
  if (!parts) return "—";

  return new Date(
    parts[0], parts[1] - 1, parts[2]
  ).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function daysLeft(value) {
  const parts = dateParts(value);
  if (!parts) return null;

  const due = Date.UTC(
    parts[0], parts[1] - 1, parts[2]
  );

  const now = new Date();
  const today = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  return Math.round((due - today) / 86400000);
}

const verses = [
  {
    text: "Two are better than one; because they have a good reward for their labour.",
    reference: "Ecclesiastes 4:9",
    theme: "Working together"
  },
  {
    text: "The thoughts of the diligent tend only to plenteousness; but of every one that is hasty only to want.",
    reference: "Proverbs 21:5",
    theme: "Planning carefully"
  },
  {
    text: "Wealth gotten by vanity shall be diminished: but he that gathereth by labour shall increase.",
    reference: "Proverbs 13:11",
    theme: "Building savings"
  },
  {
    text: "The rich ruleth over the poor, and the borrower is servant to the lender.",
    reference: "Proverbs 22:7",
    theme: "Borrowing responsibly"
  },
  {
    text: "He that hath pity upon the poor lendeth unto the LORD; and that which he hath given will he pay him again.",
    reference: "Proverbs 19:17",
    theme: "Helping one another"
  }
];

const tabs = [
  { id: "loans", label: "My Loans", icon: HandCoins },
  { id: "savings", label: "My Savings", icon: Coins },
  { id: "updates", label: "My Updates", icon: Bell }
];

export default function MemberHome() {
  const [user, setUser] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loans, setLoans] = useState([]);
  const [cycles, setCycles] = useState([]);

  const [tab, setTab] = useState("loans");
  const [verseIndex, setVerseIndex] = useState(0);
  const [versePaused, setVersePaused] = useState(false);

  const [loanModal, setLoanModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---------------------------------------
  // LOAD MEMBER DATA
  // ---------------------------------------

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const paths = [
      "/me",
      "/my-contributions",
      "/my-loan-applications",
      "/my-loans",
      "/savings-cycles"
    ];

    const setters = [
      setUser,
      setContributions,
      setApplications,
      setLoans,
      setCycles
    ];

    const results = await Promise.allSettled(
      paths.map((path) => apiRequest(path))
    );

    const problems = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const data = result.value;

        const valid = index === 0
          ? data && !Array.isArray(data)
          : Array.isArray(data);

        if (valid) {
          setters[index](data);
        } else {
          problems.push(
            `${paths[index]} returned invalid data`
          );
        }
      } else {
        problems.push(
          `${paths[index]}: ${
            result.reason?.message || "Unable to load"
          }`
        );
      }
    });

    setError(problems.join(" · "));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [loadData]);

  // ---------------------------------------
  // VERSE CAROUSEL
  // ---------------------------------------

  useEffect(() => {
    if (versePaused) return undefined;

    const interval = setInterval(() => {
      setVerseIndex((current) =>
        (current + 1) % verses.length
      );
    }, 12000);

    return () => clearInterval(interval);
  }, [versePaused]);

  function moveVerse(direction) {
    setVerseIndex((current) =>
      (current + direction + verses.length) %
      verses.length
    );
  }

  // ---------------------------------------
  // FINANCIAL SUMMARY
  // ---------------------------------------

  const name = user?.full_name || user?.name || "Member";
  const firstName = name.trim().split(/\s+/)[0];

  const verified = contributions.filter(
    (item) => item.status === "verified"
  );

  const pending = contributions.filter(
    (item) => item.status === "pending"
  );

  const shares = verified.reduce(
    (sum, item) =>
      sum + Number(item.number_of_shares || 0),
    0
  );

  const savings = verified.reduce(
    (sum, item) =>
      sum + Number(
        item.amount ??
        Number(item.number_of_shares || 0) *
        Number(item.share_price || 0)
      ),
    0
  );

  const outstanding = loans.reduce(
    (sum, loan) =>
      sum + Number(loan.total_owed || 0),
    0
  );

  const activeLoans = loans.filter(
    (loan) => ["active", "overdue"].includes(loan.status)
  );

  const activeCycle = cycles.find(
    (cycle) => cycle.status === "active" &&
      daysLeft(cycle.start_date) <= 0 &&
      daysLeft(cycle.end_date) >= 0
  );

  const sharePrice = Number(
    activeCycle?.share_price || 0
  );

  // ---------------------------------------
  // MEMBER NOTIFICATIONS
  // ---------------------------------------

  const notices = [];

  applications.forEach((application) => {
    const issued = loans.some(
      (loan) =>
        Number(loan.application_id) ===
        Number(application.application_id)
    );

    if (application.status === "approved" && !issued) {
      notices.push({
        id: `approved-${application.application_id}`,
        kind: "success",
        title: "Your loan was approved",
        message:
          `Approved amount: ${formatMoney(
            application.requested_amount
          )}. The administrator has not yet recorded handing over the cash.`,
        icon: CheckCircle2
      });
    }
  });

  loans.forEach((loan) => {
    const balance = Number(loan.total_owed || 0);
    const remaining = daysLeft(loan.due_date);

    if (loan.status === "paid" || balance <= 0) {
      return;
    }

    if (remaining !== null && remaining < 0) {
      notices.push({
        id: `late-${loan.loan_id}`,
        kind: "danger",
        title: "Your loan is past due",
        message:
          `Loan #${loan.loan_id}: ${formatMoney(balance)} currently recorded as owed. ` +
          "A one-time overdue charge may apply to unpaid principal.",
        icon: AlertTriangle
      });
    } else if (remaining !== null && remaining <= 14) {
      notices.push({
        id: `due-${loan.loan_id}`,
        kind: "warning",
        title:
          remaining === 0
            ? "Your loan is due today"
            : `Your loan is due in ${remaining} days`,
        message:
          `Loan #${loan.loan_id}: ${formatMoney(balance)} currently owed. ` +
          `Due date: ${displayDate(loan.due_date)}.`,
        icon: Clock3
      });
    } else {
      notices.push({
        id: `issued-${loan.loan_id}`,
        kind: "info",
        title: "Loan cash disbursed",
        message:
          `Original loan: ${formatMoney(loan.principal)}. ` +
          `Repayment is due ${displayDate(loan.due_date)}.`,
        icon: HandCoins
      });
    }
  });

  notices.sort((a, b) => {
    const priority = {
      danger: 0,
      warning: 1,
      success: 2,
      info: 3
    };

    return priority[a.kind] - priority[b.kind];
  });

  const urgentCount = notices.filter(
    (item) =>
      item.kind === "danger" ||
      item.kind === "warning"
  ).length;

  const topAlert = notices.find(
    (item) =>
      item.kind === "danger" ||
      item.kind === "warning"
  );

  // ---------------------------------------
  // APPLY FOR LOAN
  // ---------------------------------------

  function openLoan() {
    setAmount("");
    setReason("");
    setFormError("");
    setLoanModal(true);
  }

  async function submitLoan(event) {
    event.preventDefault();
    if (submitting) return;

    const value = Number(amount);

    if (
      !/^\d+(\.\d{1,2})?$/.test(amount) ||
      !Number.isFinite(value) ||
      value <= 0 ||
      !reason.trim()
    ) {
      setFormError(
        "Enter a valid amount and explain why you need the loan."
      );
      return;
    }

    if (!activeCycle) {
      setFormError(
        "Loan applications are unavailable until a savings cycle is active."
      );
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const response = await apiRequest(
        "/loan-applications",
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            reason: reason.trim()
          })
        }
      );

      setLoanModal(false);
      setSuccess(
        response.message || "Loan application submitted."
      );
      setTab("loans");
      await loadData(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const sortedApplications = [...applications].sort(
    (a, b) =>
      Number(b.application_id) -
      Number(a.application_id)
  );

  const sortedContributions = [...contributions].sort(
    (a, b) =>
      Number(b.contribution_id) -
      Number(a.contribution_id)
  );

  // ---------------------------------------
  // DISPLAY
  // ---------------------------------------

  return (
    <div className="mp-page">
      <section className="mp-welcome">
        <div>
          <span className="mp-eyebrow">
            UBC ROSCA · MEMBER HOME
          </span>

          <h1>Hello, {firstName}!</h1>

          <p>
            Your savings and loans, all in one place.
          </p>
        </div>

        <button
          type="button"
          className="mp-refresh"
          disabled={refreshing}
          onClick={() => loadData(true)}
        >
          <RefreshCw size={19} />
          <span>
            {refreshing ? "Refreshing" : "Refresh"}
          </span>
        </button>
      </section>

      {error && (
        <div className="mp-message mp-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="mp-message mp-success" role="status">
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      {/* IMPORTANT REPAYMENT NOTICE */}

      {topAlert && (
        <button
          type="button"
          className={`mp-important ${topAlert.kind}`}
          onClick={() => setTab("updates")}
        >
          <AlertTriangle size={24} />

          <span>
            <strong>{topAlert.title}</strong>
            <small>{topAlert.message}</small>
          </span>

          <ArrowRight size={20} />
        </button>
      )}

      {/* TWO MAIN FIGURES */}

      <section className="mp-summary">
        <div className="mp-summary-card">
          <div className="mp-summary-heading">
            <Coins size={25} />
            <span>MY SAVINGS</span>
          </div>

          <strong className="mp-big-number">
            {loading ? "..." : formatMoney(savings)}
          </strong>

          <div className="mp-summary-bottom">
            <span>
              <strong>{shares.toLocaleString()}</strong>
              {" "}verified shares
            </span>

            <button
              type="button"
              onClick={() => setTab("savings")}
            >
              See shares <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="mp-summary-card">
          <div className="mp-summary-heading">
            <Wallet size={25} />
            <span>MY LOAN BALANCE</span>
          </div>

          <strong className="mp-big-number">
            {loading ? "..." : formatMoney(outstanding)}
          </strong>

          <div className="mp-summary-bottom">
            <span>
              {activeLoans.length === 0
                ? "No outstanding loans"
                : `${activeLoans.length} loan(s) being repaid`}
            </span>

            <button
              type="button"
              onClick={() => setTab("loans")}
            >
              See loans <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* MAIN ACTIONS */}

      <section className="mp-actions">
        <button
          type="button"
          className="mp-main-action"
          onClick={openLoan}
          disabled={!activeCycle || loading}
        >
          <span className="mp-action-icon">
            <HandCoins size={27} />
          </span>

          <span>
            <strong>Apply for a Loan</strong>
            <small>Request money from UBC ROSCA</small>
          </span>

          <ArrowRight size={23} />
        </button>

        <button
          type="button"
          className="mp-secondary-action"
          onClick={() => setTab("savings")}
        >
          <span className="mp-action-icon">
            <Coins size={27} />
          </span>

          <span>
            <strong>View My Shares</strong>
            <small>See your cash contributions</small>
          </span>

          <ArrowRight size={23} />
        </button>
      </section>

      {/* TABS: ONLY ONE MAIN SECTION VISIBLE */}

      <section className="mp-workspace">
        <div
          className="mp-tabs"
          role="tablist"
          aria-label="Member account sections"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={21} />
              <span>{label}</span>

              {id === "updates" && urgentCount > 0 && (
                <span className="mp-tab-count">
                  {urgentCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mp-tab-content" role="tabpanel">

          {/* MY LOANS */}

          {tab === "loans" && (
            <>
              <div className="mp-section-heading">
                <div>
                  <h2>My Loans</h2>
                  <p>
                    See applications, payments and deadlines.
                  </p>
                </div>
              </div>

              {activeLoans.length > 0 && (
                <div className="mp-loan-list">
                  {activeLoans.map((loan) => {
                    const days = daysLeft(loan.due_date);

                    return (
                      <div
                        className="mp-loan-card"
                        key={loan.loan_id}
                      >
                        <div className="mp-loan-top">
                          <strong>
                            Loan #{loan.loan_id}
                          </strong>

                          <span className={`mp-pill ${loan.status}`}>
                            {loan.status}
                          </span>
                        </div>

                        <div className="mp-loan-values">
                          <div>
                            <span>Amount still owed</span>
                            <strong>
                              {formatMoney(loan.total_owed)}
                            </strong>
                          </div>

                          <div>
                            <span>Already repaid</span>
                            <strong>
                              {formatMoney(loan.total_paid)}
                            </strong>
                          </div>
                        </div>

                        <div className="mp-loan-due">
                          <CalendarDays size={19} />
                          <span>
                            Repay by{" "}
                            <strong>
                              {displayDate(loan.due_date)}
                            </strong>
                          </span>
                        </div>

                        {days !== null && days <= 14 && (
                          <p className="mp-due-note">
                            {days < 0
                              ? `Deadline passed ${Math.abs(days)} day(s) ago.`
                              : days === 0
                              ? "Your payment is due today."
                              : `${days} days remaining.`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <h3 className="mp-subheading">
                Loan Applications
              </h3>

              {sortedApplications.length === 0 ? (
                <div className="mp-empty">
                  <HandCoins size={31} />
                  <strong>No loan applications yet</strong>
                  <p>
                    Use Apply for a Loan when you need
                    to request money.
                  </p>
                </div>
              ) : (
                <div className="mp-record-list">
                  {sortedApplications.map((application) => {
                    const issued = loans.some(
                      (loan) =>
                        Number(loan.application_id) ===
                        Number(application.application_id)
                    );

                    const status = issued
                      ? "disbursed"
                      : application.status;

                    return (
                      <div
                        className="mp-record"
                        key={application.application_id}
                      >
                        <div className="mp-record-icon">
                          <HandCoins size={22} />
                        </div>

                        <div className="mp-record-main">
                          <strong>
                            {formatMoney(
                              application.requested_amount
                            )}
                          </strong>

                          <small>
                            {application.reason || "Loan request"}
                          </small>

                          <small>
                            {displayDate(application.applied_at)}
                          </small>
                        </div>

                        <span className={`mp-pill ${status}`}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mp-help">
                Approval means your application was accepted.
                The repayment period begins only when
                cash is actually given to you.
              </p>
            </>
          )}

          {/* MY SAVINGS */}

          {tab === "savings" && (
            <>
              <div className="mp-section-heading">
                <div>
                  <h2>My Savings & Shares</h2>
                  <p>
                    Only confirmed contributions are counted.
                  </p>
                </div>
              </div>

              <div className="mp-savings-details">
                <div>
                  <span>Verified shares</span>
                  <strong>
                    {shares.toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>Total saved</span>
                  <strong>
                    {formatMoney(savings)}
                  </strong>
                </div>

                <div>
                  <span>Share price</span>
                  <strong>
                    {sharePrice > 0
                      ? formatMoney(sharePrice)
                      : "—"}
                  </strong>
                </div>

                <div>
                  <span>Awaiting verification</span>
                  <strong>{pending.length}</strong>
                </div>
              </div>

              <h3 className="mp-subheading">
                Contribution History
              </h3>

              {contributions.length === 0 ? (
                <div className="mp-empty">
                  <Coins size={31} />
                  <strong>No savings recorded yet</strong>
                  <p>
                    Your cash contributions will appear here
                    when recorded by the administrator.
                  </p>
                </div>
              ) : (
                <div className="mp-record-list">
                  {sortedContributions.map((item) => (
                    <div
                      className="mp-record"
                      key={item.contribution_id}
                    >
                      <div className="mp-record-icon">
                        <Coins size={22} />
                      </div>

                      <div className="mp-record-main">
                        <strong>
                          {formatMoney(
                            item.amount ??
                            Number(item.number_of_shares || 0) *
                            Number(item.share_price || 0)
                          )}
                        </strong>

                        <small>
                          {item.number_of_shares} shares ·{" "}
                          {displayDate(item.payment_date)}
                        </small>
                      </div>

                      <span className={`mp-pill ${item.status}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mp-help">
                You do not have to contribute every month.
                Missing a month does not create a debt.
              </p>
            </>
          )}

          {/* MY UPDATES */}

          {tab === "updates" && (
            <>
              <div className="mp-section-heading">
                <div>
                  <h2>My Updates</h2>
                  <p>
                    Important information about your loans.
                  </p>
                </div>

                <button
                  type="button"
                  className="mp-refresh"
                  disabled={refreshing}
                  onClick={() => loadData(true)}
                >
                  <RefreshCw size={18} />
                  Refresh
                </button>
              </div>

              {notices.length === 0 ? (
                <div className="mp-empty">
                  <CheckCircle2 size={31} />
                  <strong>You're up to date</strong>
                  <p>
                    No loan alerts require your attention.
                  </p>
                </div>
              ) : (
                <div className="mp-notices">
                  {notices.map((notice) => {
                    const Icon = notice.icon;

                    return (
                      <div
                        key={notice.id}
                        className={`mp-notice ${notice.kind}`}
                      >
                        <Icon size={23} />

                        <div>
                          <strong>{notice.title}</strong>
                          <p>{notice.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mp-help">
                These updates refresh while this page is open.
                They are not SMS or mobile push messages.
              </p>
            </>
          )}
        </div>
      </section>

      {/* SHORT ROTATING VERSE CAROUSEL */}

      <section className="mp-verse" aria-label="Bible verses">
        <div className="mp-verse-header">
          <span>
            <BookOpen size={19} />
            FAITH & FINANCIAL WISDOM
          </span>

          <div className="mp-verse-controls">
            <button
              type="button"
              aria-label="Previous verse"
              onClick={() => moveVerse(-1)}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              aria-label={
                versePaused
                  ? "Resume automatic verses"
                  : "Pause automatic verses"
              }
              onClick={() =>
                setVersePaused((previous) => !previous)
              }
            >
              {versePaused
                ? <Play size={18} />
                : <Pause size={18} />}
            </button>

            <button
              type="button"
              aria-label="Next verse"
              onClick={() => moveVerse(1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          key={verseIndex}
          className="mp-verse-body"
          aria-live="off"
        >
          <blockquote>
            “{verses[verseIndex].text}”
          </blockquote>

          <div className="mp-verse-credit">
            <strong>
              {verses[verseIndex].reference}
            </strong>

            <span>
              {verses[verseIndex].theme} · KJV
            </span>
          </div>
        </div>

        <div className="mp-verse-dots">
          {verses.map((verse, index) => (
            <button
              key={verse.reference}
              type="button"
              aria-label={`Show verse ${index + 1}`}
              aria-current={index === verseIndex}
              className={
                index === verseIndex ? "active" : ""
              }
              onClick={() => setVerseIndex(index)}
            />
          ))}
        </div>
      </section>

      {/* APPLY FOR LOAN MODAL */}

      {loanModal && (
        <div className="mp-modal-backdrop">
          <div
            className="mp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mp-apply-title"
          >
            <div className="mp-modal-heading">
              <div>
                <h2 id="mp-apply-title">
                  Apply for a Loan
                </h2>

                <p>
                  Complete two fields and submit your request.
                </p>
              </div>

              <button
                type="button"
                className="mp-close"
                aria-label="Close loan form"
                disabled={submitting}
                onClick={() => setLoanModal(false)}
              >
                <X size={23} />
              </button>
            </div>

            {formError && (
              <div className="mp-message mp-danger" role="alert">
                {formError}
              </div>
            )}

            <form onSubmit={submitLoan}>
              <label className="mp-field">
                <span>How much do you need?</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="Example: 250.00"
                  required
                />
              </label>

              <label className="mp-field">
                <span>What will you use it for?</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="Example: School fees"
                  required
                />
              </label>

              <div className="mp-loan-rules">
                <CalendarDays size={21} />

                <p>
                  Repay within three months after receiving
                  the cash. A one-time 20% overdue charge
                  applies to unpaid principal after that date.
                </p>
              </div>

              <div className="mp-modal-actions">
                <button
                  type="button"
                  className="mp-cancel"
                  disabled={submitting}
                  onClick={() => setLoanModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="mp-submit"
                  disabled={submitting || !activeCycle}
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Loan Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

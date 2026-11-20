
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  HandCoins,
  CheckCircle2,
  Clock3,
  Wallet,
  X,
  Banknote,
  Receipt,
  Info
} from "lucide-react";

import { apiRequest } from "../utils/api";

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const date = (value) =>
  value ? new Date(value).toLocaleDateString() : "—";

const cents = (value) => {
  const text = String(value ?? "").trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return null;
  }

  const [whole, fraction = ""] = text.split(".");

  return (
    Number(whole) * 100 +
    Number(fraction.padEnd(2, "0"))
  );
};

export default function Loan() {
  const [loans, setLoans] = useState([]);
  const [applications, setApplications] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const [modal, setModal] = useState(null);

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedApplication, setSelectedApplication] =
    useState(null);

  // Add loan form
  const [memberId, setMemberId] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [reason, setReason] = useState("");

  // Cash disbursement
  const [cashDisbursed, setCashDisbursed] = useState("");

  // Cash repayment
  const [cashRepayment, setCashRepayment] = useState("");

  // =================================================
  // FETCH LOANS
  // =================================================

  const loadData = useCallback(async () => {
    try {
      const [
        ledgerData,
        applicationData,
        repaymentData,
        memberData
      ] = await Promise.all([
        apiRequest("/admin/loan-ledger"),
        apiRequest("/loan-applications"),
        apiRequest("/admin/repayments"),
        apiRequest("/members")
      ]);

      setLoans(Array.isArray(ledgerData) ? ledgerData : []);
      setApplications(
        Array.isArray(applicationData) ? applicationData : []
      );
      setRepayments(
        Array.isArray(repaymentData) ? repaymentData : []
      );
      setMembers(Array.isArray(memberData) ? memberData : []);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =================================================
  // COMMON API ACTION
  // =================================================

  async function runAction(request, message) {
    if (busy) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await request();

      setModal(null);
      setSelectedApplication(null);
      setSelectedLoan(null);

      await loadData();

      setSuccess(response?.message || message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // =================================================
  // ADD LOAN APPLICATION
  // =================================================

  function openAddLoan() {
    setMemberId("");
    setLoanAmount("");
    setReason("");
    setError("");
    setModal("add");
  }

  function addLoan(event) {
    event.preventDefault();

    runAction(
      () =>
        apiRequest("/admin/loan-applications", {
          method: "POST",
          body: JSON.stringify({
            user_id: Number(memberId),
            amount: loanAmount,
            reason: reason.trim()
          })
        }),
      "Loan application created"
    );
  }

  // =================================================
  // APPROVE / REJECT
  // =================================================

  function approveApplication(id) {
    runAction(
      () =>
        apiRequest(`/loan-applications/${id}/approve`, {
          method: "PATCH"
        }),
      "Loan application approved"
    );
  }

  function rejectApplication(id) {
    const rejectionReason = window.prompt(
      "Enter the reason for rejecting this loan:"
    );

    if (!rejectionReason?.trim()) return;

    runAction(
      () =>
        apiRequest(`/loan-applications/${id}/reject`, {
          method: "PATCH",
          body: JSON.stringify({
            reason: rejectionReason.trim()
          })
        }),
      "Loan application rejected"
    );
  }

  // =================================================
  // RECORD CASH DISBURSEMENT
  // =================================================

  function openDisbursement(application) {
    setSelectedApplication(application);
    setCashDisbursed("");
    setError("");
    setModal("disbursement");
  }

  function recordDisbursement(event) {
    event.preventDefault();

    if (!selectedApplication) return;

    const expected = cents(
      selectedApplication.requested_amount
    );

    const entered = cents(cashDisbursed);

    if (entered === null || entered <= 0) {
      setError("Enter the amount of cash handed over.");
      return;
    }

    if (entered !== expected) {
      setError(
        "The cash disbursed must equal the approved amount. " +
        "Do not record a different amount against this approval."
      );
      return;
    }

    runAction(
      () =>
        apiRequest(
          `/admin/loan-applications/${selectedApplication.application_id}/disburse`,
          { method: "POST" }
        ),
      "Cash disbursement recorded"
    );
  }

  // =================================================
  // RECORD CASH REPAYMENT
  // =================================================

  function openRepayment(loan) {
    setSelectedLoan(loan);
    setCashRepayment("");
    setError("");
    setModal("repayment");
  }

  function repaymentAllocation(loan, amount) {
    const paymentCents = cents(amount);

    const principalCents = cents(
      loan.outstanding_principal
    ) ?? 0;

    const interestCents = cents(
      loan.outstanding_interest
    ) ?? 0;

    if (paymentCents === null) return null;

    if (
      paymentCents <= 0 ||
      paymentCents > principalCents + interestCents
    ) {
      return null;
    }

    // Pay already-assessed interest first.
    const interestPaid = Math.min(
      paymentCents,
      interestCents
    );

    const principalPaid = paymentCents - interestPaid;

    return {
      interest_paid: (interestPaid / 100).toFixed(2),
      principal_paid: (principalPaid / 100).toFixed(2),
      remaining: (
        (principalCents + interestCents - paymentCents) / 100
      ).toFixed(2)
    };
  }

  function recordRepayment(event) {
    event.preventDefault();

    if (!selectedLoan) return;

    const allocation = repaymentAllocation(
      selectedLoan,
      cashRepayment
    );

    if (!allocation) {
      setError(
        "Enter a valid cash payment greater than zero " +
        "and no more than the current outstanding balance."
      );
      return;
    }

    runAction(
      () =>
        apiRequest("/admin/repayments", {
          method: "POST",
          body: JSON.stringify({
            loan_id: selectedLoan.loan_id,
            principal_paid: allocation.principal_paid,
            interest_paid: allocation.interest_paid
          })
        }),
      "Cash repayment recorded successfully"
    );
  }

  // =================================================
  // CHECK OVERDUE
  // =================================================

  function checkOverdue(id) {
    runAction(
      () =>
        apiRequest(`/admin/loans/${id}/check-overdue`, {
          method: "POST"
        }),
      "Loan overdue status updated"
    );
  }

  // =================================================
  // COMPUTED VALUES
  // =================================================

  const activeLoans = loans.filter((loan) =>
    ["active", "overdue"].includes(loan.status)
  );

  const paidLoans = loans.filter(
    (loan) => loan.status === "paid"
  );

  const overdueLoans = loans.filter(
    (loan) => loan.status === "overdue"
  );

  const totalOutstanding = loans.reduce(
    (sum, loan) =>
      sum + Number(loan.total_owed || 0),
    0
  );

  const totalCashDisbursed = loans.reduce(
    (sum, loan) =>
      sum + Number(loan.principal || 0),
    0
  );

  const totalCashRepaid = loans.reduce(
    (sum, loan) =>
      sum + Number(loan.total_paid || 0),
    0
  );

  const eligibleMembers = members.filter(
    (member) => member.status === "active"
  );

  const filtered = loans.filter((loan) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      String(loan.full_name || "")
        .toLowerCase()
        .includes(query) ||
      String(loan.email || "")
        .toLowerCase()
        .includes(query) ||
      String(loan.loan_id).includes(query);

    const matchesStatus =
      status === "all" || loan.status === status;

    return matchesSearch && matchesStatus;
  });

  const history = selectedLoan
    ? repayments.filter(
        (item) =>
          Number(item.loan_id) ===
          Number(selectedLoan.loan_id)
      )
    : [];

  const stats = [
    {
      label: "Active Loans",
      value: activeLoans.length,
      icon: HandCoins
    },
    {
      label: "Cash Disbursed",
      value: money(totalCashDisbursed),
      icon: Banknote
    },
    {
      label: "Cash Repaid",
      value: money(totalCashRepaid),
      icon: Receipt
    },
    {
      label: "Total Outstanding",
      value: money(totalOutstanding),
      icon: Wallet,
      featured: true
    }
  ];

  const allocation = selectedLoan
    ? repaymentAllocation(selectedLoan, cashRepayment)
    : null;

  // =================================================
  // UI
  // =================================================

  return (
    <div className="ubc-page">
      <div className="ubc-page-heading">
        <div>
          <h1>Loan Management</h1>
          <p>
            Manage cash disbursements, repayments,
            and outstanding loan balances.
          </p>
        </div>

        <button
          type="button"
          className="ubc-button-primary"
          onClick={openAddLoan}
        >
          <Plus size={18} />
          Add Loan
        </button>
      </div>

      {/* SUMMARY */}

      <div className="ubc-cards">
        {stats.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className={`ubc-card ${
                card.featured ? "featured" : ""
              }`}
            >
              <div className="ubc-card-top">
                {card.label}

                <span className="ubc-card-icon">
                  <Icon size={19} />
                </span>
              </div>

              <strong>{card.value}</strong>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="ubc-alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="ubc-alert success" role="status">
          {success}
        </div>
      )}

      {/* LOAN APPLICATIONS */}

      <section
        className="ubc-panel"
        style={{ marginBottom: 23 }}
      >
        <div className="ubc-panel-title">
          <h2>Loan Applications</h2>
          <span>{applications.length} total</span>
        </div>

        <div className="ubc-table-wrap">
          <table className="ubc-table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Approved / Requested Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5">Loading applications...</td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    No loan applications yet.
                  </td>
                </tr>
              ) : (
                applications.map((application) => {
                  const issued = loans.some(
                    (loan) =>
                      Number(loan.application_id) ===
                      Number(application.application_id)
                  );

                  return (
                    <tr key={application.application_id}>
                      <td>
                        <strong>
                          {application.full_name}
                        </strong>
                      </td>

                      <td>
                        {money(application.requested_amount)}
                      </td>

                      <td>{application.reason}</td>

                      <td>
                        <span
                          className={`ubc-status ${
                            issued
                              ? "active"
                              : application.status
                          }`}
                        >
                          {issued
                            ? "Disbursed"
                            : application.status}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap"
                          }}
                        >
                          {application.status === "pending" && (
                            <>
                              <button
                                type="button"
                                className="ubc-button-secondary"
                                disabled={busy}
                                onClick={() =>
                                  approveApplication(
                                    application.application_id
                                  )
                                }
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                className="ubc-button-secondary"
                                disabled={busy}
                                onClick={() =>
                                  rejectApplication(
                                    application.application_id
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {application.status === "approved" &&
                            !issued && (
                              <button
                                type="button"
                                className="ubc-button-primary"
                                disabled={busy}
                                onClick={() =>
                                  openDisbursement(application)
                                }
                              >
                                <Banknote size={16} />
                                Disburse Cash
                              </button>
                            )}

                          {issued && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                color: "#198754",
                                fontWeight: 600
                              }}
                            >
                              <CheckCircle2 size={16} />
                              Cash handed over
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* BORROWER RECORDS */}

      <section className="ubc-panel">
        <div className="ubc-panel-title">
          <h2>Borrower Loan Records</h2>
          <span>{filtered.length} records</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
            color: "var(--ubc-muted)"
          }}
        >
          <span>
            Fully Paid: <strong>{paidLoans.length}</strong>
          </span>

          <span>
            Overdue: <strong>{overdueLoans.length}</strong>
          </span>
        </div>

        <div className="ubc-toolbar">
          <div style={{ position: "relative" }}>
            <Search
              size={17}
              style={{
                position: "absolute",
                top: 13,
                left: 12,
                color: "#888"
              }}
            />

            <input
              className="ubc-search"
              style={{ paddingLeft: 37 }}
              placeholder="Search borrower, email or loan ID"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            className="ubc-select"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
          >
            <option value="all">All Loans</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="ubc-table-wrap">
          <table className="ubc-table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Cash Disbursed</th>
                <th>Cash Repaid</th>
                <th>Principal Left</th>
                <th>Total Owed</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">
                    Loading borrower records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    No matching loan records.
                  </td>
                </tr>
              ) : (
                filtered.map((loan) => (
                  <tr key={loan.loan_id}>
                    <td>
                      <strong>{loan.full_name}</strong>

                      <div
                        style={{
                          marginTop: 5,
                          color: "var(--ubc-muted)"
                        }}
                      >
                        Loan #{loan.loan_id}
                      </div>
                    </td>

                    <td>{money(loan.principal)}</td>

                    <td>
                      <strong>
                        {money(loan.total_paid)}
                      </strong>
                    </td>

                    <td>
                      {money(loan.outstanding_principal)}
                    </td>

                    <td>
                      <strong>
                        {money(loan.total_owed)}
                      </strong>
                    </td>

                    <td>{date(loan.due_date)}</td>

                    <td>
                      <span
                        className={`ubc-status ${loan.status}`}
                      >
                        {loan.status}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 7
                        }}
                      >
                        <button
                          type="button"
                          className="ubc-button-secondary"
                          onClick={() => {
                            setSelectedLoan(loan);
                            setModal("history");
                          }}
                        >
                          History
                        </button>

                        {["active", "overdue"].includes(
                          loan.status
                        ) && (
                          <>
                            <button
                              type="button"
                              className="ubc-button-primary"
                              disabled={busy}
                              onClick={() =>
                                openRepayment(loan)
                              }
                            >
                              <Banknote size={15} />
                              Record Cash
                            </button>

                            <button
                              type="button"
                              className="ubc-button-secondary"
                              disabled={busy}
                              onClick={() =>
                                checkOverdue(loan.loan_id)
                              }
                            >
                              Check Due
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ADD LOAN MODAL */}

      {modal === "add" && (
        <div className="ubc-modal-backdrop">
          <div
            className="ubc-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="ubc-panel-title">
              <h2>Add Loan Application</h2>

              <button
                type="button"
                className="ubc-button-secondary"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                <X size={16} />
              </button>
            </div>

            <p>
              Create a new loan application.
              Approval and cash disbursement are recorded
              separately.
            </p>

            <form onSubmit={addLoan}>
              <div className="ubc-field">
                <label>Borrower</label>

                <select
                  value={memberId}
                  onChange={(event) =>
                    setMemberId(event.target.value)
                  }
                  required
                >
                  <option value="">Select member</option>

                  {eligibleMembers.map((member) => (
                    <option
                      key={member.user_id}
                      value={member.user_id}
                    >
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ubc-field">
                <label>Loan Amount</label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={loanAmount}
                  onChange={(event) =>
                    setLoanAmount(event.target.value)
                  }
                  required
                />
              </div>

              <div className="ubc-field">
                <label>Reason</label>

                <textarea
                  rows={3}
                  maxLength={500}
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  required
                />
              </div>

              <div className="ubc-modal-actions">
                <button
                  type="button"
                  className="ubc-button-secondary"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ubc-button-primary"
                  disabled={
                    busy || eligibleMembers.length === 0
                  }
                >
                  {busy
                    ? "Creating..."
                    : "Create Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASH DISBURSEMENT MODAL */}

      {modal === "disbursement" &&
        selectedApplication && (
          <div className="ubc-modal-backdrop">
            <div
              className="ubc-modal"
              role="dialog"
              aria-modal="true"
            >
              <div className="ubc-panel-title">
                <h2>
                  <Banknote size={21} />
                  Record Cash Disbursement
                </h2>

                <button
                  type="button"
                  className="ubc-button-secondary"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <p>
                Confirm cash has been physically
                handed over to this member.
              </p>

              <div
                className="ubc-card"
                style={{ margin: "18px 0" }}
              >
                <small>Borrower</small>
                <strong>
                  {selectedApplication.full_name}
                </strong>

                <small>Approved Amount</small>
                <strong>
                  {money(
                    selectedApplication.requested_amount
                  )}
                </strong>
              </div>

              <form onSubmit={recordDisbursement}>
                <div className="ubc-field">
                  <label>Cash Amount Handed Over</label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={cashDisbursed}
                    onChange={(event) =>
                      setCashDisbursed(event.target.value)
                    }
                    placeholder="Enter actual cash amount"
                    required
                  />
                </div>

                <p
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start"
                  }}
                >
                  <Info size={17} />
                  This records the approved amount as
                  disbursed today. The repayment deadline
                  starts today and ends three months later.
                </p>

                <div className="ubc-modal-actions">
                  <button
                    type="button"
                    className="ubc-button-secondary"
                    disabled={busy}
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="ubc-button-primary"
                    disabled={busy}
                  >
                    {busy
                      ? "Recording..."
                      : "Confirm Cash Disbursed"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* CASH REPAYMENT MODAL */}

      {modal === "repayment" && selectedLoan && (
        <div className="ubc-modal-backdrop">
          <div
            className="ubc-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="ubc-panel-title">
              <h2>
                <Receipt size={21} />
                Record Cash Repayment
              </h2>

              <button
                type="button"
                className="ubc-button-secondary"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            <p>
              {selectedLoan.full_name} ·
              Loan #{selectedLoan.loan_id}
            </p>

            <div
              className="ubc-card"
              style={{ margin: "18px 0" }}
            >
              <small>Total Cash Previously Repaid</small>
              <strong>
                {money(selectedLoan.total_paid)}
              </strong>

              <small>Current Recorded Amount Owed</small>
              <strong>
                {money(selectedLoan.total_owed)}
              </strong>

              <small>
                Principal:{" "}
                {money(selectedLoan.outstanding_principal)}
                {" · "}
                Assessed interest:{" "}
                {money(selectedLoan.outstanding_interest)}
              </small>
            </div>

            <form onSubmit={recordRepayment}>
              <div className="ubc-field">
                <label>Cash Received from Member</label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={Number(selectedLoan.total_owed)}
                  value={cashRepayment}
                  onChange={(event) =>
                    setCashRepayment(event.target.value)
                  }
                  placeholder="Enter amount received"
                  required
                />
              </div>

              {allocation && (
                <div
                  className="ubc-card"
                  style={{ margin: "15px 0" }}
                >
                  <small>Payment Allocation</small>

                  <p>
                    Interest paid:{" "}
                    <strong>
                      {money(allocation.interest_paid)}
                    </strong>
                  </p>

                  <p>
                    Principal paid:{" "}
                    <strong>
                      {money(allocation.principal_paid)}
                    </strong>
                  </p>

                  <small>Balance After Payment</small>

                  <strong>
                    {money(allocation.remaining)}
                  </strong>
                </div>
              )}

              <p
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start"
                }}
              >
                <Info size={17} />
                Record only cash actually received.
                Assessed interest is paid first, then
                principal. If the loan is past due, run
                Check Due first so the displayed balance
                includes any overdue charge.
              </p>

              <div className="ubc-modal-actions">
                <button
                  type="button"
                  className="ubc-button-secondary"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ubc-button-primary"
                  disabled={busy || !allocation}
                >
                  {busy
                    ? "Recording..."
                    : "Confirm Cash Received"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT HISTORY */}

      {modal === "history" && selectedLoan && (
        <div className="ubc-modal-backdrop">
          <div
            className="ubc-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="ubc-panel-title">
              <h2>Cash Repayment History</h2>

              <button
                type="button"
                className="ubc-button-secondary"
                onClick={() => setModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            <p>
              {selectedLoan.full_name} ·
              Loan #{selectedLoan.loan_id}
            </p>

            {history.length === 0 ? (
              <p>No cash repayments have been recorded.</p>
            ) : (
              <div className="ubc-table-wrap">
                <table className="ubc-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Cash Received</th>
                      <th>Principal</th>
                      <th>Interest</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((payment) => (
                      <tr key={payment.repayment_id}>
                        <td>
                          {date(payment.payment_date)}
                        </td>

                        <td>
                          <strong>
                            {money(
                              Number(
                                payment.principal_paid || 0
                              ) +
                              Number(
                                payment.interest_paid || 0
                              )
                            )}
                          </strong>
                        </td>

                        <td>
                          {money(payment.principal_paid)}
                        </td>

                        <td>
                          {money(payment.interest_paid)}
                        </td>

                        <td>
                          {payment.recorded_by_name || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="ubc-modal-actions">
              <button
                type="button"
                className="ubc-button-secondary"
                onClick={() => setModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

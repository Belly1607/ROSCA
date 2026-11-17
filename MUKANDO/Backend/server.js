
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

// =====================================
// 1. DATABASE CONNECTION
// =====================================

const db = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "rosca_v2",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: false
});

// Use integer cents for money calculations.
function toCents(value) {
    const text = String(value ?? "");

    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
        return null;
    }

    const [whole, fraction = ""] = text.split(".");
    const cents =
        Number(whole) * 100 +
        Number(fraction.padEnd(2, "0"));

    return Number.isSafeInteger(cents) ? cents : null;
}

function money(cents) {
    return (cents / 100).toFixed(2);
}

function validId(value) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function sendError(res, error) {
    console.error(error);
    return res.status(500).json({
        message: "Server error"
    });
}

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

app.get("/", (req, res) => {
    res.send("ROSCA Backend is running!");
});

app.get("/test-db", asyncRoute(async (req, res) => {
    const [[result]] = await db.query(
        "SELECT DATABASE() AS database_name"
    );

    res.json({
        message: "Database connection successful",
        database: result.database_name
    });
}));

// =====================================
// 2. AUTHENTICATION MIDDLEWARE
// =====================================

const authenticateToken = asyncRoute(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            message: "Please log in"
        });
    }

    let decoded;

    try {
        decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );
    } catch {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }

    const [users] = await db.query(
        `SELECT user_id, full_name, email, role, status
         FROM users
         WHERE user_id = ?`,
        [decoded.user_id]
    );

    if (!users.length || users[0].status !== "active") {
        return res.status(403).json({
            message: "Account unavailable"
        });
    }

    req.user = users[0];
    next();
});

function authorizeRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access forbidden"
            });
        }

        next();
    };
}

// =====================================
// 3. REGISTER MEMBER
// =====================================

app.post("/members", asyncRoute(async (req, res) => {
    const { name, email, contact, password } = req.body;

    if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== "string" ||
        password.length < 12 ||
        (contact != null && typeof contact !== "string")
    ) {
        return res.status(400).json({
            message: "Enter valid member details and a password of at least 12 characters"
        });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanContact = contact?.trim() || null;

    if (
        cleanName.length > 100 ||
        cleanEmail.length > 150 ||
        (cleanContact && cleanContact.length > 30)
    ) {
        return res.status(400).json({
            message: "Member details are too long"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
        const [result] = await db.query(
            `INSERT INTO users
             (full_name, email, phone, password_hash, role)
             VALUES (?, ?, ?, ?, 'member')`,
            [cleanName, cleanEmail, cleanContact, hashedPassword]
        );

        return res.status(201).json({
            message: "Member registered successfully",
            member_id: result.insertId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        throw error;
    }
}));

// =====================================
// 4. LOGIN
// =====================================

app.post("/login", asyncRoute(async (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const [results] = await db.query(
        `SELECT user_id, full_name, email,
                password_hash, role, status
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email.trim().toLowerCase()]
    );

    if (!results.length) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    const user = results[0];

    const validPassword = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!validPassword) {
        return res.status(401).json({
            message: "Invalid email or password"
        });
    }

    if (user.status !== "active") {
        return res.status(403).json({
            message: "Account inactive"
        });
    }

    const token = jwt.sign(
        { user_id: user.user_id },
        process.env.JWT_SECRET,
        { algorithm: "HS256", expiresIn: "1h" }
    );

    res.json({
        message: "Login successful",
        token,
        user: {
            user_id: user.user_id,
            name: user.full_name,
            email: user.email,
            role: user.role
        }
    });
}));

// =====================================
// 5. CURRENT USER PROFILE
// =====================================

app.get("/me", authenticateToken, (req, res) => {
    res.json(req.user);
});

// =====================================
// 6. ADMIN: GET ALL MEMBERS
// =====================================

app.get(
    "/members",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const [members] = await db.query(
            `SELECT user_id, full_name, email,
                    phone, role, status, created_at
             FROM users
             WHERE role = 'member'
             ORDER BY user_id DESC`
        );

        res.json(members);
    })
);

// =====================================
// 7. ACTIVE SAVINGS CYCLES
// =====================================

app.get(
    "/savings-cycles",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const [cycles] = await db.query(
            `SELECT cycle_id, cycle_year, start_date,
                    end_date, status, share_price
             FROM savings_cycles
             WHERE status = 'active'
             ORDER BY cycle_year DESC`
        );

        res.json(cycles);
    })
);

// =====================================
// 8. MEMBER: SUBMIT CONTRIBUTION
// =====================================

app.post(
    "/contributions",
    authenticateToken,
    authorizeRole("member"),
    asyncRoute(async (req, res) => {
        const cycleId = validId(req.body.cycle_id);
        const shares = validId(req.body.number_of_shares);
        const reference = req.body.payment_reference || null;

        if (!cycleId || !shares || shares > 1000000) {
            return res.status(400).json({
                message: "Valid cycle and number of shares required"
            });
        }

        if (
            reference !== null &&
            (typeof reference !== "string" ||
             reference.length > 100)
        ) {
            return res.status(400).json({
                message: "Invalid payment reference"
            });
        }

        const [result] = await db.query(
            `INSERT INTO contributions
             (user_id, cycle_id, contribution_month,
              number_of_shares, share_price,
              payment_date, payment_reference, status)
             SELECT ?, cycle_id, MONTH(CURDATE()),
                    ?, share_price, CURDATE(), ?, 'pending'
             FROM savings_cycles
             WHERE cycle_id = ?
               AND status = 'active'
               AND CURDATE() BETWEEN start_date AND end_date`,
            [
                req.user.user_id,
                shares,
                reference,
                cycleId
            ]
        );

        if (!result.affectedRows) {
            return res.status(400).json({
                message: "Savings cycle is not active"
            });
        }

        res.status(201).json({
            message: "Contribution submitted for verification",
            contribution_id: result.insertId,
            status: "pending"
        });
    })
);

// =====================================
// 9. MEMBER: OWN CONTRIBUTIONS
// =====================================

app.get(
    "/my-contributions",
    authenticateToken,
    authorizeRole("member"),
    asyncRoute(async (req, res) => {
        const [rows] = await db.query(
            `SELECT c.*, s.cycle_year
             FROM contributions c
             JOIN savings_cycles s
               ON c.cycle_id = s.cycle_id
             WHERE c.user_id = ?
             ORDER BY c.created_at DESC`,
            [req.user.user_id]
        );

        res.json(rows);
    })
);

// =====================================
// 10. ADMIN: VIEW CONTRIBUTIONS
// =====================================

app.get(
    "/admin/contributions",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const [rows] = await db.query(
            `SELECT c.*, u.full_name, s.cycle_year
             FROM contributions c
             JOIN users u ON c.user_id = u.user_id
             JOIN savings_cycles s
               ON c.cycle_id = s.cycle_id
             ORDER BY c.created_at DESC`
        );

        res.json(rows);
    })
);

// =====================================
// 11. ADMIN: VERIFY CONTRIBUTION
// =====================================

app.patch(
    "/admin/contributions/:id/verify",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const id = validId(req.params.id);

        if (!id) {
            return res.status(400).json({
                message: "Invalid contribution ID"
            });
        }

        const [result] = await db.query(
            `UPDATE contributions
             SET status = 'verified',
                 verified_by = ?,
                 verified_at = NOW()
             WHERE contribution_id = ?
               AND status = 'pending'`,
            [req.user.user_id, id]
        );

        if (!result.affectedRows) {
            return res.status(409).json({
                message: "Contribution not found or already reviewed"
            });
        }

        res.json({
            message: "Contribution verified successfully"
        });
    })
);

// =====================================
// 12. ADMIN: REJECT CONTRIBUTION
// =====================================

app.patch(
    "/admin/contributions/:id/reject",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const id = validId(req.params.id);

        if (!id) {
            return res.status(400).json({
                message: "Invalid contribution ID"
            });
        }

        const [result] = await db.query(
            `UPDATE contributions
             SET status = 'rejected',
                 verified_by = ?,
                 verified_at = NOW()
             WHERE contribution_id = ?
               AND status = 'pending'`,
            [req.user.user_id, id]
        );

        if (!result.affectedRows) {
            return res.status(409).json({
                message: "Contribution already reviewed or missing"
            });
        }

        res.json({
            message: "Contribution rejected"
        });
    })
);

// =====================================
// 13. MEMBER: APPLY FOR LOAN
// =====================================

app.post(
    "/loan-applications",
    authenticateToken,
    authorizeRole("member"),
    asyncRoute(async (req, res) => {
        const cycleId = validId(req.body.cycle_id);
        const amount = toCents(req.body.amount);
        const reason = req.body.reason;

        if (
            !cycleId ||
            amount === null ||
            amount <= 0 ||
            amount > 999999999999
        ) {
            return res.status(400).json({
                message: "Invalid loan details"
            });
        }

        if (
            typeof reason !== "string" ||
            !reason.trim() ||
            reason.length > 500
        ) {
            return res.status(400).json({
                message: "Valid loan reason required"
            });
        }

        const [result] = await db.query(
            `INSERT INTO loan_applications
             (user_id, cycle_id, requested_amount, reason)
             SELECT ?, cycle_id, ?, ?
             FROM savings_cycles
             WHERE cycle_id = ?
               AND status = 'active'
               AND CURDATE() BETWEEN start_date AND end_date`,
            [
                req.user.user_id,
                money(amount),
                reason.trim(),
                cycleId
            ]
        );

        if (!result.affectedRows) {
            return res.status(400).json({
                message: "Savings cycle not active"
            });
        }

        res.status(201).json({
            message: "Loan application submitted",
            application_id: result.insertId,
            status: "pending"
        });
    })
);

// =====================================
// 14. MEMBER: OWN LOAN APPLICATIONS
// =====================================

app.get(
    "/my-loan-applications",
    authenticateToken,
    authorizeRole("member"),
    asyncRoute(async (req, res) => {
        const [rows] = await db.query(
            `SELECT *
             FROM loan_applications
             WHERE user_id = ?
             ORDER BY applied_at DESC`,
            [req.user.user_id]
        );

        res.json(rows);
    })
);

// =====================================
// 15. ADMIN: VIEW LOAN APPLICATIONS
// =====================================

app.get(
    "/loan-applications",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const [rows] = await db.query(
            `SELECT la.*, u.full_name
             FROM loan_applications la
             JOIN users u ON la.user_id = u.user_id
             ORDER BY la.applied_at DESC`
        );

        res.json(rows);
    })
);

// =====================================
// 16. ADMIN: APPROVE APPLICATION
// Approval is separate from disbursement.
// =====================================

app.patch(
    "/loan-applications/:id/approve",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const id = validId(req.params.id);

        if (!id) {
            return res.status(400).json({
                message: "Invalid application ID"
            });
        }

        const [result] = await db.query(
            `UPDATE loan_applications
             SET status = 'approved',
                 reviewed_by = ?,
                 reviewed_at = NOW()
             WHERE application_id = ?
               AND status = 'pending'`,
            [req.user.user_id, id]
        );

        if (!result.affectedRows) {
            return res.status(409).json({
                message: "Application missing or already reviewed"
            });
        }

        res.json({
            message: "Loan application approved. Disbursement is still required."
        });
    })
);

// =====================================
// 17. ADMIN: REJECT APPLICATION
// =====================================

app.patch(
    "/loan-applications/:id/reject",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const id = validId(req.params.id);
        const reason = req.body.reason;

        if (
            !id ||
            typeof reason !== "string" ||
            !reason.trim() ||
            reason.length > 500
        ) {
            return res.status(400).json({
                message: "Valid ID and rejection reason required"
            });
        }

        const [result] = await db.query(
            `UPDATE loan_applications
             SET status = 'rejected',
                 reviewed_by = ?,
                 reviewed_at = NOW(),
                 rejection_reason = ?
             WHERE application_id = ?
               AND status = 'pending'`,
            [req.user.user_id, reason.trim(), id]
        );

        if (!result.affectedRows) {
            return res.status(409).json({
                message: "Application missing or already reviewed"
            });
        }

        res.json({
            message: "Loan application rejected"
        });
    })
);

// =====================================
// 18. ADMIN: ISSUE APPROVED LOAN
// Actual money must already be handed over.
// =====================================

app.post(
    "/admin/loan-applications/:id/disburse",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const id = validId(req.params.id);

        if (!id) {
            return res.status(400).json({
                message: "Invalid application ID"
            });
        }

        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            const [apps] = await conn.query(
                `SELECT *
                 FROM loan_applications
                 WHERE application_id = ?
                 FOR UPDATE`,
                [id]
            );

            if (
                !apps.length ||
                apps[0].status !== "approved"
            ) {
                await conn.rollback();
                return res.status(409).json({
                    message: "Application is not approved"
                });
            }

            const application = apps[0];

            const [existing] = await conn.query(
                `SELECT loan_id FROM loans
                 WHERE application_id = ?`,
                [id]
            );

            if (existing.length) {
                await conn.rollback();
                return res.status(409).json({
                    message: "Loan already issued"
                });
            }

            const [result] = await conn.query(
                `INSERT INTO loans
                 (application_id, user_id, cycle_id,
                  principal, issued_date, due_date, status)
                 VALUES (?, ?, ?, ?, CURDATE(),
                         DATE_ADD(CURDATE(), INTERVAL 3 MONTH),
                         'active')`,
                [
                    id,
                    application.user_id,
                    application.cycle_id,
                    application.requested_amount
                ]
            );

            await conn.commit();

            res.status(201).json({
                message: "Loan disbursement recorded",
                loan_id: result.insertId
            });

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    })
);

// =====================================
// 19. ADMIN: VIEW ALL LOANS
// =====================================

app.get(
    "/loans",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const [rows] = await db.query(
            `SELECT l.*, u.full_name
             FROM loans l
             JOIN users u ON l.user_id = u.user_id
             ORDER BY l.loan_id DESC`
        );

        res.json(rows);
    })
);

// =====================================
// 20. MEMBER: VIEW OWN LOANS
// =====================================

app.get(
    "/my-loans",
    authenticateToken,
    authorizeRole("member"),
    asyncRoute(async (req, res) => {
        const [rows] = await db.query(
            `SELECT l.loan_id, l.principal, l.issued_date,
                    l.due_date, l.status,
                    COALESCE(r.principal_paid, 0) AS principal_paid,
                    COALESCE(r.interest_paid, 0) AS interest_paid,
                    COALESCE(i.charge_amount, 0) AS interest_charged
             FROM loans l
             LEFT JOIN (
                 SELECT loan_id,
                        SUM(principal_paid) AS principal_paid,
                        SUM(interest_paid) AS interest_paid
                 FROM repayments
                 WHERE status = 'verified'
                 GROUP BY loan_id
             ) r ON l.loan_id = r.loan_id
             LEFT JOIN interest_charges i
               ON l.loan_id = i.loan_id
             WHERE l.user_id = ?
             ORDER BY l.loan_id DESC`,
            [req.user.user_id]
        );

        res.json(rows);
    })
);

// =====================================
// 21. CALCULATE OUTSTANDING LOAN
// Used inside a database transaction.
// =====================================

async function getLoanBalance(conn, loanId) {
    const [loans] = await conn.query(
        `SELECT loan_id, principal, due_date, status
         FROM loans
         WHERE loan_id = ?
         FOR UPDATE`,
        [loanId]
    );

    if (!loans.length) return null;

    const loan = loans[0];

    const [[payments]] = await conn.query(
        `SELECT
            COALESCE(SUM(principal_paid), 0) AS principal_paid,
            COALESCE(SUM(interest_paid), 0) AS interest_paid
         FROM repayments
         WHERE loan_id = ?
           AND status = 'verified'`,
        [loanId]
    );

    const [charges] = await conn.query(
        `SELECT charge_amount
         FROM interest_charges
         WHERE loan_id = ?`,
        [loanId]
    );

    const principalOutstanding = Math.max(
        0,
        toCents(loan.principal) -
        toCents(payments.principal_paid)
    );

    const interestCharged = charges.length
        ? toCents(charges[0].charge_amount)
        : 0;

    const interestOutstanding = Math.max(
        0,
        interestCharged - toCents(payments.interest_paid)
    );

    return {
        loan,
        principalOutstanding,
        interestOutstanding,
        hasInterestCharge: charges.length > 0
    };
}

// =====================================
// 22. APPLY ONE-TIME OVERDUE INTEREST
// Called from inside a transaction.
// =====================================

async function assessLateInterest(conn, loanId) {
    const balance = await getLoanBalance(conn, loanId);

    if (!balance) return null;

    const {
        loan,
        principalOutstanding,
        hasInterestCharge
    } = balance;

    if (
        loan.status === "cancelled" ||
        loan.status === "paid" ||
        hasInterestCharge ||
        principalOutstanding <= 0
    ) {
        return balance;
    }

    const [[dateCheck]] = await conn.query(
        `SELECT CURDATE() > ? AS is_overdue`,
        [loan.due_date]
    );

    if (!dateCheck.is_overdue) {
        return balance;
    }

    const interest = Math.round(
        principalOutstanding * 20 / 100
    );

    if (interest > 0) {
        await conn.query(
            `INSERT INTO interest_charges
             (loan_id, outstanding_principal_at_charge,
              interest_rate, charge_amount,
              charged_on, charge_reason)
             VALUES (?, ?, 0.2000, ?, CURDATE(),
                     'One-time 20% overdue interest')`,
            [
                loanId,
                money(principalOutstanding),
                money(interest)
            ]
        );
    }

    await conn.query(
        `UPDATE loans
         SET status = 'overdue'
         WHERE loan_id = ?`,
        [loanId]
    );

    return getLoanBalance(conn, loanId);
}

// =====================================
// 23. ADMIN: ASSESS OVERDUE INTEREST
// =====================================

app.post(
    "/admin/loans/:id/check-overdue",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const loanId = validId(req.params.id);

        if (!loanId) {
            return res.status(400).json({
                message: "Invalid loan ID"
            });
        }

        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            const balance = await assessLateInterest(
                conn,
                loanId
            );

            if (!balance) {
                await conn.rollback();
                return res.status(404).json({
                    message: "Loan not found"
                });
            }

            await conn.commit();

            res.json({
                message: "Loan checked successfully",
                principal_outstanding:
                    money(balance.principalOutstanding),
                interest_outstanding:
                    money(balance.interestOutstanding)
            });

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    })
);

// =====================================
// 24. ADMIN: RECORD VERIFIED REPAYMENT
// =====================================

app.post(
    "/admin/repayments",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const loanId = validId(req.body.loan_id);
        const principalPaid = toCents(
            req.body.principal_paid ?? "0"
        );
        const interestPaid = toCents(
            req.body.interest_paid ?? "0"
        );

        if (
            !loanId ||
            principalPaid === null ||
            interestPaid === null ||
            principalPaid + interestPaid <= 0
        ) {
            return res.status(400).json({
                message: "Valid repayment details required"
            });
        }

        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            let balance = await assessLateInterest(
                conn,
                loanId
            );

            if (
                !balance ||
                !["active", "overdue"].includes(
                    balance.loan.status
                )
            ) {
                await conn.rollback();
                return res.status(409).json({
                    message: "Loan cannot accept repayments"
                });
            }

            if (
                principalPaid > balance.principalOutstanding ||
                interestPaid > balance.interestOutstanding
            ) {
                await conn.rollback();
                return res.status(400).json({
                    message: "Payment exceeds outstanding balance"
                });
            }

            const [result] = await conn.query(
                `INSERT INTO repayments
                 (loan_id, principal_paid, interest_paid,
                  payment_date, status,
                  recorded_by, verified_by, verified_at)
                 VALUES (?, ?, ?, CURDATE(), 'verified',
                         ?, ?, NOW())`,
                [
                    loanId,
                    money(principalPaid),
                    money(interestPaid),
                    req.user.user_id,
                    req.user.user_id
                ]
            );

            const remainingPrincipal =
                balance.principalOutstanding - principalPaid;

            const remainingInterest =
                balance.interestOutstanding - interestPaid;

            if (
                remainingPrincipal === 0 &&
                remainingInterest === 0
            ) {
                await conn.query(
                    `UPDATE loans
                     SET status = 'paid'
                     WHERE loan_id = ?`,
                    [loanId]
                );
            }

            await conn.commit();

            res.status(201).json({
                message: "Repayment recorded successfully",
                repayment_id: result.insertId,
                remaining_principal: money(remainingPrincipal),
                remaining_interest: money(remainingInterest)
            });

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    })
);

// =====================================
// 25. ADMIN: DASHBOARD
// =====================================

app.get(
    "/dashboard",
    authenticateToken,
    authorizeRole("admin"),
    asyncRoute(async (req, res) => {
        const [[members]] = await db.query(
            `SELECT COUNT(*) AS totalMembers
             FROM users
             WHERE role = 'member'`
        );

        const [[loans]] = await db.query(
            `SELECT COUNT(*) AS activeLoans
             FROM loans
             WHERE status IN ('active', 'overdue')`
        );

        const [[contributions]] = await db.query(
            `SELECT
                COALESCE(SUM(amount), 0) AS totalContributions,
                COALESCE(SUM(number_of_shares), 0) AS totalShares
             FROM contributions
             WHERE status = 'verified'`
        );

        const [[repayments]] = await db.query(
            `SELECT
                COALESCE(SUM(principal_paid), 0) AS principalRepaid,
                COALESCE(SUM(interest_paid), 0) AS interestEarned
             FROM repayments
             WHERE status = 'verified'`
        );

        const [[issued]] = await db.query(
            `SELECT COALESCE(SUM(principal), 0) AS totalIssued
             FROM loans
             WHERE status <> 'cancelled'`
        );

        const [[expenses]] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) AS totalExpenses
             FROM fund_expenses
             WHERE status = 'verified'`
        );

        const [[payouts]] = await db.query(
            `SELECT COALESCE(SUM(amount_paid), 0) AS totalPayouts
             FROM distribution_payments`
        );

        const availableCents =
            toCents(contributions.totalContributions) +
            toCents(repayments.principalRepaid) +
            toCents(repayments.interestEarned) -
            toCents(issued.totalIssued) -
            toCents(expenses.totalExpenses) -
            toCents(payouts.totalPayouts);

        res.json({
            totalMembers: members.totalMembers,
            activeLoans: loans.activeLoans,
            totalShares: contributions.totalShares,
            totalContributions:
                contributions.totalContributions,
            interestEarned: repayments.interestEarned,
            totalExpenses: expenses.totalExpenses,
            availableFunds: money(availableCents)
        });
    })
);

// =====================================
// 26. ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
    sendError(res, err);
});

// =====================================
// 27. START SERVER
// =====================================

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    await db.query("SELECT 1");

    console.log("Connected to ROSCA MariaDB database");

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer().catch((error) => {
    console.error("Startup failed:", error.message);
    process.exit(1);
});

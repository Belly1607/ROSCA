
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const app = express();
const jwt = require("jsonwebtoken");
app.use(cors());
app.use(express.json());

/* ===========================
   DATABASE CONNECTION
=========================== */

const connection = mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "rosca",
    port: Number(process.env.DB_PORT || 3306)
});

connection.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    }

    console.log("Connected to ROSCA MySQL database");
});

/* ===========================
   TEST CONNECTION
=========================== */

app.get("/", (req, res) => {
    res.send("ROSCA Backend is running!");
});

app.get("/test-db", (req, res) => {
    connection.query(
        "SELECT DATABASE() AS database_name",
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    error: "Database query failed"
                });
            }

            res.json({
                message: "Database connection successful",
                database: results[0].database_name
            });
        }
    );
});

/* ===========================
   MEMBERS
=========================== */

// Get all members
app.get("/members", (req, res) => {

    const sql = `
        SELECT user_id, full_name, email,
               phone, role, status, created_at
        FROM users
        WHERE role = 'member'
    `;

    connection.query(sql, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Failed to fetch members"
            });
        }

        res.json(results);
    });
});

/*
  Member registration will be implemented with
  password hashing and authentication.
*/


/* ===========================
   REGISTER MEMBER
=========================== */

app.post("/members", async (req, res) => {

    try {
        const { name, email, contact, password } = req.body;

        // Validate required fields
        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            password.length < 12
        ) {
            return res.status(400).json({
                message: "Name, email and a password of at least 12 characters are required"
            });
        }

        if (contact != null && typeof contact !== "string") {
            return res.status(400).json({
                message: "Contact must be text"
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanContact = contact?.trim() || null;

        if (
            cleanName.length > 100 ||
            cleanEmail.length > 150 ||
            (cleanContact && cleanContact.length > 30) ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                message: "Invalid member details"
            });
        }

        // Hash password securely
        const hashedPassword = await bcrypt.hash(password, 12);

        // Save new member
        const sql = `
            INSERT INTO users
            (full_name, email, phone, password_hash, role, status)
            VALUES (?, ?, ?, ?, 'member', 'active')
        `;

        connection.query(
            sql,
            [cleanName, cleanEmail, cleanContact, hashedPassword],
            (err, result) => {

                if (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({
                            message: "Email already registered"
                        });
                    }

                    console.error("Registration error:", err);

                    return res.status(500).json({
                        message: "Registration failed"
                    });
                }

                res.status(201).json({
                    message: "Member registered successfully",
                    member_id: result.insertId
                });
            }
        );

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            message: "Registration failed"
        });
    }
});

/* ===========================
   MEMBER AND ADMIN LOGIN
=========================== */

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password ||
        typeof email !== "string" ||
        typeof password !== "string") {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    const sql = `
        SELECT user_id, full_name, email,
               password_hash, role, status
        FROM users
        WHERE email = ?
        LIMIT 1
    `;

    connection.query(
        sql,
        [email.trim().toLowerCase()],
        async (err, results) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Login failed"
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const user = results[0];

            try {
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
                        message: "Account is inactive"
                    });
                }

                if (!process.env.JWT_SECRET) {
                    return res.status(500).json({
                        message: "JWT secret is not configured"
                    });
                }

                const token = jwt.sign(
                    { user_id: user.user_id },
                    process.env.JWT_SECRET,
                    { expiresIn: "1h" }
                );

                return res.json({
                    message: "Login successful",
                    token,
                    user: {
                        user_id: user.user_id,
                        name: user.full_name,
                        email: user.email,
                        role: user.role
                    }
                });

            } catch (error) {
                console.error(error);
                return res.status(500).json({
                    message: "Login failed"
                });
            }
        }
    );
});


/* ===========================
   LOANS
=========================== */

// Get all loans
app.get("/loans", (req, res) => {

    const sql = `
        SELECT
            l.loan_id,
            l.user_id,
            u.full_name,
            l.principal,
            l.issued_date,
            l.due_date,
            l.status
        FROM loans l
        JOIN users u ON l.user_id = u.user_id
    `;

    connection.query(sql, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Failed to fetch loans"
            });
        }

        res.json(results);
    });
});

/*
  Loan applications will need an approval workflow.

  The loans table currently represents issued loans,
  so we must not insert unapproved applications there.

  We'll create a separate loan application endpoint
  when implementing member authentication.
*/

/* ===========================
   DASHBOARD
=========================== */

app.get("/dashboard", (req, res) => {

    const membersSql = `
        SELECT COUNT(*) AS totalMembers
        FROM users
        WHERE role = 'member'
    `;

    const loansSql = `
        SELECT COUNT(*) AS activeLoans
        FROM loans
        WHERE status = 'active'
    `;

    const contributionsSql = `
        SELECT COALESCE(SUM(amount_paid), 0)
        AS totalContributions
        FROM contributions
    `;

    connection.query(membersSql, (err, members) => {

        if (err) {
            return res.status(500).json({
                error: "Failed to fetch members count"
            });
        }

        connection.query(loansSql, (err, loans) => {

            if (err) {
                return res.status(500).json({
                    error: "Failed to fetch loans count"
                });
            }

            connection.query(
                contributionsSql,
                (err, contributions) => {

                    if (err) {
                        return res.status(500).json({
                            error: "Failed to fetch contributions"
                        });
                    }

                    res.json({
                        totalMembers: members[0].totalMembers,
                        activeLoans: loans[0].activeLoans,
                        totalContributions:
                            contributions[0].totalContributions
                    });
                }
            );
        });
    });
});


const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

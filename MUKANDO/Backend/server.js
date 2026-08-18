require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "your_password",
    database: "rosca"
});

connection.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }

    console.log("Connected to MySQL");
});

/* ===========================
   MEMBERS
=========================== */

app.get("/members", (req, res) => {

    connection.query(
        "SELECT * FROM member",
        (err, results) => {

            if (err) {
                console.error(err);
                return res.status(500).json(err);
            }

            res.json(results);
        }
    );
});

app.post("/members", (req, res) => {

    const { name, contact, email, gender } = req.body;

    const sql = `
        INSERT INTO member
        (membername, contact, email, gender, date_joined)
        VALUES (?, ?, ?, ?, CURDATE())
    `;

    connection.query(
        sql,
        [name, contact, email, gender],
        (err, result) => {

            if (err) {
                console.error(err);
                return res.status(500).json(err);
            }

            res.status(201).json({
                message: "Member added successfully"
            });
        }
    );
});

/* ===========================
   LOANS
=========================== */

app.get("/loans", (req, res) => {

    connection.query(
        "SELECT * FROM loan",
        (err, results) => {

            if (err) {
                console.error(err);
                return res.status(500).json(err);
            }

            res.json(results);
        }
    );
});

app.post("/loans", (req, res) => {

    const {
        member_id,
        amount,
        duration,
        interestRate,
        totalInterest,
        totalRepayment,
        reason
    } = req.body;

    const sql = `
        INSERT INTO loan
        (
            member_id,
            amount,
            duration,
            interest_rate,
            total_interest,
            total_repayment,
            reason,
            statusapproval,
            date_applied
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', CURDATE())
    `;

    connection.query(
        sql,
        [
            member_id,
            amount,
            duration,
            interestRate,
            totalInterest,
            totalRepayment,
            reason
        ],
        (err, result) => {

            if (err) {
                console.error(err);
                return res.status(500).json(err);
            }

            res.status(201).json({
                message: "Loan submitted successfully",
                id: result.insertId
            });
        }
    );
});

/* ===========================
   DASHBOARD
=========================== */

app.get("/dashboard", (req, res) => {

    connection.query(
        "SELECT COUNT(*) AS totalMembers FROM member",
        (err, members) => {

            if (err) {
                return res.status(500).json(err);
            }

            connection.query(
                "SELECT COUNT(*) AS activeLoans FROM loan",
                (err, loans) => {

                    if (err) {
                        return res.status(500).json(err);
                    }

                    connection.query(
                        "SELECT IFNULL(SUM(amount_paid),0) AS totalBalance FROM transactions",
                        (err, balance) => {

                            if (err) {
                                return res.status(500).json(err);
                            }

                            res.json({
                                totalMembers: members[0].totalMembers,
                                activeLoans: loans[0].activeLoans,
                                totalBalance: balance[0].totalBalance
                            });
                        }
                    );
                }
            );
        }
    );
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
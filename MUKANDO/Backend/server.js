
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/test", (req, res) => {
    res.json({ message: "working" });
});

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "your_password",
    database: "ROSCA"
});

connection.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }

    console.log("Connected to MySQL");
});
connection.query(
  "SELECT @@hostname AS hostname, @@port AS port, CURRENT_USER() AS user, @@datadir AS datadir",
  (err, results) => {
    console.log("SERVER INFO:", results);
  }
);
connection.query(
    "SELECT * FROM loan",
    (err, results) => {
        console.log("ALL LOANS:", results);
    }
);
app.get("/members", (req, res) => {
    const sql = "SELECT * FROM Member";

    connection.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json(err);
        }

        res.json(results);
    });
});

app.post("/members", (req, res) => {
    console.log("Request body:", req.body);

    const { name, contact, email, gender } = req.body;

    const sql = `
        INSERT INTO Member
        (membername, contact, email, gender, date_joined)
        VALUES (?, ?, ?, ?, CURDATE())
    `;

    connection.query(
        sql,
        [name, contact, email, gender],
        (err, result) => {
            if (err) {
                console.error("MYSQL ERROR:");
                console.error(err);
                return res.status(500).json({
                    error: err.message
                });
            }

            res.status(201).json({
                message: "Member added successfully"
            });
        }
    );
});

app.get("/loans", (req, res) => {
    connection.query(
        "SELECT * FROM loan",
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json(err);
            }

            console.log("LOANS FOUND:", JSON.stringify(results, null, 2));

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
        INSERT INTO Loan
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
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
            reason,
            "Pending"
        ],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: err.message
                });
            }

            res.status(201).json({
                message: "Loan application submitted sucessfully",
                id: result.insertId
            });
        }
    );
});

app.get("/dashboard", (req, res) => {

    const membersSql =
        "SELECT COUNT(*) AS totalMembers FROM Member";

    const loansSql =
        "SELECT COUNT(*) AS activeLoans FROM Loan";

    const balanceSql =
        "SELECT IFNULL(SUM(amount_paid),0) AS totalBalance FROM Transactions";

    connection.query(membersSql, (err, members) => {

        if (err) {
            return res.status(500).json(err);
        }

        connection.query(loansSql, (err, loans) => {

            if (err) {
                return res.status(500).json(err);
            }

            connection.query(balanceSql, (err, balance) => {

                if (err) {
                    return res.status(500).json(err);
                }

                res.json({
                    totalMembers: members[0].totalMembers,
                    activeLoans: loans[0].activeLoans,
                    totalBalance: balance[0].totalBalance
                });

            });

        });

    });
});



const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


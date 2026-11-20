
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: "100kb" }));

// ====================================================
// DATABASE
// ====================================================

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "rosca_v2",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: false
});

// ====================================================
// HELPERS
// ====================================================

function validId(value) {
  if (value == null || String(value).trim() === "") return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function toCents(value) {
  const text = String(value ?? "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 +
    Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

function money(cents) {
  return (cents / 100).toFixed(2);
}

function asyncRoute(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}

function fail(res, status, message) {
  return res.status(status).json({ message });
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function getCurrentCycle(conn = db) {
  const [rows] = await conn.query(
    `SELECT cycle_id, cycle_year, share_price
     FROM savings_cycles
     WHERE status = 'active'
       AND CURDATE() BETWEEN start_date AND end_date`
  );

  if (rows.length !== 1) {
    throw httpError(
      409,
      rows.length === 0
        ? "No active savings cycle. Create and activate one in Admin Settings."
        : "Multiple active savings cycles overlap."
    );
  }

  return rows[0];
}

// ====================================================
// BASIC API TEST
// ====================================================

app.get("/", (req, res) => {
  res.json({ message: "UBC ROSCA API is running" });
});

app.get("/test-db", asyncRoute(async (req, res) => {
  const [[row]] = await db.query(
    "SELECT DATABASE() AS database_name"
  );
  res.json({
    message: "Database connection successful",
    database: row.database_name
  });
}));

// ====================================================
// AUTHENTICATION
// ====================================================

const authenticateToken = asyncRoute(async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) return fail(res, 401, "Please log in");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"]
    });
  } catch {
    return fail(res, 401, "Invalid or expired token");
  }

  const [rows] = await db.query(
    `SELECT user_id, full_name, email, role, status
     FROM users WHERE user_id = ? LIMIT 1`,
    [decoded.user_id]
  );

  if (!rows.length) return fail(res, 401, "Account not found");
  if (rows[0].status !== "active") {
    return fail(res, 403, "Account not active");
  }

  req.user = rows[0];
  next();
});

function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, "Access forbidden");
    }
    next();
  };
}

// ====================================================
// REGISTRATION AND LOGIN
// ====================================================

app.post("/members", asyncRoute(async (req, res) => {
  const { name, email, contact, password } = req.body;

  if (
    typeof name !== "string" || !name.trim() ||
    name.trim().length > 100 ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    email.length > 150 ||
    typeof password !== "string" ||
    password.length < 12 || password.length > 128 ||
    (contact != null &&
      (typeof contact !== "string" || contact.length > 30))
  ) {
    return fail(res, 400, "Invalid member registration details");
  }

  const hash = await bcrypt.hash(password, 12);

  try {
    const [result] = await db.query(
      `INSERT INTO users
       (full_name,email,phone,password_hash,role,status)
       VALUES (?,?,?,?,'member','pending')`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        contact?.trim() || null,
        hash
      ]
    );

    res.status(201).json({
      message: "Registration submitted. Awaiting admin approval.",
      member_id: result.insertId,
      status: "pending"
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return fail(res, 409, "Email already registered");
    }
    throw err;
  }
}));

app.post("/login", asyncRoute(async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return fail(res, 400, "Email and password required");
  }

  const [rows] = await db.query(
    `SELECT user_id,full_name,email,password_hash,role,status
     FROM users WHERE email = ? LIMIT 1`,
    [email.trim().toLowerCase()]
  );

  if (!rows.length ||
      !(await bcrypt.compare(password, rows[0].password_hash))) {
    return fail(res, 401, "Invalid email or password");
  }

  const user = rows[0];

  if (user.status !== "active") {
    return fail(
      res, 403,
      user.status === "pending"
        ? "Your account is awaiting administrator approval."
        : "Your account is inactive."
    );
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

app.get("/me", authenticateToken, (req, res) => {
  res.json(req.user);
});

// ====================================================
// MEMBERS WITH VERIFIED CONTRIBUTION TOTALS
// ====================================================

app.get(
  "/members",
  authenticateToken,
  authorizeRole("admin"),
  asyncRoute(async (req, res) => {
    const [rows] = await db.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.phone,
         u.role,
         u.status,
         u.created_at,
         COALESCE(c.total_contributions,0) AS total_contributions,
         COALESCE(c.total_shares,0) AS total_shares
       FROM users u
       LEFT JOIN (
         SELECT
           user_id,
           SUM(number_of_shares * share_price)
             AS total_contributions,
           SUM(number_of_shares) AS total_shares
         FROM contributions
         WHERE status = 'verified'
         GROUP BY user_id
       ) c ON c.user_id = u.user_id
       WHERE u.role = 'member'
       ORDER BY u.user_id DESC`
    );

    res.json(rows);
  })
);

app.patch(
  "/admin/members/:id/approve",
  authenticateToken,
  authorizeRole("admin"),
  asyncRoute(async (req, res) => {
    const id = validId(req.params.id);
    if (!id) return fail(res, 400, "Invalid member ID");

    const [result] = await db.query(
      `UPDATE users SET status = 'active'
       WHERE user_id = ?
       AND role = 'member'
       AND status = 'pending'`,
      [id]
    );

    if (!result.affectedRows) {
      return fail(res, 409, "Member not awaiting approval");
    }
    res.json({ message: "Member approved successfully" });
  })
);

app.patch(
  "/admin/members/:id/reject",
  authenticateToken,
  authorizeRole("admin"),
  asyncRoute(async (req, res) => {
    const id = validId(req.params.id);
    if (!id) return fail(res, 400, "Invalid member ID");

    const [result] = await db.query(
      `UPDATE users SET status = 'inactive'
       WHERE user_id = ?
       AND role = 'member'
       AND status = 'pending'`,
      [id]
    );

    if (!result.affectedRows) {
      return fail(res, 409, "Member not awaiting approval");
    }
    res.json({ message: "Member registration rejected" });
  })
);

// ====================================================
// SAVINGS CYCLES
// ====================================================

function validateCycleInput(body) {
  const year = Number(body.cycle_year);
  const start = body.start_date;
  const end = body.end_date;
  const priceCents = toCents(body.share_price);

  function validDate(value) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) &&
      d.toISOString().slice(0,10) === value;
  }

  if (
    !Number.isInteger(year) || year < 2000 || year > 2200 ||
    !validDate(start) || !validDate(end) ||
    start > end ||
    Number(start.slice(0,4)) !== year ||
    Number(end.slice(0,4)) !== year ||
    priceCents === null || priceCents <= 0
  ) {
    throw httpError(
      400, "Invalid year, dates, or share price"
    );
  }

  return { year, start, end, sharePrice: money(priceCents) };
}

async function cycleHasTransactions(conn, id) {
  const [[c]] = await conn.query(
    `SELECT COUNT(*) AS n FROM contributions WHERE cycle_id=?`, [id]
  );
  const [[a]] = await conn.query(
    `SELECT COUNT(*) AS n FROM loan_applications WHERE cycle_id=?`, [id]
  );
  const [[l]] = await conn.query(
    `SELECT COUNT(*) AS n FROM loans WHERE cycle_id=?`, [id]
  );
  return Number(c.n) + Number(a.n) + Number(l.n) > 0;
}

app.get("/savings-cycles", authenticateToken,
  asyncRoute(async (req, res) => {
    const [rows] = await db.query(
      `SELECT cycle_id,cycle_year,
         DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,
         DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date,
         share_price,status
       FROM savings_cycles
       WHERE status='active'
       ORDER BY cycle_year DESC`
    );
    res.json(rows);
  })
);

app.get("/admin/savings-cycles", authenticateToken,
  authorizeRole("admin"), asyncRoute(async (req, res) => {
    const [rows] = await db.query(
      `SELECT cycle_id,cycle_year,
         DATE_FORMAT(start_date,'%Y-%m-%d') AS start_date,
         DATE_FORMAT(end_date,'%Y-%m-%d') AS end_date,
         share_price,status
       FROM savings_cycles
       ORDER BY cycle_year DESC`
    );
    res.json(rows);
  })
);

app.post("/admin/savings-cycles", authenticateToken,
  authorizeRole("admin"), asyncRoute(async (req, res) => {
    const c = validateCycleInput(req.body || {});
    const [existing] = await db.query(
      "SELECT cycle_id FROM savings_cycles WHERE cycle_year=?",
      [c.year]
    );
    if (existing.length) {
      return fail(res, 409, "Savings cycle for this year already exists");
    }

    const [result] = await db.query(
      `INSERT INTO savings_cycles
       (cycle_year,start_date,end_date,share_price,status)
       VALUES (?,?,?,?,'planned')`,
      [c.year,c.start,c.end,c.sharePrice]
    );

    res.status(201).json({
      message: "Savings cycle created successfully",
      cycle_id: result.insertId
    });
  })
);

app.patch("/admin/savings-cycles/:id", authenticateToken,
  authorizeRole("admin"), asyncRoute(async (req, res) => {
    const id = validId(req.params.id);
    if (!id) return fail(res, 400, "Invalid cycle ID");
    const c = validateCycleInput(req.body || {});

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        "SELECT status FROM savings_cycles WHERE cycle_id=? FOR UPDATE",
        [id]
      );
      if (!rows.length || rows[0].status !== "planned" ||
          await cycleHasTransactions(conn,id)) {
        await conn.rollback();
        return fail(res,409,"Only unused planned cycles can be edited");
      }
      const [sameYear] = await conn.query(
        `SELECT cycle_id FROM savings_cycles
         WHERE cycle_year=? AND cycle_id<>?`,
        [c.year,id]
      );
      if (sameYear.length) {
        await conn.rollback();
        return fail(res,409,"Cycle year already exists");
      }
      await conn.query(
        `UPDATE savings_cycles
         SET cycle_year=?,start_date=?,end_date=?,share_price=?
         WHERE cycle_id=?`,
        [c.year,c.start,c.end,c.sharePrice,id]
      );
      await conn.commit();
      res.json({message:"Savings cycle updated"});
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

app.patch("/admin/savings-cycles/:id/activate", authenticateToken,
  authorizeRole("admin"), asyncRoute(async (req, res) => {
    const id = validId(req.params.id);
    if (!id) return fail(res,400,"Invalid cycle ID");
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        `SELECT cycle_id,status,
           (CURDATE() BETWEEN start_date AND end_date) AS current_date
         FROM savings_cycles ORDER BY cycle_id FOR UPDATE`
      );
      const selected = rows.find(c => Number(c.cycle_id) === id);
      if (!selected || selected.status !== "planned" ||
          !Number(selected.current_date)) {
        await conn.rollback();
        return fail(res,409,"Cycle must be planned and cover today's date");
      }
      if (rows.some(c => c.status === "active")) {
        await conn.rollback();
        return fail(res,409,"Close the other active cycle first");
      }
      await conn.query(
        "UPDATE savings_cycles SET status='active' WHERE cycle_id=?",
        [id]
      );
      await conn.commit();
      res.json({message:"Savings cycle activated"});
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

app.patch("/admin/savings-cycles/:id/close", authenticateToken,
  authorizeRole("admin"), asyncRoute(async (req, res) => {
    const id = validId(req.params.id);
    if (!id) return fail(res,400,"Invalid cycle ID");
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        `SELECT status,(CURDATE()>end_date) AS ended
         FROM savings_cycles WHERE cycle_id=? FOR UPDATE`,
        [id]
      );
      if (!rows.length || rows[0].status !== "active" ||
          !Number(rows[0].ended)) {
        await conn.rollback();
        return fail(res,409,"Only an ended active cycle can be closed");
      }
      const [[c]] = await conn.query(
        `SELECT COUNT(*) AS n FROM contributions
         WHERE cycle_id=? AND status='pending'`,[id]
      );
      const [[a]] = await conn.query(
        `SELECT COUNT(*) AS n FROM loan_applications
         WHERE cycle_id=? AND status IN ('pending','approved')`,
        [id]
      );
      if (Number(c.n)+Number(a.n)>0) {
        await conn.rollback();
        return fail(res,409,"Resolve pending transactions first");
      }
      await conn.query(
        "UPDATE savings_cycles SET status='closed' WHERE cycle_id=?",
        [id]
      );
      await conn.commit();
      res.json({message:"Savings cycle closed"});
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// ====================================================
// ADMIN CASH CONTRIBUTIONS — NEW FEATURE
// ====================================================

app.post(
  "/admin/cash-contributions",
  authenticateToken,
  authorizeRole("admin"),
  asyncRoute(async (req, res) => {
    const memberId = validId(req.body.user_id);
    const amountCents = toCents(req.body.amount);
    const reference = req.body.receipt_reference;

    if (!memberId || amountCents === null || amountCents <= 0 ||
        amountCents > 999999999999 ||
        typeof reference !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(reference)) {
      return fail(res,400,"Invalid member, cash amount or receipt reference");
    }

    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // Lock member so concurrent receipts for that member
      // cannot pass the duplicate-reference check together.
      const [users] = await conn.query(
        `SELECT user_id,status FROM users
         WHERE user_id=? AND role='member' FOR UPDATE`,
        [memberId]
      );

      if (!users.length || users[0].status !== "active") {
        await conn.rollback();
        return fail(res,409,"Member is not active");
      }

      const cycle = await getCurrentCycle(conn);
      const sharePriceCents = toCents(cycle.share_price);

      if (!sharePriceCents || amountCents % sharePriceCents !== 0) {
        await conn.rollback();
        return fail(
          res,400,
          `Cash amount must buy whole shares at ${money(sharePriceCents || 0)} per share`
        );
      }

      const shares = amountCents / sharePriceCents;

      if (!Number.isSafeInteger(shares) ||
          shares < 1 || shares > 1000000) {
        await conn.rollback();
        return fail(res,400,"Invalid number of shares");
      }

      const receipt = `CASH-${reference.toLowerCase()}`;
      const [duplicates] = await conn.query(
        `SELECT contribution_id FROM contributions
         WHERE user_id=? AND payment_reference=?`,
        [memberId,receipt]
      );

      if (duplicates.length) {
        await conn.rollback();
        return fail(res,409,"This cash receipt was already recorded");
      }

      // The contributions table's amount field is expected
      // to be generated/calculated from shares * share_price,
      // consistent with the existing INSERT /contributions route.
      const [result] = await conn.query(
        `INSERT INTO contributions
         (
           user_id,cycle_id,contribution_month,
           number_of_shares,share_price,payment_date,
           payment_reference,status,verified_by,verified_at
         )
         VALUES (
           ?,?,MONTH(CURDATE()),?,?,
           CURDATE(),?,'verified',?,NOW()
         )`,
        [
          memberId,
          cycle.cycle_id,
          shares,
          money(sharePriceCents),
          receipt,
          req.user.user_id
        ]
      );

      await conn.commit();

      res.status(201).json({
        message: "Cash contribution recorded and shares credited",
        contribution_id: result.insertId,
        amount: money(amountCents),
        number_of_shares: shares,
        share_price: money(sharePriceCents),
        receipt_reference: receipt
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// ====================================================
// MEMBER CONTRIBUTIONS — OPTIONAL
// ====================================================

app.post("/contributions", authenticateToken,
  authorizeRole("member"), asyncRoute(async (req, res) => {
    const shares = validId(req.body.number_of_shares);
    const reference = req.body.payment_reference ?? null;

    if (!shares || shares > 1000000 ||
        (reference !== null &&
          (typeof reference !== "string" || reference.length > 100))) {
      return fail(res,400,"Invalid shares or payment reference");
    }

    let cycleId = validId(req.body.cycle_id);
    if (!cycleId) {
      cycleId = (await getCurrentCycle()).cycle_id;
    }

    const [result] = await db.query(
      `INSERT INTO contributions
       (
         user_id,cycle_id,contribution_month,
         number_of_shares,share_price,payment_date,
         payment_reference,status
       )
       SELECT ?,cycle_id,MONTH(CURDATE()),?,
         share_price,CURDATE(),?,'pending'
       FROM savings_cycles
       WHERE cycle_id=? AND status='active'
         AND CURDATE() BETWEEN start_date AND end_date`,
      [req.user.user_id,shares,reference,cycleId]
    );

    if (!result.affectedRows) {
      return fail(res,400,"Savings cycle is not active");
    }

    res.status(201).json({
      message:"Contribution submitted for verification",
      contribution_id:result.insertId,
      status:"pending"
    });
  })
);

app.get("/my-contributions", authenticateToken,
  authorizeRole("member"), asyncRoute(async (req,res) => {
    const [rows] = await db.query(
      `SELECT c.*,s.cycle_year
       FROM contributions c
       JOIN savings_cycles s ON s.cycle_id=c.cycle_id
       WHERE c.user_id=? ORDER BY c.created_at DESC`,
      [req.user.user_id]
    );
    res.json(rows);
  })
);

app.get("/admin/contributions", authenticateToken,
  authorizeRole("admin"), asyncRoute(async (req,res) => {
    const [rows] = await db.query(
      `SELECT c.*,u.full_name,s.cycle_year,
              admin.full_name AS verified_by_name
       FROM contributions c
       JOIN users u ON u.user_id=c.user_id
       JOIN savings_cycles s ON s.cycle_id=c.cycle_id
       LEFT JOIN users admin ON admin.user_id=c.verified_by
       ORDER BY c.created_at DESC,c.contribution_id DESC`
    );
    res.json(rows);
  })
);

app.patch("/admin/contributions/:id/verify", authenticateToken,
  authorizeRole("admin"), asyncRoute(async (req,res) => {
    const id=validId(req.params.id);
    if (!id) return fail(res,400,"Invalid contribution ID");
    const [result]=await db.query(
      `UPDATE contributions SET status='verified',
         verified_by=?,verified_at=NOW()
       WHERE contribution_id=? AND status='pending'`,
      [req.user.user_id,id]
    );
    if (!result.affectedRows) {
      return fail(res,409,"Contribution already reviewed");
    }
    res.json({message:"Contribution verified"});
  })
);

app.patch("/admin/contributions/:id/reject", authenticateToken,
  authorizeRole("admin"), asyncRoute(async (req,res) => {
    const id=validId(req.params.id);
    if (!id) return fail(res,400,"Invalid contribution ID");
    const [result]=await db.query(
      `UPDATE contributions SET status='rejected',
         verified_by=?,verified_at=NOW()
       WHERE contribution_id=? AND status='pending'`,
      [req.user.user_id,id]
    );
    if (!result.affectedRows) {
      return fail(res,409,"Contribution already reviewed");
    }
    res.json({message:"Contribution rejected"});
  })
);

// ====================================================
// MEMBER AND ADMIN LOAN APPLICATIONS
// ====================================================

function validateLoanBody(body) {
  const amount=toCents(body.amount);
  const reason=body.reason;
  if (amount === null || amount <= 0 ||
      amount > 999999999999 ||
      typeof reason !== "string" ||
      !reason.trim() || reason.trim().length > 500) {
    throw httpError(400,"Valid amount and reason required");
  }
  return {amount:money(amount),reason:reason.trim()};
}

app.post("/loan-applications",authenticateToken,
  authorizeRole("member"),asyncRoute(async(req,res)=>{
    const loan=validateLoanBody(req.body);
    const cycle=await getCurrentCycle();
    const [result]=await db.query(
      `INSERT INTO loan_applications
       (user_id,cycle_id,requested_amount,reason)
       VALUES (?,?,?,?)`,
      [req.user.user_id,cycle.cycle_id,loan.amount,loan.reason]
    );
    res.status(201).json({
      message:"Loan application submitted",
      application_id:result.insertId,status:"pending"
    });
  })
);

app.get("/my-loan-applications",authenticateToken,
  authorizeRole("member"),asyncRoute(async(req,res)=>{
    const [rows]=await db.query(
      `SELECT * FROM loan_applications
       WHERE user_id=? ORDER BY applied_at DESC`,
      [req.user.user_id]
    );
    res.json(rows);
  })
);

app.post("/admin/loan-applications",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const memberId=validId(req.body.user_id);
    if (!memberId) return fail(res,400,"Invalid member ID");
    const loan=validateLoanBody(req.body);
    const cycle=await getCurrentCycle();

    const [result]=await db.query(
      `INSERT INTO loan_applications
       (user_id,cycle_id,requested_amount,reason)
       SELECT user_id,?,?,? FROM users
       WHERE user_id=? AND role='member' AND status='active'`,
      [cycle.cycle_id,loan.amount,loan.reason,memberId]
    );
    if (!result.affectedRows) {
      return fail(res,400,"Selected member is not active");
    }
    res.status(201).json({
      message:"Loan application created successfully",
      application_id:result.insertId,
      cycle_year:cycle.cycle_year,status:"pending"
    });
  })
);

app.get("/loan-applications",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const [rows]=await db.query(
      `SELECT la.*,u.full_name
       FROM loan_applications la
       JOIN users u ON u.user_id=la.user_id
       ORDER BY la.applied_at DESC`
    );
    res.json(rows);
  })
);

app.patch("/loan-applications/:id/approve",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const id=validId(req.params.id);
    if (!id) return fail(res,400,"Invalid application ID");
    const [result]=await db.query(
      `UPDATE loan_applications
       SET status='approved',reviewed_by=?,reviewed_at=NOW()
       WHERE application_id=? AND status='pending'`,
      [req.user.user_id,id]
    );
    if (!result.affectedRows) {
      return fail(res,409,"Application already reviewed");
    }
    res.json({message:"Application approved. Disbursement required."});
  })
);

app.patch("/loan-applications/:id/reject",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const id=validId(req.params.id);
    const reason=req.body.reason;
    if (!id || typeof reason!=="string" ||
        !reason.trim() || reason.trim().length>500) {
      return fail(res,400,"Valid rejection reason required");
    }
    const [result]=await db.query(
      `UPDATE loan_applications
       SET status='rejected',reviewed_by=?,
           reviewed_at=NOW(),rejection_reason=?
       WHERE application_id=? AND status='pending'`,
      [req.user.user_id,reason.trim(),id]
    );
    if (!result.affectedRows) {
      return fail(res,409,"Application already reviewed");
    }
    res.json({message:"Application rejected"});
  })
);

// ====================================================
// CASH LOAN DISBURSEMENT
// ====================================================

app.post("/admin/loan-applications/:id/disburse",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const id=validId(req.params.id);
    if (!id) return fail(res,400,"Invalid application ID");

    const conn=await db.getConnection();
    try {
      await conn.beginTransaction();
      const [applications]=await conn.query(
        `SELECT * FROM loan_applications
         WHERE application_id=? FOR UPDATE`,[id]
      );
      if (!applications.length ||
          applications[0].status!=="approved") {
        await conn.rollback();
        return fail(res,409,"Application is not approved");
      }

      const application=applications[0];
      const [member]=await conn.query(
        `SELECT status FROM users
         WHERE user_id=? FOR UPDATE`,[application.user_id]
      );
      if (!member.length || member[0].status!=="active") {
        await conn.rollback();
        return fail(res,409,"Member not active");
      }
      const [existing]=await conn.query(
        "SELECT loan_id FROM loans WHERE application_id=?",[id]
      );
      if (existing.length) {
        await conn.rollback();
        return fail(res,409,"Loan already issued");
      }
      const [result]=await conn.query(
        `INSERT INTO loans
         (application_id,user_id,cycle_id,principal,
          issued_date,due_date,status)
         VALUES (?,?,?,?,CURDATE(),
           DATE_ADD(CURDATE(),INTERVAL 3 MONTH),'active')`,
        [id,application.user_id,application.cycle_id,
         application.requested_amount]
      );
      await conn.commit();
      res.status(201).json({
        message:"Cash loan disbursement recorded",
        loan_id:result.insertId
      });
    } catch(err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// ====================================================
// LOAN LEDGER
// ====================================================

const loanBalanceSQL=`
  SELECT l.loan_id,l.application_id,l.user_id,l.cycle_id,
    l.principal,l.issued_date,l.due_date,l.status,
    COALESCE(r.principal_paid,0) AS principal_paid,
    COALESCE(r.interest_paid,0) AS interest_paid,
    COALESCE(i.interest_charged,0) AS interest_charged
  FROM loans l
  LEFT JOIN (
    SELECT loan_id,SUM(principal_paid) AS principal_paid,
      SUM(interest_paid) AS interest_paid
    FROM repayments WHERE status='verified'
    GROUP BY loan_id
  ) r ON r.loan_id=l.loan_id
  LEFT JOIN (
    SELECT loan_id,SUM(charge_amount) AS interest_charged
    FROM interest_charges GROUP BY loan_id
  ) i ON i.loan_id=l.loan_id
`;

function formatLoanBalance(l) {
  const principal=toCents(l.principal) ?? 0;
  const principalPaid=toCents(l.principal_paid) ?? 0;
  const interestPaid=toCents(l.interest_paid) ?? 0;
  const interestCharged=toCents(l.interest_charged) ?? 0;
  const left=Math.max(0,principal-principalPaid);
  const interestLeft=Math.max(0,interestCharged-interestPaid);
  return {
    ...l,
    outstanding_principal:money(left),
    outstanding_interest:money(interestLeft),
    total_owed:money(left+interestLeft),
    total_paid:money(principalPaid+interestPaid)
  };
}

app.get("/loans",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const [rows]=await db.query(
      `SELECT l.*,u.full_name FROM loans l
       JOIN users u ON u.user_id=l.user_id
       ORDER BY l.loan_id DESC`
    );
    res.json(rows);
  })
);

app.get("/admin/loan-ledger",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const [rows]=await db.query(
      `SELECT q.*,u.full_name,u.email
       FROM (${loanBalanceSQL}) q
       JOIN users u ON u.user_id=q.user_id
       ORDER BY q.loan_id DESC`
    );
    res.json(rows.map(formatLoanBalance));
  })
);

app.get("/my-loans",authenticateToken,
  authorizeRole("member"),asyncRoute(async(req,res)=>{
    const [rows]=await db.query(
      `SELECT * FROM (${loanBalanceSQL}) q
       WHERE q.user_id=? ORDER BY q.loan_id DESC`,
      [req.user.user_id]
    );
    res.json(rows.map(formatLoanBalance));
  })
);

app.get("/admin/repayments",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const [rows]=await db.query(
      `SELECT r.repayment_id,r.loan_id,l.user_id,u.full_name,
        r.principal_paid,r.interest_paid,r.payment_date,
        r.payment_reference,r.status,r.recorded_by,
        admin.full_name AS recorded_by_name
       FROM repayments r
       JOIN loans l ON l.loan_id=r.loan_id
       JOIN users u ON u.user_id=l.user_id
       LEFT JOIN users admin ON admin.user_id=r.recorded_by
       ORDER BY r.repayment_id DESC`
    );
    res.json(rows);
  })
);

// ====================================================
// OVERDUE INTEREST AND REPAYMENTS
// ====================================================

async function getLoanBalance(conn,id) {
  const [loans]=await conn.query(
    `SELECT loan_id,principal,due_date,status
     FROM loans WHERE loan_id=? FOR UPDATE`,[id]
  );
  if (!loans.length) return null;

  const [[r]]=await conn.query(
    `SELECT COALESCE(SUM(principal_paid),0) AS principal_paid,
      COALESCE(SUM(interest_paid),0) AS interest_paid
     FROM repayments WHERE loan_id=? AND status='verified'`,[id]
  );
  const [[i]]=await conn.query(
    `SELECT COUNT(*) AS charge_count,
       COALESCE(SUM(charge_amount),0) AS total_charges
     FROM interest_charges WHERE loan_id=?`,[id]
  );

  return {
    loan:loans[0],
    principalOutstanding:Math.max(
      0,(toCents(loans[0].principal) ?? 0)-
      (toCents(r.principal_paid) ?? 0)
    ),
    interestOutstanding:Math.max(
      0,(toCents(i.total_charges) ?? 0)-
      (toCents(r.interest_paid) ?? 0)
    ),
    hasInterestCharge:Number(i.charge_count)>0
  };
}

async function assessLateInterest(conn,id) {
  const balance=await getLoanBalance(conn,id);
  if (!balance) return null;

  if (["paid","cancelled"].includes(balance.loan.status)) {
    return balance;
  }

  const [[check]]=await conn.query(
    "SELECT CURDATE()>? AS overdue",[balance.loan.due_date]
  );
  if (!Number(check.overdue)) return balance;

  if (balance.principalOutstanding>0 && !balance.hasInterestCharge) {
    const charge=Math.round(balance.principalOutstanding*0.20);
    if (charge>0) {
      await conn.query(
        `INSERT INTO interest_charges
         (loan_id,outstanding_principal_at_charge,
          interest_rate,charge_amount,charged_on,charge_reason)
         VALUES (?,?,0.2000,?,CURDATE(),
           'One-time 20% overdue interest')`,
        [id,money(balance.principalOutstanding),money(charge)]
      );
    }
  }

  if (balance.loan.status!=="overdue") {
    await conn.query(
      "UPDATE loans SET status='overdue' WHERE loan_id=?",[id]
    );
  }
  return getLoanBalance(conn,id);
}

app.post("/admin/loans/:id/check-overdue",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const id=validId(req.params.id);
    if (!id) return fail(res,400,"Invalid loan ID");
    const conn=await db.getConnection();
    try {
      await conn.beginTransaction();
      const b=await assessLateInterest(conn,id);
      if (!b) {
        await conn.rollback();
        return fail(res,404,"Loan not found");
      }
      await conn.commit();
      res.json({
        message:"Loan checked successfully",
        principal_outstanding:money(b.principalOutstanding),
        interest_outstanding:money(b.interestOutstanding),
        total_owed:money(
          b.principalOutstanding+b.interestOutstanding
        )
      });
    } catch(err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

app.post("/admin/repayments",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const id=validId(req.body.loan_id);
    const principal=toCents(req.body.principal_paid ?? "0");
    const interest=toCents(req.body.interest_paid ?? "0");

    if (!id || principal===null || interest===null ||
        principal+interest<=0) {
      return fail(res,400,"Invalid repayment");
    }

    const conn=await db.getConnection();
    try {
      await conn.beginTransaction();
      const b=await assessLateInterest(conn,id);
      if (!b || !["active","overdue"].includes(b.loan.status)) {
        await conn.rollback();
        return fail(res,409,"Loan cannot accept repayments");
      }
      if (principal>b.principalOutstanding ||
          interest>b.interestOutstanding) {
        await conn.rollback();
        return fail(res,400,"Payment exceeds amount owed");
      }

      const [result]=await conn.query(
        `INSERT INTO repayments
         (loan_id,principal_paid,interest_paid,payment_date,
          status,recorded_by,verified_by,verified_at)
         VALUES (?,?,?,CURDATE(),'verified',?,?,NOW())`,
        [id,money(principal),money(interest),
         req.user.user_id,req.user.user_id]
      );

      const remainingPrincipal=b.principalOutstanding-principal;
      const remainingInterest=b.interestOutstanding-interest;

      if (remainingPrincipal===0 && remainingInterest===0) {
        await conn.query(
          "UPDATE loans SET status='paid' WHERE loan_id=?",[id]
        );
      }
      await conn.commit();
      res.status(201).json({
        message:"Cash repayment recorded",
        repayment_id:result.insertId,
        remaining_principal:money(remainingPrincipal),
        remaining_interest:money(remainingInterest),
        remaining_total:money(
          remainingPrincipal+remainingInterest
        )
      });
    } catch(err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// ====================================================
// DASHBOARD
// ====================================================

app.get("/dashboard",authenticateToken,
  authorizeRole("admin"),asyncRoute(async(req,res)=>{
    const [[members]]=await db.query(
      `SELECT COUNT(*) AS totalMembers,
        SUM(status='active') AS activeMembers,
        SUM(status='pending') AS pendingMembers
       FROM users WHERE role='member'`
    );
    const [[loans]]=await db.query(
      `SELECT COUNT(*) AS activeLoans FROM loans
       WHERE status IN ('active','overdue')`
    );
    const [[contributions]]=await db.query(
      `SELECT
        COALESCE(SUM(number_of_shares*share_price),0)
          AS totalContributions,
        COALESCE(SUM(number_of_shares),0) AS totalShares
       FROM contributions WHERE status='verified'`
    );
    const [[repayments]]=await db.query(
      `SELECT
        COALESCE(SUM(principal_paid),0) AS principalRepaid,
        COALESCE(SUM(interest_paid),0) AS interestEarned
       FROM repayments WHERE status='verified'`
    );
    const [[issued]]=await db.query(
      `SELECT COALESCE(SUM(principal),0) AS totalIssued
       FROM loans WHERE status<>'cancelled'`
    );
    const [[expenses]]=await db.query(
      `SELECT COALESCE(SUM(amount),0) AS totalExpenses
       FROM fund_expenses WHERE status='verified'`
    );
    const [[payouts]]=await db.query(
      `SELECT COALESCE(SUM(amount_paid),0) AS totalPayouts
       FROM distribution_payments`
    );

    const availableCents=
      (toCents(contributions.totalContributions) ?? 0)+
      (toCents(repayments.principalRepaid) ?? 0)+
      (toCents(repayments.interestEarned) ?? 0)-
      (toCents(issued.totalIssued) ?? 0)-
      (toCents(expenses.totalExpenses) ?? 0)-
      (toCents(payouts.totalPayouts) ?? 0);

    res.json({
      totalMembers:Number(members.totalMembers || 0),
      activeMembers:Number(members.activeMembers || 0),
      pendingMembers:Number(members.pendingMembers || 0),
      activeLoans:Number(loans.activeLoans || 0),
      totalShares:Number(contributions.totalShares || 0),
      totalContributions:contributions.totalContributions,
      interestEarned:repayments.interestEarned,
      principalRepaid:repayments.principalRepaid,
      totalIssued:issued.totalIssued,
      totalExpenses:expenses.totalExpenses,
      availableFunds:money(availableCents)
    });
  })
);

// ====================================================
// PROFILE & SETTINGS
// ====================================================

app.get("/profile",authenticateToken,
  asyncRoute(async(req,res)=>{
    const [rows]=await db.query(
      `SELECT user_id,full_name,email,phone,
        role,status,created_at
       FROM users WHERE user_id=? LIMIT 1`,
      [req.user.user_id]
    );
    if (!rows.length) return fail(res,404,"Profile not found");
    res.json(rows[0]);
  })
);

app.patch("/profile",authenticateToken,
  asyncRoute(async(req,res)=>{
    const {full_name,phone}=req.body;
    if (typeof full_name!=="string" || !full_name.trim() ||
        full_name.trim().length>100 ||
        (phone!=null &&
         (typeof phone!=="string" || phone.length>30))) {
      return fail(res,400,"Invalid profile details");
    }
    await db.query(
      "UPDATE users SET full_name=?,phone=? WHERE user_id=?",
      [full_name.trim(),phone?.trim() || null,req.user.user_id]
    );
    res.json({message:"Profile updated successfully"});
  })
);

app.patch("/settings/password",authenticateToken,
  asyncRoute(async(req,res)=>{
    const {currentPassword,newPassword}=req.body;
    if (typeof currentPassword!=="string" ||
        typeof newPassword!=="string" ||
        newPassword.length<12 || newPassword.length>128) {
      return fail(res,400,"Invalid password details");
    }

    const [rows]=await db.query(
      "SELECT password_hash FROM users WHERE user_id=?",
      [req.user.user_id]
    );
    if (!rows.length) return fail(res,404,"Account not found");
    if (!(await bcrypt.compare(
      currentPassword,rows[0].password_hash
    ))) {
      return fail(res,400,"Current password incorrect");
    }
    if (currentPassword===newPassword) {
      return fail(res,400,"New password must be different");
    }

    const hash=await bcrypt.hash(newPassword,12);
    await db.query(
      "UPDATE users SET password_hash=? WHERE user_id=?",
      [hash,req.user.user_id]
    );
    res.json({message:"Password changed successfully"});
  })
);

// ====================================================
// LAST: UNKNOWN ROUTES AND ERRORS
// ====================================================

app.use((req,res)=>{
  res.status(404).json({
    message:`Route not found: ${req.method} ${req.path}`
  });
});

app.use((err,req,res,next)=>{
  console.error("Server error:",err);
  if (err.code==="ER_DUP_ENTRY") {
    return fail(res,409,"Duplicate record already exists");
  }
  if (err.status) {
    return fail(res,err.status,err.message);
  }
  res.status(500).json({
    message:"Server error. Check backend terminal."
  });
});

// ====================================================
// START
// ====================================================

async function startServer() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing from .env");
  }
  await db.query("SELECT 1");
  console.log("Connected to ROSCA MariaDB database");
  app.listen(PORT,()=>{
    console.log(`UBC ROSCA server running on port ${PORT}`);
  });
}

startServer().catch(err=>{
  console.error("Startup failed:",err.message);
  process.exit(1);
});

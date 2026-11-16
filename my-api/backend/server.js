import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import DB from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json());

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "clinic_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "1111",
});

let usePostgres = false;

pool.connect((err, client, release) => {
  if (err) {
    console.log("PostgreSQL не подключен (проверьте пароль в .env или pgAdmin). Используем локальную базу salon.db");
    usePostgres = false;
  } else {
    console.log("Подключение к PostgreSQL успешно установлено!");
    usePostgres = true;
    release();
  }
});

async function queryDB(sql, params = []) {
  if (usePostgres) {
    let pgSql = sql;
    let i = 1;
    while (pgSql.includes("?")) {
      pgSql = pgSql.replace("?", `$${i++}`);
    }
    const res = await pool.query(pgSql, params);
    return res.rows;
  } else {
    const stmt = DB.prepare(sql);
    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      return stmt.all(...params);
    } else {
      const info = stmt.run(...params);
      return [{ lastInsertRowid: info.lastInsertRowid }];
    }
  }
}


app.get("/api/test", (req, res) => {
  res.json({ message: "API работает!", timestamp: new Date() });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const time = new Date().toISOString();
    res.json({ message: "Подключение к БД работает!", current_time: time });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/appointments/simple", async (req, res) => {
  try {
    const rows = await queryDB("SELECT * FROM appointments LIMIT 5");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/categories", async (req, res) => {
  try {
    const rows = await queryDB("SELECT * FROM categories ORDER BY category_id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories", async (req, res) => {
  const { name } = req.body;
  const trimmed = name?.trim();
  if (!trimmed) {
    return res.status(400).json({ error: "Введите название категории" });
  }
  try {
    const existing = await queryDB("SELECT * FROM categories WHERE LOWER(name) = LOWER(?)", [trimmed]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Категория с таким названием уже существует" });
    }
    await queryDB("INSERT INTO categories (name) VALUES (?)", [trimmed]);
    const all = await queryDB("SELECT * FROM categories ORDER BY category_id DESC");
    res.json(all[0]);
  } catch (err) {
    if (err.message && (err.message.includes("уникальности") || err.message.includes("unique") || err.code === "23505")) {
      return res.status(400).json({ error: "Категория с таким названием уже существует" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/services", async (req, res) => {
  try {
    const rows = await queryDB(`
      SELECT s.*, c.name AS category_name 
      FROM services s 
      LEFT JOIN categories c ON c.category_id = s.category_id 
      ORDER BY s.service_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/services/:id/discount", async (req, res) => {
  const percent = Number(req.body.percent);
  const id = Number(req.params.id);
  if (isNaN(percent) || percent < 0 || percent > 90) {
    return res.status(400).json({ error: "Скидка должна быть от 0 до 90%" });
  }
  try {
    await queryDB("UPDATE services SET discount_percent = ? WHERE service_id = ?", [percent, id]);
    const updated = await queryDB("SELECT * FROM services WHERE service_id = ?", [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Заполните email и пароль" });
  }
  try {
    const users = await queryDB(`
      SELECT u.*, r.name AS role, c.code AS coupon_code, c.percent AS coupon_percent
      FROM users u
      LEFT JOIN roles r ON r.role_id = u.role_id
      LEFT JOIN coupons c ON c.coupon_id = u.coupon_id
      WHERE LOWER(u.email) = LOWER(?) AND u.password = ?
    `, [email.trim(), password.trim()]);

    if (!users.length) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }
    res.json({ token: "token_" + users[0].user_id, user: users[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const rows = await queryDB(`
      SELECT u.user_id, u.name, u.email, r.name AS role, c.code AS coupon_code, c.percent AS coupon_percent, u.coupon_id
      FROM users u
      LEFT JOIN roles r ON r.role_id = u.role_id
      LEFT JOIN coupons c ON c.coupon_id = u.coupon_id
      ORDER BY u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/coupon", async (req, res) => {
  const userId = Number(req.params.id);
  const couponId = req.body.coupon_id ? Number(req.body.coupon_id) : null;
  try {
    await queryDB("UPDATE users SET coupon_id = ? WHERE user_id = ?", [couponId, userId]);
    const updated = await queryDB("SELECT * FROM users WHERE user_id = ?", [userId]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/coupons", async (req, res) => {
  try {
    const rows = await queryDB("SELECT * FROM coupons ORDER BY coupon_id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/appointments", async (req, res) => {
  try {
    const rows = await queryDB(`
      SELECT a.*, s.name AS service_name, s.price, p.amount AS paid_amount, p.status AS payment_status
      FROM appointments a
      LEFT JOIN services s ON s.service_id = a.service_id
      LEFT JOIN payments p ON p.appointment_id = a.appointment_id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/appointments", async (req, res) => {
  const { items, appointment_date, appointment_time, notes, user_id, coupon_percent } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: "Корзина пуста" });
  }

  const date = appointment_date || new Date().toISOString().split("T")[0];
  const time = appointment_time || "12:00:00";
  const userId = user_id || 2;
  const cPercent = Number(coupon_percent) || 0;

  try {
    let total = 0;
    const itemNames = [];

    for (const item of items) {
      const svcId = item.service_id || item.id;
      const svcs = await queryDB("SELECT * FROM services WHERE service_id = ?", [svcId]);
      if (!svcs.length) continue;

      const svc = svcs[0];
      const withSvcDisc = svc.price * (1 - (svc.discount_percent || 0) / 100);
      const finalPrice = Math.round(withSvcDisc * (1 - cPercent / 100));
      const qty = item.qty || 1;
      total += finalPrice * qty;

      itemNames.push(qty > 1 ? `${svc.name} (${qty} шт.)` : svc.name);
    }

    const firstSvcId = items[0].service_id || items[0].id || 1;
    const servicesSummary = itemNames.join(", ");
    const appointmentNotes = notes ? `${servicesSummary} — ${notes}` : servicesSummary;

    await queryDB(
      "INSERT INTO appointments (user_id, service_id, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, 'scheduled', ?)",
      [userId, firstSvcId, date, time, appointmentNotes]
    );

    const lastAppt = await queryDB("SELECT appointment_id FROM appointments ORDER BY appointment_id DESC LIMIT 1");
    const apptId = lastAppt[0].appointment_id;

    await queryDB(
      "INSERT INTO payments (appointment_id, amount, method, status) VALUES (?, ?, 'card', 'paid')",
      [apptId, total]
    );

    res.json({ message: "Запись успешно создана!", total, appointment_id: apptId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

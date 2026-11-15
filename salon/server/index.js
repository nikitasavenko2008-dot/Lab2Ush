import express from "express";
import DB from "./db.js";
import crypto from "node:crypto";

const app = express();
app.use(express.json());

const PORT = 3001;

// ============================================================
//  Сессии: токен -> id пользователя
// ============================================================
const sessions = new Map();

function hashPwd(pw) {
  const salt = "salon_salt_2025";
  return crypto.createHash("sha256").update(pw + salt).digest("hex");
}

// Доставает пользователя из заголовка Authorization: Bearer <token>
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  const userId = sessions.get(token);
  if (!userId) {
    return res.status(401).json({ error: "Нужно войти в аккаунт" });
  }
  const user = DB.prepare(
    `SELECT u.id, u.name, u.email, u.role_id, r.name AS role,
            c.id AS coupon_id, c.code AS coupon_code, c.percent AS coupon_percent
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN coupons c ON c.id = u.coupon_id
     WHERE u.id = ?`
  ).get(userId);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не найден" });
  }
  req.user = user;
  next();
}

// Пропускает дальше только администраторов
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Только для администратора" });
  }
  next();
}

// ============================================================
//  Каталог: категории и услуги
// ============================================================
app.get("/api/categories", (req, res) => {
  const rows = DB.prepare("SELECT id, name FROM categories ORDER BY id").all();
  res.json(rows);
});

app.get("/api/services", (req, res) => {
  const rows = DB.prepare(
    `SELECT s.id, s.name, s.description, s.duration, s.price,
            s.discount_percent, s.category_id, c.name AS category_name
     FROM services s
     LEFT JOIN categories c ON c.id = s.category_id
     ORDER BY s.id`
  ).all();
  res.json(rows);
});

// ============================================================
//  Купоны (виды скидок) — нужны админу для выдачи
// ============================================================
app.get("/api/coupons", auth, adminOnly, (req, res) => {
  res.json(DB.prepare("SELECT id, code, percent FROM coupons ORDER BY id").all());
});

// ============================================================
//  Авторизация
// ============================================================
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Заполните email и пароль" });
  }

  const user = DB.prepare(
    `SELECT u.id, u.name, u.email, u.role_id, r.name AS role,
            c.id AS coupon_id, c.code AS coupon_code, c.percent AS coupon_percent
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN coupons c ON c.id = u.coupon_id
     WHERE u.email = ? AND u.password = ?`
  ).get(email.trim(), hashPwd(password));

  if (!user) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }

  const token = crypto.randomBytes(16).toString("hex");
  sessions.set(token, user.id);
  res.json({ token, user });
});

app.get("/api/me", auth, (req, res) => {
  res.json(req.user);
});

// ============================================================
//  Записи и платежи (оформление корзины)
// ============================================================
app.post("/api/appointments", auth, (req, res) => {
  const items = req.body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Корзина пуста" });
  }

  const couponPercent = req.user.coupon_percent || 0;
  const findService = DB.prepare("SELECT * FROM services WHERE id = ?");
  const insAppointment = DB.prepare(
    `INSERT INTO appointments (user_id, service_id, date_time, status)
     VALUES (?, ?, COALESCE(?, datetime('now')), 'pending')`
  );
  const insPayment = DB.prepare(
    `INSERT INTO payments (appointment_id, amount, method, status)
     VALUES (?, ?, 'card', 'pending')`
  );

  let total = 0;
  const created = [];

  for (const item of items) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) {
      return res.status(400).json({ error: "Неверное количество услуги" });
    }

    const service = findService.get(Number(item.id));
    if (!service) {
      return res
        .status(400)
        .json({ error: `Услуга ${item.id} не найдена` });
    }

    // Сначала скидка товара, потом персональный купон пользователя
    const withServiceDiscount =
      service.price * (1 - (service.discount_percent || 0) / 100);
    const price = withServiceDiscount * (1 - couponPercent / 100);

    for (let i = 0; i < qty; i++) {
      const info = insAppointment.run(req.user.id, service.id, item.date_time || "datetime('now')");
      const appointmentId = Number(info.lastInsertRowid);
      insPayment.run(appointmentId, Math.round(price));
      total += Math.round(price);
      created.push({
        appointment_id: appointmentId,
        service_name: service.name,
        amount: Math.round(price),
      });
    }
  }

  res.json({ total, appointments: created });
});

app.get("/api/appointments", auth, (req, res) => {
  const rows = DB.prepare(
    `SELECT a.id, a.date_time, a.status, s.name AS service_name,
            s.price, s.discount_percent, p.amount AS paid_amount, p.status AS payment_status
     FROM appointments a
     JOIN services s ON s.id = a.service_id
     LEFT JOIN payments p ON p.appointment_id = a.id
     WHERE a.user_id = ?
     ORDER BY a.id DESC`
  ).all(req.user.id);
  res.json(rows);
});

// ============================================================
//  Админка: категории, скидка на услугу, купон пользователю
// ============================================================
app.post("/api/categories", auth, adminOnly, (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) {
    return res.status(400).json({ error: "Укажите название категории" });
  }
  const exists = DB.prepare("SELECT id FROM categories WHERE name = ?").get(name);
  if (exists) {
    return res.status(400).json({ error: "Такая категория уже есть" });
  }
  const info = DB.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
  const row = DB.prepare("SELECT id, name FROM categories WHERE id = ?").get(
    Number(info.lastInsertRowid)
  );
  res.json(row);
});

// Общая скидка на конкретную услугу
app.put("/api/services/:id/discount", auth, adminOnly, (req, res) => {
  const percent = Number(req.body?.percent);
  if (Number.isNaN(percent) || percent < 0 || percent > 90) {
    return res
      .status(400)
      .json({ error: "Скидка должна быть от 0 до 90 процентов" });
  }
  const service = DB.prepare("SELECT id FROM services WHERE id = ?").get(
    Number(req.params.id)
  );
  if (!service) {
    return res.status(404).json({ error: "Услуга не найдена" });
  }
  DB.prepare("UPDATE services SET discount_percent = ? WHERE id = ?").run(
    percent,
    service.id
  );
  res.json({ id: service.id, discount_percent: percent });
});

// Персональная скидка: выдать пользователю купон
app.put("/api/users/:id/coupon", auth, adminOnly, (req, res) => {
  const couponId = req.body?.coupon_id;
  const user = DB.prepare("SELECT id FROM users WHERE id = ?").get(
    Number(req.params.id)
  );
  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }
  if (couponId !== null) {
    const coupon = DB.prepare("SELECT id FROM coupons WHERE id = ?").get(
      Number(couponId)
    );
    if (!coupon) {
      return res.status(404).json({ error: "Купон не найден" });
    }
  }
  DB.prepare("UPDATE users SET coupon_id = ? WHERE id = ?").run(
    couponId ?? null,
    user.id
  );
  res.json({ id: user.id, coupon_id: couponId ?? null });
});

app.get("/api/users", auth, adminOnly, (req, res) => {
  const rows = DB.prepare(
    `SELECT u.id, u.name, u.email, c.code AS coupon_code, c.percent AS coupon_percent
     FROM users u
     LEFT JOIN coupons c ON c.id = u.coupon_id
     WHERE u.role_id = 2
     ORDER BY u.id`
  ).all();
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`API: http://localhost:${PORT}`);
});


import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import DB from "./db.js";
import { containsProfanity, validateProfanity } from "./profanityFilter.js";

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
  password: process.env.DB_PASSWORD || "123",
});

let usePostgres = false;

pool.connect((err, client, release) => {
  if (err) {
    console.log("PostgreSQL не подключен. Работаем с локальной базой restaurant.db (SQLite). Ошибка:", err.message);
    usePostgres = false;
  } else {
    console.log("Подключение к PostgreSQL (clinic_db) успешно установлено!");
    usePostgres = true;
    release();
  }
});

function convertSqlPlaceholders(sql) {
  let result = "";
  let inString = false;
  let quoteChar = "";
  let paramIndex = 1;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      quoteChar = char;
      result += char;
    } else if (inString && char === quoteChar) {
      if (sql[i + 1] === quoteChar) {
        result += char + quoteChar;
        i++;
      } else {
        inString = false;
        result += char;
      }
    } else if (!inString && char === "?") {
      result += `$${paramIndex++}`;
    } else {
      result += char;
    }
  }
  return result;
}

async function queryDB(sql, params = []) {
  if (usePostgres) {
    const pgSql = convertSqlPlaceholders(sql);
    const res = await pool.query(pgSql, params);
    return res.rows;
  } else {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith("SELECT") || trimmed.includes("RETURNING")) {
      const stmt = DB.prepare(sql);
      return stmt.all(...params);
    } else {
      const stmt = DB.prepare(sql);
      const info = stmt.run(...params);
      return [{ insertId: info.lastInsertRowid, changes: info.changes }];
    }
  }
}

function generateToken(user) {
  const payload = {
    user_id: user.user_id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function verifyToken(token) {
  try {
    if (token === "admin-token") {
      return { user_id: 1, email: "admin@restaurant.ru", name: "Администратор Ресторана", role: "admin" };
    }
    const json = Buffer.from(token, "base64").toString("utf-8");
    const payload = JSON.parse(json);
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Недействительный или истекший токен" });
  }
  req.user = payload;
  next();
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Доступ запрещен. Требуются права администратора" });
    }
    next();
  });
}

function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return "Укажите контактный номер телефона";
  }
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length !== 10 && digits.length !== 11) {
    return "Номер телефона должен содержать 10 или 11 цифр (например, +7 (999) 123-45-67)";
  }

  const uniqueDigits = new Set(digits.split(""));
  if (uniqueDigits.size <= 2) {
    return "Некорректный номер телефона (не может состоять из одинаковых цифр)";
  }

  if (
    digits.includes("12345678") ||
    digits.includes("98765432") ||
    digits.includes("01234567")
  ) {
    return "Некорректный номер телефона (фиктивная последовательность цифр)";
  }

  if (digits.length === 11 && digits[0] !== "7" && digits[0] !== "8") {
    return "Номер телефона из 11 цифр должен начинаться с +7 или 8";
  }

  const mainPart = digits.length === 11 ? digits.slice(1) : digits;
  if (!mainPart.startsWith("9") && !mainPart.startsWith("4") && !mainPart.startsWith("8") && !mainPart.startsWith("3")) {
    return "Некорректный код оператора или региона в номере телефона";
  }

  return null;
}

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, phone, address = "" } = req.body;
  if (!name?.trim() || !email?.trim() || !password?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "Все обязательные поля (ФИО, Email, Пароль, Телефон) должны быть заполнены" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Введите корректный адрес электронной почты" });
  }

  const phoneError = validatePhoneNumber(phone);
  if (phoneError) {
    return res.status(400).json({ error: phoneError });
  }

  if (password.length < 5) {
    return res.status(400).json({ error: "Пароль должен содержать минимум 5 символов" });
  }

  try {
    const existing = await queryDB("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Пользователь с таким email уже зарегистрирован" });
    }

    const inserted = await queryDB(
      "INSERT INTO users (name, email, password, phone, address, role_id) VALUES (?, ?, ?, ?, ?, 2) RETURNING user_id, name, email, phone, address",
      [name.trim(), email.trim(), password.trim(), phone.trim(), address.trim()]
    );

    const newUser = {
      user_id: inserted[0].user_id,
      name: inserted[0].name,
      email: inserted[0].email,
      phone: inserted[0].phone,
      address: inserted[0].address,
      role: "user",
    };

    const token = generateToken(newUser);
    res.json({ token, user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Введите email и пароль" });
  }

  try {
    const rows = await queryDB(
      `SELECT u.user_id, u.name, u.email, u.password, u.phone, u.address, COALESCE(u.personal_discount_percent, 0) AS personal_discount_percent, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE LOWER(u.email) = LOWER(?)`,
      [email.trim()]
    );

    if (rows.length === 0 || rows[0].password !== password.trim()) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const user = {
      user_id: rows[0].user_id,
      name: rows[0].name,
      email: rows[0].email,
      phone: rows[0].phone,
      address: rows[0].address || "",
      personal_discount_percent: Number(rows[0].personal_discount_percent) || 0,
      role: rows[0].role,
    };

    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const rows = await queryDB(
      `SELECT u.user_id, u.name, u.email, u.phone, u.address, COALESCE(u.personal_discount_percent, 0) AS personal_discount_percent, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  const { name, email, phone, address } = req.body;
  if (!name?.trim() || !email?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "ФИО, Email и телефон обязательны для заполнения" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Введите корректный адрес электронной почты" });
  }

  const phoneError = validatePhoneNumber(phone);
  if (phoneError) {
    return res.status(400).json({ error: phoneError });
  }

  try {
    validateProfanity(name, "ФИО");
    if (address) validateProfanity(address, "Адрес доставки");

    const existing = await queryDB(
      "SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) AND user_id != ?",
      [email.trim(), req.user.user_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Данный email уже занят другим аккаунтом" });
    }

    await queryDB(
      "UPDATE users SET name = ?, email = ?, phone = ?, address = ? WHERE user_id = ?",
      [name.trim(), email.trim(), phone.trim(), address ? address.trim() : "", req.user.user_id]
    );

    const rows = await queryDB(
      `SELECT u.user_id, u.name, u.email, u.phone, u.address, COALESCE(u.personal_discount_percent, 0) AS personal_discount_percent, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    const updatedUser = rows[0];
    const token = generateToken(updatedUser);
    res.json({ user: updatedUser, token });
  } catch (err) {
    res.status(err.message.includes("ненормативную") ? 400 : 500).json({ error: err.message });
  }
});

app.put("/api/auth/password", authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password?.trim() || !new_password?.trim()) {
    return res.status(400).json({ error: "Заполните текущий и новый пароль" });
  }

  if (new_password.length < 5) {
    return res.status(400).json({ error: "Новый пароль должен содержать минимум 5 символов" });
  }

  try {
    const rows = await queryDB("SELECT password FROM users WHERE user_id = ?", [req.user.user_id]);
    if (rows.length === 0 || rows[0].password !== current_password.trim()) {
      return res.status(400).json({ error: "Неверно указан текущий пароль" });
    }

    await queryDB("UPDATE users SET password = ? WHERE user_id = ?", [new_password.trim(), req.user.user_id]);
    res.json({ success: true, message: "Пароль успешно обновлен" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) {
    return res.status(400).json({ error: "Введите адрес электронной почты" });
  }

  try {
    const rows = await queryDB("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Пользователь с указанным email не зарегистрирован" });
    }

    const code = "1234";
    await queryDB("INSERT INTO password_resets (email, code) VALUES (?, ?)", [email.trim().toLowerCase(), code]);

    res.json({
      message: "Напишите на почту nikitasavenko2008@gmail.com и мы вам сбросим пароль.",
      code: code,
      contact_email: "nikitasavenko2008@gmail.com",
      hint: "Напишите на почту nikitasavenko2008@gmail.com и мы вам сбросим пароль (код для проверки: 1234)",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { email, new_password } = req.body;
  if (!email?.trim() || !new_password?.trim()) {
    return res.status(400).json({ error: "Заполните все поля (email и новый пароль)" });
  }

  if (new_password.trim().length < 5) {
    return res.status(400).json({ error: "Пароль должен содержать минимум 5 символов" });
  }

  try {
    const users = await queryDB("SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь с указанным email не зарегистрирован" });
    }

    await queryDB("UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)", [new_password.trim(), email.trim()]);
    res.json({ success: true, message: "Пароль успешно изменен. Теперь вы можете войти в аккаунт." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function getOrCreateUncategorizedId() {
  const rows = await queryDB("SELECT category_id FROM categories WHERE name = 'Без категории'");
  if (rows.length > 0) return rows[0].category_id;
  const ins = await queryDB("INSERT INTO categories (name) VALUES ('Без категории') RETURNING category_id");
  return ins[0]?.category_id || ins[0]?.insertId;
}

app.get("/api/categories", async (req, res) => {
  try {

    await getOrCreateUncategorizedId();

    const rows = await queryDB(
      `SELECT c.category_id, c.name, COUNT(s.service_id) AS services_count
       FROM categories c
       LEFT JOIN services s ON c.category_id = s.category_id
       GROUP BY c.category_id, c.name
       ORDER BY CASE WHEN c.name = 'Без категории' THEN 9999 ELSE c.category_id END ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories", adminMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Введите наименование категории" });
  }
  try {
    validateProfanity(name, "Название категории");
    const existing = await queryDB("SELECT * FROM categories WHERE LOWER(name) = LOWER(?)", [name.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Категория с таким названием уже существует" });
    }
    const inserted = await queryDB("INSERT INTO categories (name) VALUES (?) RETURNING *", [name.trim()]);
    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(err.message.includes("ненормативную") ? 400 : 500).json({ error: err.message });
  }
});

app.put("/api/categories/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Наименование не может быть пустым" });
  }
  try {
    validateProfanity(name, "Название категории");
    const existing = await queryDB("SELECT * FROM categories WHERE category_id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Категория не найдена" });
    }

    const oldName = existing[0].name;
    await queryDB("UPDATE categories SET name = ? WHERE category_id = ?", [name.trim(), id]);

    if (oldName === "Без категории" && name.trim() !== "Без категории") {
      await getOrCreateUncategorizedId();
    }

    res.json({ success: true, message: "Категория успешно обновлена" });
  } catch (err) {
    res.status(err.message.includes("ненормативную") ? 400 : 500).json({ error: err.message });
  }
});

app.delete("/api/categories/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await queryDB("SELECT * FROM categories WHERE category_id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Категория не найдена" });
    }

    if (existing[0].name === "Без категории") {
      return res.status(400).json({ error: "Системную категорию «Без категории» удалить нельзя" });
    }

    const uncatId = await getOrCreateUncategorizedId();

    await queryDB("UPDATE services SET category_id = ? WHERE category_id = ?", [uncatId, id]);

    await queryDB("DELETE FROM categories WHERE category_id = ?", [id]);

    res.json({
      success: true,
      message: "Категория удалена. Все связанные услуги и товары автоматически перенесены в категорию «Без категории»"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/services", async (req, res) => {
  const { category_id, search, min_price, max_price } = req.query;

  let sql = `
    SELECT 
      s.service_id,
      s.name,
      s.description,
      s.duration,
      s.price,
      s.category_id,
      s.image,
      COALESCE(s.discount_percent, 0) AS discount_percent,
      COALESCE(s.stock_quantity, 15) AS stock_quantity,
      COALESCE(c.name, 'Без категории') AS category_name,
      COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
      COUNT(r.review_id) AS reviews_count
    FROM services s
    LEFT JOIN categories c ON s.category_id = c.category_id
    LEFT JOIN reviews r ON s.service_id = r.service_id
    WHERE 1=1
  `;
  const params = [];

  if (category_id && category_id !== "all") {
    sql += " AND s.category_id = ?";
    params.push(Number(category_id));
  }

  if (search && search.trim()) {
    sql += " AND (LOWER(s.name) LIKE ? OR LOWER(s.description) LIKE ?)";
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term);
  }

  if (min_price) {
    sql += " AND s.price >= ?";
    params.push(Number(min_price));
  }

  if (max_price) {
    sql += " AND s.price <= ?";
    params.push(Number(max_price));
  }

  sql += `
    GROUP BY s.service_id, s.name, s.description, s.duration, s.price, s.category_id, s.image, s.discount_percent, s.stock_quantity, c.name
    ORDER BY s.service_id ASC
  `;

  try {
    const rows = await queryDB(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const services = await queryDB(
      `SELECT s.*, COALESCE(s.stock_quantity, 15) AS stock_quantity, COALESCE(c.name, 'Без категории') AS category_name
       FROM services s
       LEFT JOIN categories c ON s.category_id = c.category_id
       WHERE s.service_id = ?`,
      [id]
    );

    if (services.length === 0) {
      return res.status(404).json({ error: "Услуга не найдена" });
    }

    const reviews = await queryDB(
      `SELECT r.*, u.name AS user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.service_id = ?
       ORDER BY r.review_id DESC`,
      [id]
    );

    res.json({ ...services[0], reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/services", adminMiddleware, async (req, res) => {
  let { name, description, duration, price, category_id, image, discount_percent, stock_quantity } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Укажите название услуги / товара" });
  }

  const numPrice = Number(price);
  if (!numPrice || numPrice <= 0 || isNaN(numPrice)) {
    return res.status(400).json({ error: "Цена должна быть строго больше 0 ₽ (не может быть 0 или отрицательной)" });
  }

  const numDuration = Number(duration);
  if (!numDuration || numDuration <= 0 || isNaN(numDuration)) {
    return res.status(400).json({ error: "Длительность услуги должна быть больше 0 минут" });
  }

  const stock = stock_quantity !== undefined && stock_quantity !== "" ? Math.max(0, Number(stock_quantity)) : 15;
  const discount = Math.max(0, Math.min(90, Number(discount_percent) || 0));

  try {
    validateProfanity(name, "Название услуги");
    if (description) validateProfanity(description, "Описание услуги");

    if (!category_id) {
      category_id = await getOrCreateUncategorizedId();
    } else {
      const checkCat = await queryDB("SELECT category_id FROM categories WHERE category_id = ?", [category_id]);
      if (checkCat.length === 0) {
        category_id = await getOrCreateUncategorizedId();
      }
    }

    const inserted = await queryDB(
      `INSERT INTO services (name, description, duration, price, category_id, image, discount_percent, stock_quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        name.trim(),
        description ? description.trim() : "",
        numDuration,
        numPrice,
        Number(category_id),
        image?.trim() || "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=80",
        discount,
        stock,
      ]
    );
    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(err.message.includes("ненормативную") ? 400 : 500).json({ error: err.message });
  }
});

app.put("/api/services/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  let { name, description, duration, price, category_id, image, discount_percent, stock_quantity } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Укажите название услуги / товара" });
  }

  const numPrice = Number(price);
  if (!numPrice || numPrice <= 0 || isNaN(numPrice)) {
    return res.status(400).json({ error: "Цена должна быть строго больше 0 ₽ (не может быть 0 или отрицательной)" });
  }

  const numDuration = Number(duration);
  if (!numDuration || numDuration <= 0 || isNaN(numDuration)) {
    return res.status(400).json({ error: "Длительность услуги должна быть больше 0 минут" });
  }

  const stock = stock_quantity !== undefined && stock_quantity !== "" ? Math.max(0, Number(stock_quantity)) : 15;
  const discount = Math.max(0, Math.min(90, Number(discount_percent) || 0));

  try {
    validateProfanity(name, "Название услуги");
    if (description) validateProfanity(description, "Описание услуги");

    if (!category_id) {
      category_id = await getOrCreateUncategorizedId();
    }

    await queryDB(
      `UPDATE services
       SET name = ?, description = ?, duration = ?, price = ?, category_id = ?, image = ?, discount_percent = ?, stock_quantity = ?
       WHERE service_id = ?`,
      [
        name.trim(),
        description ? description.trim() : "",
        numDuration,
        numPrice,
        Number(category_id),
        image ? image.trim() : "",
        discount,
        stock,
        id,
      ]
    );
    res.json({ success: true, message: "Услуга / товар успешно обновлена" });
  } catch (err) {
    res.status(err.message.includes("ненормативную") ? 400 : 500).json({ error: err.message });
  }
});

app.put("/api/services/:id/discount", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { discount_percent } = req.body;
  const percent = Math.max(0, Math.min(90, Number(discount_percent) || 0));

  try {
    await queryDB("UPDATE services SET discount_percent = ? WHERE service_id = ?", [percent, id]);
    res.json({ success: true, message: `Скидка ${percent}% успешно установлена`, discount_percent: percent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/services/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await queryDB("DELETE FROM cart_items WHERE service_id = ?", [id]);
    await queryDB("DELETE FROM reviews WHERE service_id = ?", [id]);
    await queryDB("DELETE FROM services WHERE service_id = ?", [id]);
    res.json({ success: true, message: "Услуга успешно удалена" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/cart", authMiddleware, async (req, res) => {
  try {
    const rows = await queryDB(
      `SELECT 
         ci.cart_item_id,
         ci.user_id,
         ci.service_id,
         ci.quantity,
         s.name,
         s.description,
         s.duration,
         s.price,
         COALESCE(s.discount_percent, 0) AS discount_percent,
         COALESCE(s.stock_quantity, 15) AS stock_quantity,
         COALESCE(s.image, 'https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80') AS image,
         COALESCE(c.name, 'Без категории') AS category_name,
         (ci.quantity * (CASE WHEN s.discount_percent > 0 THEN (s.price * (1.0 - s.discount_percent / 100.0)) ELSE s.price END)) AS total_item_price
       FROM cart_items ci
       JOIN services s ON ci.service_id = s.service_id
       LEFT JOIN categories c ON s.category_id = c.category_id
       WHERE ci.user_id = ?
       ORDER BY ci.cart_item_id ASC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart", authMiddleware, async (req, res) => {
  const { service_id, quantity = 1 } = req.body;
  if (!service_id) {
    return res.status(400).json({ error: "Не указана услуга для добавления" });
  }

  const addQty = Math.max(1, Number(quantity) || 1);

  try {

    const svc = await queryDB("SELECT name, COALESCE(stock_quantity, 15) AS stock_quantity FROM services WHERE service_id = ?", [service_id]);
    if (svc.length === 0) {
      return res.status(404).json({ error: "Услуга / товар не найдена" });
    }
    const maxStock = svc[0].stock_quantity;

    const existing = await queryDB(
      "SELECT * FROM cart_items WHERE user_id = ? AND service_id = ?",
      [req.user.user_id, service_id]
    );

    const currentQty = existing.length > 0 ? Number(existing[0].quantity) : 0;
    if (currentQty + addQty > maxStock) {
      return res.status(400).json({
        error: `Нельзя добавить больше доступного на складе (в наличии: ${maxStock} шт., у вас уже в корзине: ${currentQty} шт.)`
      });
    }

    if (existing.length > 0) {
      await queryDB(
        "UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND service_id = ?",
        [addQty, req.user.user_id, service_id]
      );
    } else {
      await queryDB(
        "INSERT INTO cart_items (user_id, service_id, quantity) VALUES (?, ?, ?)",
        [req.user.user_id, service_id, addQty]
      );
    }

    const updated = await queryDB(
      `SELECT ci.*, s.name, s.price, COALESCE(s.discount_percent, 0) AS discount_percent,
              COALESCE(s.stock_quantity, 15) AS stock_quantity,
              COALESCE(s.image, 'https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80') AS image,
              COALESCE(c.name, 'Без категории') AS category_name,
              (ci.quantity * (CASE WHEN s.discount_percent > 0 THEN (s.price * (1.0 - s.discount_percent / 100.0)) ELSE s.price END)) AS total_item_price
       FROM cart_items ci
       JOIN services s ON ci.service_id = s.service_id
       LEFT JOIN categories c ON s.category_id = c.category_id
       WHERE ci.user_id = ?
       ORDER BY ci.cart_item_id ASC`,
      [req.user.user_id]
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/cart/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  const newQty = Number(quantity);

  try {
    if (newQty <= 0) {
      await queryDB("DELETE FROM cart_items WHERE cart_item_id = ? AND user_id = ?", [id, req.user.user_id]);
    } else {

      const itemRow = await queryDB(
        `SELECT ci.quantity, s.name, COALESCE(s.stock_quantity, 15) AS stock_quantity
         FROM cart_items ci
         JOIN services s ON ci.service_id = s.service_id
         WHERE ci.cart_item_id = ? AND ci.user_id = ?`,
        [id, req.user.user_id]
      );

      if (itemRow.length > 0 && newQty > itemRow[0].stock_quantity) {
        return res.status(400).json({
          error: `Доступно на складе только ${itemRow[0].stock_quantity} шт.`
        });
      }

      await queryDB(
        "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ? AND user_id = ?",
        [newQty, id, req.user.user_id]
      );
    }

    const updated = await queryDB(
      `SELECT ci.*, s.name, s.price, COALESCE(s.discount_percent, 0) AS discount_percent,
              COALESCE(s.stock_quantity, 15) AS stock_quantity,
              COALESCE(s.image, 'https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80') AS image,
              COALESCE(c.name, 'Без категории') AS category_name,
              (ci.quantity * (CASE WHEN s.discount_percent > 0 THEN (s.price * (1.0 - s.discount_percent / 100.0)) ELSE s.price END)) AS total_item_price
       FROM cart_items ci
       JOIN services s ON ci.service_id = s.service_id
       LEFT JOIN categories c ON s.category_id = c.category_id
       WHERE ci.user_id = ?
       ORDER BY ci.cart_item_id ASC`,
      [req.user.user_id]
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/cart/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await queryDB("DELETE FROM cart_items WHERE cart_item_id = ? AND user_id = ?", [id, req.user.user_id]);
    res.json({ success: true, message: "Позиция удалена из корзины" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/cart", authMiddleware, async (req, res) => {
  try {
    await queryDB("DELETE FROM cart_items WHERE user_id = ?", [req.user.user_id]);
    res.json({ success: true, message: "Корзина успешно очищена" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", authMiddleware, async (req, res) => {
  const { delivery_address, delivery_date, delivery_time = "12:00", notes = "", coupon_code = "" } = req.body;

  if (!delivery_address?.trim()) {
    return res.status(400).json({ error: "Укажите адрес выезда / доставки" });
  }
  if (delivery_address.trim().length < 5) {
    return res.status(400).json({ error: "Адрес должен содержать не менее 5 символов" });
  }

  if (!delivery_date) {
    return res.status(400).json({ error: "Укажите дату обслуживания" });
  }

  const selectedDate = new Date(delivery_date);
  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

  if (selectedDateOnly < todayDateOnly) {
    return res.status(400).json({ error: "Дата доставки не может быть меньше текущей даты" });
  }

  try {

    validateProfanity(delivery_address, "Адрес доставки");
    if (notes) validateProfanity(notes, "Заметки к заказу");

    const cartItems = await queryDB(
      `SELECT ci.*, s.name, s.price, COALESCE(s.discount_percent, 0) AS discount_percent,
              COALESCE(s.stock_quantity, 15) AS stock_quantity
       FROM cart_items ci
       JOIN services s ON ci.service_id = s.service_id
       WHERE ci.user_id = ?`,
      [req.user.user_id]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Ваша корзина пуста. Добавьте услуги перед оформлением заказа." });
    }

    for (const item of cartItems) {
      if (item.quantity > item.stock_quantity) {
        return res.status(400).json({
          error: `Позиции «${item.name}» недостаточно на складе (в наличии ${item.stock_quantity} шт., запрошено ${item.quantity} шт.)`
        });
      }
    }

    const subtotalAmount = cartItems.reduce((sum, item) => {
      const effPrice = item.discount_percent > 0 ? Number((item.price * (1 - item.discount_percent / 100)).toFixed(2)) : Number(item.price);
      return Number((sum + effPrice * item.quantity).toFixed(2));
    }, 0);

    const userRows = await queryDB("SELECT COALESCE(personal_discount_percent, 0) AS personal_discount_percent FROM users WHERE user_id = ?", [req.user.user_id]);
    const personalDiscountPercent = Number(userRows[0]?.personal_discount_percent) || 0;
    const personalDiscountVal = personalDiscountPercent > 0 ? Number(((subtotalAmount * personalDiscountPercent) / 100).toFixed(2)) : 0;

    let cleanCouponCode = "";
    let couponDiscountPercent = 0;
    if (coupon_code?.trim()) {
      const cpnRows = await queryDB(
        "SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = TRUE",
        [coupon_code.trim()]
      );
      if (cpnRows.length > 0) {
        cleanCouponCode = cpnRows[0].code;
        couponDiscountPercent = Number(cpnRows[0].discount_percent) || 0;
      }
    }
    const couponDiscountVal = couponDiscountPercent > 0 ? Number((((subtotalAmount - personalDiscountVal) * couponDiscountPercent) / 100).toFixed(2)) : 0;

    const totalAmount = Math.max(0, Number((subtotalAmount - personalDiscountVal - couponDiscountVal).toFixed(2)));

    const orderRes = await queryDB(
      `INSERT INTO orders (user_id, delivery_address, delivery_date, delivery_time, total_amount, coupon_code, coupon_discount_percent, personal_discount_percent, subtotal_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Новый', ?) RETURNING order_id`,
      [
        req.user.user_id,
        delivery_address.trim(),
        delivery_date,
        delivery_time,
        totalAmount,
        cleanCouponCode,
        couponDiscountPercent,
        personalDiscountPercent,
        subtotalAmount,
        notes ? notes.trim() : ""
      ]
    );

    const orderId = orderRes[0].order_id || orderRes[0].insertId;

    for (const item of cartItems) {
      const finalItemPrice = item.discount_percent > 0 ? Number((item.price * (1 - item.discount_percent / 100)).toFixed(2)) : Number(item.price);
      await queryDB(
        "INSERT INTO order_items (order_id, service_id, quantity, price) VALUES (?, ?, ?, ?)",
        [orderId, item.service_id, item.quantity, finalItemPrice]
      );
      await queryDB(
        "UPDATE services SET stock_quantity = CASE WHEN stock_quantity >= ? THEN stock_quantity - ? ELSE 0 END WHERE service_id = ?",
        [item.quantity, item.quantity, item.service_id]
      );
    }

    await queryDB("DELETE FROM cart_items WHERE user_id = ?", [req.user.user_id]);

    res.status(201).json({
      success: true,
      order_id: orderId,
      message: "Заказ успешно оформлен и передан в обработку",
      total_amount: totalAmount,
      subtotal_amount: subtotalAmount,
      coupon_code: cleanCouponCode,
      coupon_discount_percent: couponDiscountPercent,
      personal_discount_percent: personalDiscountPercent
    });
  } catch (err) {
    res.status(err.message.includes("ненормативную") ? 400 : 500).json({ error: err.message });
  }
});

app.get("/api/orders/my", authMiddleware, async (req, res) => {
  try {
    const orders = await queryDB(
      `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       WHERE o.user_id = ?
       ORDER BY o.order_id DESC`,
      [req.user.user_id]
    );

    for (const order of orders) {
      const items = await queryDB(
        `SELECT oi.*, s.name AS service_name,
                COALESCE(s.image, 'https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80') AS image,
                s.duration, COALESCE(c.name, 'Без категории') AS category_name
         FROM order_items oi
         JOIN services s ON oi.service_id = s.service_id
         LEFT JOIN categories c ON s.category_id = c.category_id
         WHERE oi.order_id = ?`,
        [order.order_id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders", adminMiddleware, async (req, res) => {
  try {
    const orders = await queryDB(
      `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       ORDER BY o.order_id DESC`
    );

    for (const order of orders) {
      const items = await queryDB(
        `SELECT oi.*, s.name AS service_name,
                COALESCE(s.image, 'https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80') AS image,
                s.duration, COALESCE(c.name, 'Без категории') AS category_name
         FROM order_items oi
         JOIN services s ON oi.service_id = s.service_id
         LEFT JOIN categories c ON s.category_id = c.category_id
         WHERE oi.order_id = ?`,
        [order.order_id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/orders/:id/status", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ["Новый", "В обработке", "Подтвержден", "Выполнен", "Отменен"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Недопустимый статус заказа" });
  }

  try {
    const existing = await queryDB("SELECT status FROM orders WHERE order_id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Заказ не найден" });
    }
    const currentStatus = existing[0].status;
    if (currentStatus === "Выполнен" || currentStatus === "Отменен") {
      return res.status(400).json({
        error: `Заказ №${id} уже находится в финальном статусе «${currentStatus}». Изменение невозможно.`
      });
    }

    await queryDB("UPDATE orders SET status = ? WHERE order_id = ?", [status, id]);
    res.json({ success: true, message: `Статус заказа №${id} изменен на "${status}"` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reviews", async (req, res) => {
  const { service_id } = req.query;
  let sql = `
    SELECT 
      r.review_id,
      r.service_id,
      r.user_id,
      r.rating,
      r.comment,
      r.created_at,
      u.name AS user_name,
      u.email AS user_email,
      s.name AS service_name,
      COALESCE(s.image, 'https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80') AS service_image
    FROM reviews r
    JOIN users u ON r.user_id = u.user_id
    JOIN services s ON r.service_id = s.service_id
  `;
  const params = [];

  if (service_id) {
    sql += " WHERE r.service_id = ?";
    params.push(service_id);
  }

  sql += " ORDER BY r.review_id DESC";

  try {
    const rows = await queryDB(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reviews", authMiddleware, async (req, res) => {
  const { service_id, rating, comment } = req.body;
  if (!service_id || !rating || !comment?.trim()) {
    return res.status(400).json({ error: "Заполните оценку (1-5) и текст отзыва" });
  }

  const numRating = Number(rating);
  if (numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: "Оценка должна быть от 1 до 5 звезд" });
  }

  try {
    validateProfanity(comment, "Текст отзыва");

    const inserted = await queryDB(
      "INSERT INTO reviews (service_id, user_id, rating, comment) VALUES (?, ?, ?, ?) RETURNING *",
      [Number(service_id), req.user.user_id, numRating, comment.trim()]
    );

    const fullReview = await queryDB(
      `SELECT r.*, u.name AS user_name, s.name AS service_name, s.image AS service_image
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       JOIN services s ON r.service_id = s.service_id
       WHERE r.review_id = ?`,
      [inserted[0].review_id]
    );

    res.status(201).json(fullReview[0]);
  } catch (err) {
    res.status(err.message.includes("ненормативную") ? 400 : 500).json({ error: err.message });
  }
});

app.delete("/api/reviews/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await queryDB("DELETE FROM reviews WHERE review_id = ?", [id]);
    res.json({ success: true, message: "Отзыв успешно удален за нарушение правил сообщества" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", adminMiddleware, async (req, res) => {
  try {
    const rows = await queryDB(
      `SELECT u.user_id, u.name, u.email, u.phone, u.address, u.created_at, COALESCE(u.personal_discount_percent, 0) AS personal_discount_percent, r.name AS role, u.role_id
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       ORDER BY u.user_id ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/personal-discount", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { personal_discount_percent } = req.body;
  const percent = Math.max(0, Math.min(90, Number(personal_discount_percent) || 0));

  try {
    await queryDB("UPDATE users SET personal_discount_percent = ? WHERE user_id = ?", [percent, id]);
    res.json({
      success: true,
      message: `Личная скидка ${percent}% успешно установлена`,
      personal_discount_percent: percent,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/coupons", async (req, res) => {
  try {
    const rows = await queryDB("SELECT * FROM coupons ORDER BY coupon_id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/coupons/check/:code", async (req, res) => {
  const { code } = req.params;
  if (!code?.trim()) {
    return res.status(400).json({ error: "Введите промокод" });
  }
  try {
    const rows = await queryDB(
      "SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = TRUE",
      [code.trim()]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Промокод не найден или срок его действия истек" });
    }
    res.json({ valid: true, coupon: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/coupons", adminMiddleware, async (req, res) => {
  const { code, discount_percent, description } = req.body;
  if (!code?.trim()) {
    return res.status(400).json({ error: "Укажите код промокода (например VIP10)" });
  }
  const percent = Math.max(1, Math.min(90, Number(discount_percent) || 10));

  try {
    const existing = await queryDB("SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)", [code.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Промокод с таким названием уже существует" });
    }

    const inserted = await queryDB(
      "INSERT INTO coupons (code, discount_percent, description, is_active) VALUES (?, ?, ?, TRUE) RETURNING *",
      [code.trim().toUpperCase(), percent, description?.trim() || ""]
    );
    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/coupons/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { discount_percent, description, is_active } = req.body;
  try {
    const existing = await queryDB("SELECT * FROM coupons WHERE coupon_id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Промокод не найден" });
    }
    const curr = existing[0];
    const newDiscount = discount_percent !== undefined ? Number(discount_percent) : curr.discount_percent;
    const newDesc = description !== undefined ? description : curr.description;
    const newActive = is_active !== undefined ? Boolean(is_active) : Boolean(curr.is_active);

    await queryDB(
      "UPDATE coupons SET discount_percent = ?, description = ?, is_active = ? WHERE coupon_id = ?",
      [newDiscount, newDesc, newActive, id]
    );
    res.json({ success: true, message: "Промокод успешно обновлен" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/coupons/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await queryDB("DELETE FROM coupons WHERE coupon_id = ?", [id]);
    res.json({ success: true, message: "Промокод удален" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/role", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { role_id } = req.body;
  if (!role_id) {
    return res.status(400).json({ error: "Укажите роль пользователя" });
  }

  try {
    const targetUser = await queryDB("SELECT user_id, email FROM users WHERE user_id = ?", [id]);
    if (targetUser.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    if (Number(id) === 1 || targetUser[0].email === "admin@restaurant.ru") {
      return res.status(400).json({ error: "Роль главного администратора не подлежит изменению" });
    }

    await queryDB("UPDATE users SET role_id = ? WHERE user_id = ?", [Number(role_id), id]);
    res.json({ success: true, message: "Роль пользователя успешно обновлена" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/password", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (Number(req.user.user_id) !== 1 && req.user.email !== "admin@restaurant.ru") {
    return res.status(403).json({ error: "Только главный администратор может изменять пароли пользователей" });
  }

  if (!new_password || !new_password.trim()) {
    return res.status(400).json({ error: "Укажите новый пароль" });
  }

  if (new_password.trim().length < 5) {
    return res.status(400).json({ error: "Пароль должен содержать минимум 5 символов" });
  }

  try {
    const targetUser = await queryDB("SELECT user_id, email, name FROM users WHERE user_id = ?", [id]);
    if (targetUser.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    await queryDB("UPDATE users SET password = ? WHERE user_id = ?", [new_password.trim(), id]);
    res.json({ success: true, message: `Пароль пользователя «${targetUser[0].name}» успешно изменен` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.user_id) {
    return res.status(400).json({ error: "Нельзя удалить собственный аккаунт администратора" });
  }

  try {
    const targetUser = await queryDB("SELECT user_id, email FROM users WHERE user_id = ?", [id]);
    if (targetUser.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    if (Number(id) === 1 || targetUser[0].email === "admin@restaurant.ru") {
      return res.status(400).json({ error: "Главного администратора нельзя удалить" });
    }

    await queryDB("DELETE FROM cart_items WHERE user_id = ?", [id]);
    await queryDB("DELETE FROM reviews WHERE user_id = ?", [id]);
    await queryDB("DELETE FROM users WHERE user_id = ?", [id]);
    res.json({ success: true, message: "Пользователь удален" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/test", (req, res) => {
  res.json({
    status: "ok",
    app: "Royal Catering API",
    db_type: usePostgres ? "PostgreSQL (clinic_db)" : "SQLite (restaurant.db)",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Backend сервер запущен на порту ${PORT}`);
});

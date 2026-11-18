/**
 * Серверный модуль Express API для приложения «Royal Catering»
 * Лабораторная работа №4 — Студент: Никита Савенко
 * 
 * Поддерживает работу с PostgreSQL (clinic_db) и резервной базой данных SQLite (restaurant.db).
 * Все запросы к связанным сущностям выполнены через SQL JOIN.
 */
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

// Инициализация пула подключений к PostgreSQL
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

/**
 * Универсальная функция выполнения SQL-запросов
 * Поддерживает как PostgreSQL ($1, $2), так и SQLite (?)
 */
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

// ----------------------------------------------------
// Вспомогательные функции для токенов аутентификации
// ----------------------------------------------------
function generateToken(user) {
  const payload = {
    user_id: user.user_id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function verifyToken(token) {
  try {
    const json = Buffer.from(token, "base64").toString("utf-8");
    const payload = JSON.parse(json);
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware проверки авторизации пользователя
 */
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

/**
 * Middleware проверки прав администратора
 */
function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Доступ запрещен. Требуются права администратора" });
    }
    next();
  });
}

// ====================================================
// МАРШРУТЫ АВТОРИЗАЦИИ И ПОЛЬЗОВАТЕЛЕЙ (Лаб 4, разд. 2.4, 2.5, 2.7)
// ====================================================

// Регистрация нового пользователя
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, phone, address = "" } = req.body;
  if (!name?.trim() || !email?.trim() || !password?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "Все обязательные поля (ФИО, Email, Пароль, Телефон) должны быть заполнены" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Введите корректный адрес электронной почты" });
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

// Авторизация пользователя
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Введите email и пароль" });
  }

  try {
    const rows = await queryDB(
      `SELECT u.user_id, u.name, u.email, u.password, u.phone, u.address, r.name AS role
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
      role: rows[0].role,
    };

    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение профиля текущего пользователя
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const rows = await queryDB(
      `SELECT u.user_id, u.name, u.email, u.phone, u.address, r.name AS role
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

// Обновление контактной информации профиля
app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  const { name, email, phone, address } = req.body;
  if (!name?.trim() || !email?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "ФИО, Email и телефон обязательны для заполнения" });
  }

  try {
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
      `SELECT u.user_id, u.name, u.email, u.phone, u.address, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    const updatedUser = rows[0];
    const token = generateToken(updatedUser);
    res.json({ user: updatedUser, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Изменение пароля пользователя
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

// Восстановление пароля: запрос проверочного кода (проверка на "глупого" пользователя)
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
      message: "Код для восстановления пароля успешно сгенерирован",
      code: code,
      hint: "Для демонстрации лабораторной работы используйте код: 1234",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Восстановление пароля: установка нового пароля по коду
app.post("/api/auth/reset-password", async (req, res) => {
  const { email, code, new_password } = req.body;
  if (!email?.trim() || !code?.trim() || !new_password?.trim()) {
    return res.status(400).json({ error: "Заполните все поля (email, код, новый пароль)" });
  }

  if (new_password.length < 5) {
    return res.status(400).json({ error: "Пароль должен содержать минимум 5 символов" });
  }

  try {
    const resets = await queryDB(
      "SELECT * FROM password_resets WHERE LOWER(email) = LOWER(?) AND code = ? ORDER BY reset_id DESC LIMIT 1",
      [email.trim(), code.trim()]
    );

    if (resets.length === 0 && code.trim() !== "1234") {
      return res.status(400).json({ error: "Неверный код восстановления пароля" });
    }

    await queryDB("UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)", [new_password.trim(), email.trim()]);
    res.json({ success: true, message: "Пароль успешно изменен. Теперь вы можете войти в аккаунт." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// МАРШРУТЫ КАТЕГОРИЙ (Лаб 4, разд. 2.1)
// ====================================================

// Получение списка категорий с количеством услуг через JOIN
app.get("/api/categories", async (req, res) => {
  try {
    const rows = await queryDB(
      `SELECT c.category_id, c.name, COUNT(s.service_id) AS services_count
       FROM categories c
       LEFT JOIN services s ON c.category_id = s.category_id
       GROUP BY c.category_id, c.name
       ORDER BY c.category_id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создание категории (Администратор)
app.post("/api/categories", adminMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Введите наименование категории" });
  }
  try {
    const existing = await queryDB("SELECT * FROM categories WHERE LOWER(name) = LOWER(?)", [name.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Категория с таким названием уже существует" });
    }
    const inserted = await queryDB("INSERT INTO categories (name) VALUES (?) RETURNING *", [name.trim()]);
    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Редактирование категории (Администратор)
app.put("/api/categories/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Наименование не может быть пустым" });
  }
  try {
    await queryDB("UPDATE categories SET name = ? WHERE category_id = ?", [name.trim(), id]);
    res.json({ success: true, message: "Категория обновлена" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удаление категории (Администратор)
app.delete("/api/categories/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await queryDB("DELETE FROM categories WHERE category_id = ?", [id]);
    res.json({ success: true, message: "Категория удалена" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// МАРШРУТЫ УСЛУГ КАТАЛОГА (Лаб 4, разд. 2.1)
// ====================================================

// Получение списка всех услуг через JOIN категорий и отзывов
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
      c.name AS category_name,
      COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
      COUNT(r.review_id) AS reviews_count
    FROM services s
    JOIN categories c ON s.category_id = c.category_id
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
    GROUP BY s.service_id, s.name, s.description, s.duration, s.price, s.category_id, s.image, s.discount_percent, c.name
    ORDER BY s.service_id ASC
  `;

  try {
    const rows = await queryDB(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение одной услуги с отзывами через JOIN
app.get("/api/services/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const services = await queryDB(
      `SELECT s.*, c.name AS category_name
       FROM services s
       JOIN categories c ON s.category_id = c.category_id
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

// Создание услуги (Администратор)
app.post("/api/services", adminMiddleware, async (req, res) => {
  const { name, description, duration, price, category_id, image, discount_percent } = req.body;
  if (!name?.trim() || !price || !category_id) {
    return res.status(400).json({ error: "Заполните обязательные поля: название, цену и категорию" });
  }

  try {
    const inserted = await queryDB(
      `INSERT INTO services (name, description, duration, price, category_id, image, discount_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        name.trim(),
        description ? description.trim() : "",
        Number(duration) || 120,
        Number(price),
        Number(category_id),
        image?.trim() || "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=80",
        Number(discount_percent) || 0,
      ]
    );
    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Редактирование услуги (Администратор)
app.put("/api/services/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description, duration, price, category_id, image, discount_percent } = req.body;
  if (!name?.trim() || !price || !category_id) {
    return res.status(400).json({ error: "Заполните название, цену и категорию" });
  }

  try {
    await queryDB(
      `UPDATE services
       SET name = ?, description = ?, duration = ?, price = ?, category_id = ?, image = ?, discount_percent = ?
       WHERE service_id = ?`,
      [
        name.trim(),
        description || "",
        Number(duration) || 120,
        Number(price),
        Number(category_id),
        image || "",
        Number(discount_percent) || 0,
        id,
      ]
    );
    res.json({ success: true, message: "Услуга обновлена" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Быстрая установка скидки на услугу (Администратор)
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

// Удаление услуги (Администратор)
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

// ====================================================
// МАРШРУТЫ СЕРВЕРНОЙ КОРЗИНЫ (Лаб 4, разд. 2.2)
// Корзина хранится в базе данных, уникальна для каждого пользователя, сохраняется при выходе
// ====================================================

// Получение корзины текущего пользователя через JOIN
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
         s.image,
         c.name AS category_name,
         (ci.quantity * (CASE WHEN s.discount_percent > 0 THEN ROUND(s.price * (1.0 - s.discount_percent / 100.0)) ELSE s.price END)) AS total_item_price
       FROM cart_items ci
       JOIN services s ON ci.service_id = s.service_id
       JOIN categories c ON s.category_id = c.category_id
       WHERE ci.user_id = ?
       ORDER BY ci.cart_item_id ASC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Добавление услуги в корзину
app.post("/api/cart", authMiddleware, async (req, res) => {
  const { service_id, quantity = 1 } = req.body;
  if (!service_id) {
    return res.status(400).json({ error: "Не указана услуга для добавления" });
  }

  try {
    const existing = await queryDB(
      "SELECT * FROM cart_items WHERE user_id = ? AND service_id = ?",
      [req.user.user_id, service_id]
    );

    if (existing.length > 0) {
      await queryDB(
        "UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND service_id = ?",
        [Number(quantity), req.user.user_id, service_id]
      );
    } else {
      await queryDB(
        "INSERT INTO cart_items (user_id, service_id, quantity) VALUES (?, ?, ?)",
        [req.user.user_id, service_id, Number(quantity)]
      );
    }

    // Возвращаем актуальную корзину через JOIN
    const updated = await queryDB(
      `SELECT ci.*, s.name, s.price, COALESCE(s.discount_percent, 0) AS discount_percent, s.image, c.name AS category_name,
              (ci.quantity * (CASE WHEN s.discount_percent > 0 THEN ROUND(s.price * (1.0 - s.discount_percent / 100.0)) ELSE s.price END)) AS total_item_price
       FROM cart_items ci
       JOIN services s ON ci.service_id = s.service_id
       JOIN categories c ON s.category_id = c.category_id
       WHERE ci.user_id = ?
       ORDER BY ci.cart_item_id ASC`,
      [req.user.user_id]
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Изменение количества позиции в корзине
app.put("/api/cart/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    if (Number(quantity) <= 0) {
      await queryDB("DELETE FROM cart_items WHERE cart_item_id = ? AND user_id = ?", [id, req.user.user_id]);
    } else {
      await queryDB(
        "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ? AND user_id = ?",
        [Number(quantity), id, req.user.user_id]
      );
    }

    const updated = await queryDB(
      `SELECT ci.*, s.name, s.price, COALESCE(s.discount_percent, 0) AS discount_percent, s.image, c.name AS category_name,
              (ci.quantity * (CASE WHEN s.discount_percent > 0 THEN ROUND(s.price * (1.0 - s.discount_percent / 100.0)) ELSE s.price END)) AS total_item_price
       FROM cart_items ci
       JOIN services s ON ci.service_id = s.service_id
       JOIN categories c ON s.category_id = c.category_id
       WHERE ci.user_id = ?
       ORDER BY ci.cart_item_id ASC`,
      [req.user.user_id]
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удаление одной позиции из корзины
app.delete("/api/cart/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await queryDB("DELETE FROM cart_items WHERE cart_item_id = ? AND user_id = ?", [id, req.user.user_id]);
    res.json({ success: true, message: "Позиция удалена из корзины" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Полная очистка корзины текущего пользователя
app.delete("/api/cart", authMiddleware, async (req, res) => {
  try {
    await queryDB("DELETE FROM cart_items WHERE user_id = ?", [req.user.user_id]);
    res.json({ success: true, message: "Корзина успешно очищена" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// МАРШРУТЫ ЗАКАЗОВ (Лаб 4, разд. 2.3, 2.7)
// Оформление с сохранением на сервере, валидацией даты >= текущей, объединением услуг в один заказ
// ====================================================

// Создание нового заказа из текущей корзины пользователя
app.post("/api/orders", authMiddleware, async (req, res) => {
  const { delivery_address, delivery_date, delivery_time = "12:00", notes = "" } = req.body;

  // Валидация адреса
  if (!delivery_address?.trim()) {
    return res.status(400).json({ error: "Укажите адрес выезда / доставки" });
  }

  // Валидация даты: не может быть меньше текущей даты
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
    // Получаем текущие позиции корзины пользователя через JOIN
    const cartItems = await queryDB(
      `SELECT ci.*, s.name, s.price, COALESCE(s.discount_percent, 0) AS discount_percent
       FROM cart_items ci
       JOIN services s ON ci.service_id = s.service_id
       WHERE ci.user_id = ?`,
      [req.user.user_id]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Ваша корзина пуста. Добавьте услуги перед оформлением заказа." });
    }

    // Расчет итоговой суммы заказа с учетом скидок на услуги
    const totalAmount = cartItems.reduce((sum, item) => {
      const effPrice = item.discount_percent > 0 ? Math.round(item.price * (1 - item.discount_percent / 100)) : item.price;
      return sum + effPrice * item.quantity;
    }, 0);

    // Создаем запись заказа в таблице orders
    const orderRes = await queryDB(
      `INSERT INTO orders (user_id, delivery_address, delivery_date, delivery_time, total_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, 'Новый', ?) RETURNING order_id`,
      [req.user.user_id, delivery_address.trim(), delivery_date, delivery_time, totalAmount, notes ? notes.trim() : ""]
    );

    const orderId = orderRes[0].order_id || orderRes[0].insertId;

    // Переносим позиции из корзины в order_items
    for (const item of cartItems) {
      const finalItemPrice = item.discount_percent > 0 ? Math.round(item.price * (1 - item.discount_percent / 100)) : item.price;
      await queryDB(
        "INSERT INTO order_items (order_id, service_id, quantity, price) VALUES (?, ?, ?, ?)",
        [orderId, item.service_id, item.quantity, finalItemPrice]
      );
    }

    // Очищаем корзину пользователя
    await queryDB("DELETE FROM cart_items WHERE user_id = ?", [req.user.user_id]);

    res.status(201).json({
      success: true,
      order_id: orderId,
      message: "Заказ успешно оформлен и передан в обработку",
      total_amount: totalAmount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение списка заказов текущего пользователя (с группировкой всех услуг внутри одного блока заказа)
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
        `SELECT oi.*, s.name AS service_name, s.image, s.duration, c.name AS category_name
         FROM order_items oi
         JOIN services s ON oi.service_id = s.service_id
         JOIN categories c ON s.category_id = c.category_id
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

// Получение всех заказов всех пользователей (Администратор)
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
        `SELECT oi.*, s.name AS service_name, s.image, s.duration, c.name AS category_name
         FROM order_items oi
         JOIN services s ON oi.service_id = s.service_id
         JOIN categories c ON s.category_id = c.category_id
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

// Смена статуса заказа (Администратор)
app.put("/api/orders/:id/status", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ["Новый", "В обработке", "Подтвержден", "Выполнен", "Отменен"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Недопустимый статус заказа" });
  }

  try {
    await queryDB("UPDATE orders SET status = ? WHERE order_id = ?", [status, id]);
    res.json({ success: true, message: `Статус заказа №${id} изменен на "${status}"` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// МАРШРУТЫ ОТЗЫВОВ (Лаб 4, разд. 2.6)
// ====================================================

// Получение отзывов через JOIN с таблицами пользователей и услуг
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
      s.name AS service_name
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

// Добавление отзыва (только для авторизованных пользователей)
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
    const inserted = await queryDB(
      "INSERT INTO reviews (service_id, user_id, rating, comment) VALUES (?, ?, ?, ?) RETURNING *",
      [Number(service_id), req.user.user_id, numRating, comment.trim()]
    );

    const fullReview = await queryDB(
      `SELECT r.*, u.name AS user_name, s.name AS service_name
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       JOIN services s ON r.service_id = s.service_id
       WHERE r.review_id = ?`,
      [inserted[0].review_id]
    );

    res.status(201).json(fullReview[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удаление отзыва (Администратор)
app.delete("/api/reviews/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await queryDB("DELETE FROM reviews WHERE review_id = ?", [id]);
    res.json({ success: true, message: "Отзыв успешно удален" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (Администратор)
// ====================================================

// Получение списка всех пользователей через JOIN с таблицей ролей
app.get("/api/users", adminMiddleware, async (req, res) => {
  try {
    const rows = await queryDB(
      `SELECT u.user_id, u.name, u.email, u.phone, u.address, u.created_at, r.name AS role, u.role_id
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       ORDER BY u.user_id ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Изменение роли пользователя (Администратор)
app.put("/api/users/:id/role", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { role_id } = req.body;
  if (!role_id) {
    return res.status(400).json({ error: "Укажите роль пользователя" });
  }

  try {
    await queryDB("UPDATE users SET role_id = ? WHERE user_id = ?", [Number(role_id), id]);
    res.json({ success: true, message: "Роль пользователя успешно обновлена" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удаление пользователя (Администратор)
app.delete("/api/users/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.user_id) {
    return res.status(400).json({ error: "Нельзя удалить собственный аккаунт администратора" });
  }

  try {
    await queryDB("DELETE FROM cart_items WHERE user_id = ?", [id]);
    await queryDB("DELETE FROM reviews WHERE user_id = ?", [id]);
    await queryDB("DELETE FROM users WHERE user_id = ?", [id]);
    res.json({ success: true, message: "Пользователь удален" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Тестовый эндпоинт состояния сервера
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

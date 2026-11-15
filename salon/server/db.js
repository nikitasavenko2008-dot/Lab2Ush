import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Файл базы данных лежит рядом с сервером, данные не теряются после перезапуска
const DB = new DatabaseSync(path.join(__dirname, "salon.db"));

// ============================================================
//  Схема базы данных — 5 основных таблиц + категории и купоны
// ============================================================
function initDB() {
  DB.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role_id INTEGER DEFAULT 2,
      coupon_id INTEGER,
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (coupon_id) REFERENCES coupons(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      duration INTEGER,
      price REAL NOT NULL,
      category_id INTEGER,
      discount_percent REAL DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      percent REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      date_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'cash',
      status TEXT DEFAULT 'pending',
      paid_at TEXT,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    );
  `);
}

// ============================================================
//  Сид-данные
// ============================================================
function seedDB() {
  // Роли
  DB.prepare("INSERT INTO roles (id, name) VALUES (1, 'admin'), (2, 'client')")
    .run();

  // Категории (админ может добавлять через API)
  DB.prepare("INSERT INTO categories (name) VALUES (?)").run("Маникюр");
  DB.prepare("INSERT INTO categories (name) VALUES (?)").run("Стрижка");
  DB.prepare("INSERT INTO categories (name) VALUES (?)").run("Окрашивание");
  DB.prepare("INSERT INTO categories (name) VALUES (?)").run("Укладка");
  DB.prepare("INSERT INTO categories (name) VALUES (?)").run("Массаж");

  // Купоны
  DB.prepare("INSERT INTO coupons (code, percent) VALUES (?, ?)")
    .run("WELCOME10", 10);
  DB.prepare("INSERT INTO coupons (code, percent) VALUES (?, ?)")
    .run("VIP20", 20);
  DB.prepare("INSERT INTO coupons (code, percent) VALUES (?, ?)")
    .run("HOLIDAY15", 15);

  // Услуги (10 шт, ~30% = 3 шт со скидкой)
  const services = [
    {
      name: "Классический маникюр",
      desc: "Обработка кутикулы, придание формы ногтям, покрытие лаком",
      duration: 60,
      price: 1500,
      cat: "Маникюр",
      disc: 0,
    },
    {
      name: "Маникюр с покрытием гель-лак",
      desc: "Долговременное покрытие гель-лаком до 3 недель",
      duration: 90,
      price: 2500,
      cat: "Маникюр",
      disc: 10, // скидка
    },
    {
      name: "Детская стрижка",
      desc: "Стрижка для детей до 12 лет",
      duration: 30,
      price: 800,
      cat: "Стрижка",
      disc: 0,
    },
    {
      name: "Женская стрижка",
      desc: "Стрижка с мытьём головы и укладкой",
      duration: 60,
      price: 2000,
      cat: "Стрижка",
      disc: 15, // скидка
    },
    {
      name: "Окрашивание в один тон",
      desc: "Однотонное окрашивание краской профессионального бренда",
      duration: 120,
      price: 3500,
      cat: "Окрашивание",
      disc: 0,
    },
    {
      name: "Сложное окрашивание",
      desc: "Балаяж, шатуш, аиртач",
      duration: 180,
      price: 6000,
      cat: "Окрашивание",
      disc: 20, // скидка
    },
    {
      name: "Вечерняя укладка",
      desc: "Профессиональная укладка для торжественного случая",
      duration: 90,
      price: 2500,
      cat: "Укладка",
      disc: 0,
    },
    {
      name: "Повседневная укладка",
      desc: "Лёгкая укладка плойкой или феном",
      duration: 45,
      price: 1200,
      cat: "Укладка",
      disc: 0,
    },
    {
      name: "Массаж головы",
      desc: "Расслабляющий массаж головы 20 минут",
      duration: 20,
      price: 500,
      cat: "Массаж",
      disc: 0,
    },
    {
      name: "Комплекс: стрижка + укладка",
      desc: "Стрижка и профессиональная укладка в одном визите",
      duration: 90,
      price: 3000,
      cat: "Стрижка",
      disc: 0,
    },
  ];

  const insertSvc = DB.prepare(
    `INSERT INTO services (name, description, duration, price, category_id, discount_percent)
     VALUES (?, ?, ?, ?, (SELECT id FROM categories WHERE name = ?), ?)`
  );

  for (const s of services) {
    insertSvc.run(
      s.name,
      s.desc,
      s.duration,
      s.price,
      s.cat,
      s.disc
    );
  }

  // Админ (пароль: admin)
  const adminHash = hashPwd("admin");
  DB.prepare(
    "INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, 1)"
  ).run("Администратор", "admin@salon.ru", adminHash);

  // Обычный клиент (пароль: client)
  const clientHash = hashPwd("client");
  DB.prepare(
    "INSERT INTO users (name, email, password, role_id, coupon_id) VALUES (?, ?, ?, 2, 1)"
  ).run("Иван Клиентов", "ivan@mail.ru", clientHash);
}

// Простой хеш пароля (SHA-256 с солью) — достаточно для учебного проекта
function hashPwd(pw) {
  const salt = "salon_salt_2025";
  return crypto.createHash("sha256").update(pw + salt).digest("hex");
}

initDB();

// Сеем данные только если база пустая (иначе при перезапуске будут дубли)
const userCount = DB.prepare("SELECT COUNT(*) AS c FROM users").get().c;
if (userCount === 0) {
  seedDB();
}

export default DB;

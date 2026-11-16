import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = new DatabaseSync(path.join(__dirname, "salon.db"));

function hashPwd(pw) {
  const salt = "salon_salt_2025";
  return crypto.createHash("sha256").update(pw + salt).digest("hex");
}

function initDB() {
  DB.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      role_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coupons (
      coupon_id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      percent REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role_id INTEGER DEFAULT 2,
      coupon_id INTEGER,
      FOREIGN KEY (role_id) REFERENCES roles(role_id),
      FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id)
    );

    CREATE TABLE IF NOT EXISTS services (
      service_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      duration INTEGER DEFAULT 60,
      price REAL NOT NULL,
      category_id INTEGER,
      discount_percent REAL DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (service_id) REFERENCES services(service_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'card',
      status TEXT DEFAULT 'paid',
      paid_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id)
    );
  `);
}

function seedDB() {
  // 1. Roles
  const insertRole = DB.prepare("INSERT INTO roles (role_id, name) VALUES (?, ?)");
  insertRole.run(1, "admin");
  insertRole.run(2, "client");

  // 2. Categories
  const insertCat = DB.prepare("INSERT INTO categories (name) VALUES (?)");
  const catNames = ["Маникюр", "Стрижка", "Окрашивание", "Укладка", "Массаж", "Косметология"];
  for (const c of catNames) {
    insertCat.run(c);
  }

  // 3. Coupons
  const insertCoupon = DB.prepare("INSERT INTO coupons (code, percent) VALUES (?, ?)");
  insertCoupon.run("WELCOME10", 10);
  insertCoupon.run("VIP20", 20);
  insertCoupon.run("HOLIDAY15", 15);
  insertCoupon.run("SPRING25", 25);
  insertCoupon.run("NEWYEAR30", 30);

  // 4. Services (10 услуг, ровно 3 со скидкой = 30%)
  const services = [
    {
      name: "Классический маникюр",
      desc: "Обработка кутикулы, придание формы ногтям, спа-уход и покрытие",
      duration: 60,
      price: 1500,
      cat: "Маникюр",
      disc: 0,
    },
    {
      name: "Маникюр с покрытием гель-лак",
      desc: "Стойкое долговременное покрытие гель-лаком премиум-класса до 3 недель",
      duration: 90,
      price: 2500,
      cat: "Маникюр",
      disc: 10, // Скидка 1
    },
    {
      name: "Детская стрижка",
      desc: "Аккуратная и быстрая стрижка для детей до 12 лет",
      duration: 30,
      price: 800,
      cat: "Стрижка",
      disc: 0,
    },
    {
      name: "Женская стрижка",
      desc: "Модельная стрижка с мытьём головы профессиональным шампунем и укладкой",
      duration: 60,
      price: 2000,
      cat: "Стрижка",
      disc: 15, // Скидка 2
    },
    {
      name: "Окрашивание в один тон",
      desc: "Глубокий ровный тон с защитой структуры волос итальянским красителем",
      duration: 120,
      price: 3500,
      cat: "Окрашивание",
      disc: 0,
    },
    {
      name: "Сложное окрашивание (Airtouch)",
      desc: "Трендовое осветление и тонирование в техниках шатуш, балаяж или аиртач",
      duration: 180,
      price: 6000,
      cat: "Окрашивание",
      disc: 20, // Скидка 3 (ровно 3 из 10 = 30%)
    },
    {
      name: "Вечерняя укладка",
      desc: "Элегантная прическа или голливудские локоны для торжественного события",
      duration: 90,
      price: 2500,
      cat: "Укладка",
      disc: 0,
    },
    {
      name: "Повседневная укладка",
      desc: "Лёгкая укладка феном и брашингом на каждый день",
      duration: 45,
      price: 1200,
      cat: "Укладка",
      disc: 0,
    },
    {
      name: "Расслабляющий массаж головы",
      desc: "Снятие напряжения, улучшение микроциркуляции и питание корней волос",
      duration: 30,
      price: 1000,
      cat: "Массаж",
      disc: 0,
    },
    {
      name: "Комплекс: стрижка + спа-укладка",
      desc: "Полный образ с глубоким увлажняющим уходом и фиксацией",
      duration: 90,
      price: 3000,
      cat: "Стрижка",
      disc: 0,
    },
  ];

  const insertSvc = DB.prepare(
    `INSERT INTO services (name, description, duration, price, category_id, discount_percent)
     VALUES (?, ?, ?, ?, (SELECT category_id FROM categories WHERE name = ?), ?)`
  );

  for (const s of services) {
    insertSvc.run(s.name, s.desc, s.duration, s.price, s.cat, s.disc);
  }

  // 5. Users
  const adminHash = hashPwd("admin");
  DB.prepare(
    "INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, 1)"
  ).run("Администратор Дарья", "admin@salon.ru", adminHash);

  const clientHash = hashPwd("client");
  DB.prepare(
    "INSERT INTO users (name, email, password, role_id, coupon_id) VALUES (?, ?, ?, 2, 1)"
  ).run("Иван Клиентов", "ivan@mail.ru", clientHash);

  const client2Hash = hashPwd("1234");
  DB.prepare(
    "INSERT INTO users (name, email, password, role_id, coupon_id) VALUES (?, ?, ?, 2, 2)"
  ).run("Анна Смирнова", "anna@mail.ru", client2Hash);

  // 6. Appointments & Payments (точно в стиле презентации Юшиной)
  const initialAppointments = [
    {
      userId: 2,
      serviceId: 1,
      date: "2024-01-15",
      time: "10:00:00",
      status: "completed",
      notes: "Пациент жалуется на сухость кутикулы",
      amount: 1350,
    },
    {
      userId: 2,
      serviceId: 2,
      date: "2024-01-20",
      time: "14:30:00",
      status: "scheduled",
      notes: "Плановый осмотр и покрытие",
      amount: 2025,
    },
    {
      userId: 3,
      serviceId: 4,
      date: "2024-01-16",
      time: "11:15:00",
      status: "completed",
      notes: "Профилактический уход за волосами",
      amount: 1360,
    },
    {
      userId: 3,
      serviceId: 6,
      date: "2024-01-22",
      time: "16:00:00",
      status: "scheduled",
      notes: "Консультация стилиста по осветлению",
      amount: 3840,
    },
    {
      userId: 2,
      serviceId: 5,
      date: "2024-01-18",
      time: "09:30:00",
      status: "completed",
      notes: "Ежегодная проверка оттенка",
      amount: 3150,
    },
  ];

  const insAppt = DB.prepare(
    `INSERT INTO appointments (user_id, service_id, appointment_date, appointment_time, status, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insPay = DB.prepare(
    `INSERT INTO payments (appointment_id, amount, method, status)
     VALUES (?, ?, 'card', 'paid')`
  );

  for (const a of initialAppointments) {
    const res = insAppt.run(a.userId, a.serviceId, a.date, a.time, a.status, a.notes);
    insPay.run(Number(res.lastInsertRowid), a.amount);
  }
}

initDB();

const userCount = DB.prepare("SELECT COUNT(*) AS c FROM users").get().c;
if (userCount === 0) {
  seedDB();
}

export default DB;

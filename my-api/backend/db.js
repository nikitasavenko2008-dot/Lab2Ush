// Модуль локальной базы данных SQLite (резервный источник при отсутствии подключения к PostgreSQL)
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = new DatabaseSync(path.join(__dirname, "restaurant.db"));

// Инициализация структуры таблиц
function initDB() {
  DB.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
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
      phone TEXT NOT NULL,
      address TEXT DEFAULT '',
      role_id INTEGER DEFAULT 2,
      personal_discount_percent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (role_id) REFERENCES roles(role_id)
    );

    CREATE TABLE IF NOT EXISTS services (
      service_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      duration INTEGER DEFAULT 180,
      price REAL NOT NULL,
      category_id INTEGER,
      image TEXT,
      discount_percent INTEGER DEFAULT 0,
      stock_quantity INTEGER DEFAULT 15,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      cart_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, service_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (service_id) REFERENCES services(service_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      order_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      delivery_time TEXT DEFAULT '12:00',
      total_amount REAL NOT NULL,
      coupon_code TEXT DEFAULT '',
      coupon_discount_percent INTEGER DEFAULT 0,
      personal_discount_percent INTEGER DEFAULT 0,
      subtotal_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'Новый',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      service_id INTEGER,
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (service_id) REFERENCES services(service_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      review_id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (service_id) REFERENCES services(service_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      reset_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      coupon_id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_percent INTEGER NOT NULL DEFAULT 10,
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    DB.exec("INSERT OR IGNORE INTO categories (name) VALUES ('Без категории')");
  } catch (e) {}

  try {
    DB.exec("ALTER TABLE services ADD COLUMN discount_percent INTEGER DEFAULT 0");
  } catch (e) {
    // Колонка уже существует
  }

  try {
    DB.exec("ALTER TABLE services ADD COLUMN stock_quantity INTEGER DEFAULT 15");
  } catch (e) {}

  try {
    DB.exec("ALTER TABLE orders ADD COLUMN coupon_code TEXT DEFAULT ''");
  } catch (e) {}

  try {
    DB.exec("ALTER TABLE orders ADD COLUMN coupon_discount_percent INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    DB.exec("ALTER TABLE orders ADD COLUMN personal_discount_percent INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    DB.exec("ALTER TABLE orders ADD COLUMN subtotal_amount REAL DEFAULT 0");
  } catch (e) {}

  try {
    DB.exec("ALTER TABLE users ADD COLUMN personal_discount_percent INTEGER DEFAULT 0");
  } catch (e) {
    // Колонка уже существует
  }

  try {
    const couponCount = DB.prepare("SELECT COUNT(*) AS c FROM coupons").get().c;
    if (couponCount === 0) {
      const insCpn = DB.prepare("INSERT INTO coupons (code, discount_percent, description) VALUES (?, ?, ?)");
      insCpn.run("VIP10", 10, "Скидка постоянного клиента");
      insCpn.run("WELCOME15", 15, "Скидка на первый заказ банкета");
      insCpn.run("FESTIVAL20", 20, "Праздничный промокод");
    }
  } catch (e) {}
}

// Начальное наполнение данными
function seedDB() {
  const insertRole = DB.prepare("INSERT INTO roles (role_id, name) VALUES (?, ?)");
  insertRole.run(1, "admin");
  insertRole.run(2, "user");

  const insertCat = DB.prepare("INSERT INTO categories (category_id, name) VALUES (?, ?)");
  const cats = [
    [1, "Банкетное обслуживание"],
    [2, "Обслуживающий персонал"],
    [3, "Фуршеты и кофе-брейки"],
    [4, "Бар и напитки"],
    [5, "Гриль и BBQ"],
    [6, "Оборудование и посуда"]
  ];
  for (const [id, name] of cats) {
    insertCat.run(id, name);
  }

  const insertUser = DB.prepare("INSERT INTO users (user_id, name, email, password, phone, address, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insertUser.run(1, "Администратор Ресторана", "admin@restaurant.ru", "admin", "+7 (999) 000-00-01", "г. Москва, ул. Арбат, д. 10", 1);
  insertUser.run(2, "Иван Заказчиков", "ivan@mail.ru", "client", "+7 (999) 111-22-33", "г. Москва, Ленинский проспект, д. 45, кв. 12", 2);
  insertUser.run(3, "Елена Смирнова", "elena@mail.ru", "123456", "+7 (999) 444-55-66", "г. Москва, Тверская ул., д. 7", 2);

  const insertSvc = DB.prepare("INSERT INTO services (service_id, name, description, duration, price, category_id, image) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const services = [
    [1, "Выездной шеф-повар на банкет", "Приготовление авторских ресторанных блюд на месте. Закупка премиальных продуктов, гастрономическая подача и сопровождение торжества.", 240, 15000, 1, "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&auto=format&fit=crop&q=80"],
    [2, "Команда официантов (2 специалиста)", "Выезд двух профессиональных официантов в строгой классической униформе. Сервировка столов, встреча гостей, аккуратная смена блюд и подача напитков.", 300, 7000, 2, "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80"],
    [3, "Выездной коктейльный бар и бармен", "Мобильная светящаяся барная стойка, профессиональный бармен, лед, бокалы и приготовление 10 видов классических и авторских коктейлей.", 240, 12000, 4, "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80"],
    [4, "Фуршетный сет «Премиум деликатес»", "Сет на 15–20 гостей: брускетты с лососем и камамбером, канапе с прошутто, тарталетки с тигровыми креветками, ассорти элитных сыров с орехами и медом.", 120, 18000, 3, "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=80"],
    [5, "Гриль-станция и BBQ-шеф", "Приготовление сочных стейков Рибай, каре ягненка, овощей-гриль и морепродуктов на открытом огне с фирменными ресторанными соусами.", 300, 22000, 5, "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80"],
    [6, "Бизнес кофе-брейк «Гранд»", "Профессиональная кофемашина, свежемолотый зерновой кофе, ассорти листового чая, свежая французская выпечка (круассаны, макаронс, мини-киши) на 25 персон.", 90, 9500, 3, "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=600&auto=format&fit=crop&q=80"],
    [7, "Аренда фарфоровой посуды и бокалов", "Комплект ресторанной посуды из тонкого белого фарфора, бокалы для красного/белого вина и шампанского, столовые приборы из нержавеющей стали на 20 персон.", 180, 5000, 6, "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=600&auto=format&fit=crop&q=80"],
    [8, "Выездной сомелье и дегустация", "Увлекательная слепая дегустация 6 вин Старого и Нового Света с винным интерактивом, гастрономическим сопровождением и рассказом от шеф-сомелье.", 150, 14000, 4, "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80"],
    [9, "Кэнди-бар и шоколадный фонтан", "Трехуровневый фонтан из премиального бельгийского шоколада, свежая клубника, маршмеллоу, эклеры и капкейки ручной работы от шеф-кондитера.", 180, 11000, 1, "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80"],
    [10, "Крафтовая лимонадная станция", "Стеклянные диспенсеры с охлажденными крафтовыми лимонадами (клубника-базилик, маракуйя-мята, огуречный тархун), бокалы и свежие фрукты.", 180, 6500, 4, "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80"]
  ];
  for (const s of services) {
    insertSvc.run(...s);
  }

  const insertReview = DB.prepare("INSERT INTO reviews (service_id, user_id, rating, comment) VALUES (?, ?, ?, ?)");
  insertReview.run(1, 2, 5, "Шеф-повар приготовил потрясающий ужин на день рождения! Гости в полном восторге от подачи и вкуса стейков.");
  insertReview.run(2, 3, 5, "Официанты прибыли вовремя в идеальной форме, работали слаженно и незаметно для гостей. Большое спасибо!");
  insertReview.run(3, 2, 5, "Коктейльный бар стал главной фишкой вечеринки. Бармен — настоящий мастер шоу!");
  insertReview.run(4, 3, 4, "Закуски очень свежие и аппетитные, канапе просто таяли во рту. Рекомендуем для деловых встреч.");

  const insertOrder = DB.prepare("INSERT INTO orders (order_id, user_id, delivery_address, delivery_date, delivery_time, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insertOrder.run(1, 2, "г. Москва, Ленинский проспект, д. 45, кв. 12", "2026-11-10", "14:00", 22000, "Выполнен", "Вход со двора, код домофона 45К");
  insertOrder.run(2, 2, "г. Москва, Ленинский проспект, д. 45, кв. 12", "2026-11-20", "16:00", 19000, "В обработке", "Позвонить за 1 час до прибытия");

  const insertOrderItem = DB.prepare("INSERT INTO order_items (order_id, service_id, quantity, price) VALUES (?, ?, ?, ?)");
  insertOrderItem.run(1, 1, 1, 15000);
  insertOrderItem.run(1, 2, 1, 7000);
  insertOrderItem.run(2, 3, 1, 12000);
  insertOrderItem.run(2, 2, 1, 7000);

  const insertCart = DB.prepare("INSERT INTO cart_items (user_id, service_id, quantity) VALUES (?, ?, ?)");
  insertCart.run(2, 4, 1);
}

initDB();

const userCount = DB.prepare("SELECT COUNT(*) AS c FROM users").get().c;
if (userCount === 0) {
  seedDB();
}

export default DB;

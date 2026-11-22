import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('report_screens');

const codeSnippets = [
  {
    filename: 'code_db.png',
    title: 'database.sql — Схема реляционной БД PostgreSQL (Лаб 4)',
    lang: 'sql',
    code: `-- Реляционная схема базы данных ресторана выездного обслуживания
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS coupons (
    coupon_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percent INT NOT NULL DEFAULT 10,
    description VARCHAR(255) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address TEXT DEFAULT '',
    role_id INT REFERENCES roles(role_id) DEFAULT 2,
    personal_discount_percent INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS services (
    service_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    duration INT DEFAULT 180,
    price NUMERIC NOT NULL,
    category_id INT REFERENCES categories(category_id),
    image TEXT,
    discount_percent INT DEFAULT 0,
    stock_quantity INT DEFAULT 15
);

CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    delivery_address TEXT NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_time VARCHAR(20) NOT NULL,
    total_amount NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'В обработке'
);`
  },
  {
    filename: 'code_server.png',
    title: 'server.js — JOIN-запросы и фильтр ненормативной лексики',
    lang: 'javascript',
    code: `// Получение всех услуг через JOIN категорий и агрегацию отзывов
app.get("/api/services", async (req, res) => {
  const { category_id, search, min_price, max_price } = req.query;
  let sql = \`
    SELECT s.service_id, s.name, s.description, s.duration, s.price,
           s.category_id, s.image,
           COALESCE(s.discount_percent, 0) AS discount_percent,
           COALESCE(s.stock_quantity, 15) AS stock_quantity,
           COALESCE(c.name, 'Без категории') AS category_name,
           COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating,
           COUNT(r.review_id) AS reviews_count
    FROM services s
    LEFT JOIN categories c ON s.category_id = c.category_id
    LEFT JOIN reviews r ON s.service_id = r.service_id
    WHERE 1=1\`;
  const params = [];

  if (category_id && category_id !== "all") {
    sql += " AND s.category_id = ?";
    params.push(Number(category_id));
  }
  if (search && search.trim()) {
    sql += " AND (LOWER(s.name) LIKE ? OR LOWER(s.description) LIKE ?)";
    const term = \`%\${search.trim().toLowerCase()}%\`;
    params.push(term, term);
  }
  sql += " GROUP BY s.service_id, c.name ORDER BY s.service_id ASC";
  const rows = await queryDB(sql, params);
  res.json(rows);
});

// Проверка ненормативной лексики перед сохранением отзыва
app.post("/api/reviews", authMiddleware, async (req, res) => {
  const { service_id, rating, comment } = req.body;
  validateProfanity(comment, "Текст отзыва");
  const inserted = await queryDB(
    "INSERT INTO reviews (service_id, user_id, rating, comment) VALUES (?, ?, ?, ?) RETURNING *",
    [Number(service_id), req.user.user_id, Number(rating), comment.trim()]
  );
  res.status(201).json(inserted[0]);
});`
  },
  {
    filename: 'code_cart.png',
    title: 'Cart.jsx — Серверная корзина, купоны и валидация оформления',
    lang: 'javascript',
    code: `export default function Cart() {
  const { cart, removeFromCart, updateCartQuantity, clearCart, auth } = useShop();
  const [address, setAddress] = useState(auth.user?.address || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("14:00");
  const [coupon, setCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Валидация: дата доставки не может быть меньше текущей
  const today = new Date().toISOString().split("T")[0];

  const handleApplyCoupon = async () => {
    try {
      const res = await apiGet(\`/api/coupons/check/\${coupon.trim()}\`);
      setCouponDiscount(res.discount_percent);
      setSuccess(\`Промокод применен: скидка \${res.discount_percent}%\`);
    } catch (err) {
      setError(err.message || "Неверный промокод");
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!address.trim()) return setError("Укажите адрес доставки");
    if (!date || date < today) return setError("Дата доставки не может быть в прошлом");

    const orderData = {
      delivery_address: address.trim(),
      delivery_date: date,
      delivery_time: time,
      coupon_code: coupon.trim() || null
    };
    await apiPost("/api/orders", orderData, auth.token);
    clearCart();
    navigate("/dashboard");
  };`
  },
  {
    filename: 'code_admin.png',
    title: 'Admin.jsx — Модальные окна, фильтрация и управление ресурсами',
    lang: 'javascript',
    code: `export default function Admin() {
  const [activeTab, setActiveTab] = useState("services"); // services, categories, orders, coupons, users, reviews
  const [activeModal, setActiveModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Живая фильтрация в каждой вкладке
  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Удаление категории с автоматическим переносом услуг в «Без категории»
  const handleDeleteCategory = async (catId) => {
    if (!window.confirm("Удалить категорию? Услуги будут перенесены в «Без категории»")) return;
    await apiDelete(\`/api/categories/\${catId}\`, auth.token);
    await reloadData();
  };

  // Изменение статуса заказа клиенту
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    await apiPut(\`/api/orders/\${orderId}/status\`, { status: newStatus }, auth.token);
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
  };`
  }
];

function generateHtml(title, code, lang) {
  // Simple escape
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split('\n');
  const numbered = lines.map((line, idx) => {
    return `<div class="line"><span class="num">${idx + 1}</span><span class="text">${line}</span></div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    margin: 0;
    padding: 20px;
    background: #1e1e1e;
    font-family: 'Consolas', 'Courier New', monospace;
    color: #d4d4d4;
  }
  .window {
    background: #1e1e1e;
    border-radius: 8px;
    border: 1px solid #333;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }
  .title-bar {
    background: #252526;
    padding: 8px 14px;
    font-size: 13px;
    color: #cccccc;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #333;
  }
  .dots {
    display: flex;
    gap: 6px;
    margin-right: 12px;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .dot.red { background: #ff5f56; }
  .dot.yellow { background: #ffbd2e; }
  .dot.green { background: #27c93f; }
  .code-area {
    padding: 16px;
    font-size: 14px;
    line-height: 1.5;
  }
  .line {
    display: flex;
  }
  .num {
    width: 35px;
    color: #858585;
    user-select: none;
    text-align: right;
    margin-right: 16px;
  }
  .text {
    flex: 1;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
</head>
<body>
<div class="window">
  <div class="title-bar">
    <div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div>
    <div>${title}</div>
  </div>
  <div class="code-area">
    ${numbered}
  </div>
</div>
</body>
</html>`;
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1200,800']
  });

  const page = await browser.newPage();

  for (const item of codeSnippets) {
    const html = generateHtml(item.title, item.code, item.lang);
    await page.setContent(html, { waitUntil: 'load' });
    const clip = await page.evaluate(() => {
      const el = document.querySelector('.window');
      const rect = el.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    });
    await page.setViewport({ width: 1200, height: Math.ceil(clip.height + 60) });
    await page.screenshot({ path: path.join(outDir, item.filename), clip });
    console.log(`${item.filename} generated successfully!`);
  }

  await browser.close();
}

run().catch(console.error);

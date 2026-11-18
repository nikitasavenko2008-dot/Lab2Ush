-- Скрипт инициализации базы данных для ресторанного кейтеринга (Лабораторная №4)

DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- 1. Таблица ролей
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Таблица категорий услуг
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);
CREATE UNIQUE INDEX idx_categories_lower_name ON categories (LOWER(name));

-- 3. Таблица пользователей
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT DEFAULT '',
    role_id INT REFERENCES roles(role_id) DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Таблица услуг ресторана / кейтеринга
CREATE TABLE services (
    service_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    duration INT DEFAULT 180,
    price NUMERIC NOT NULL,
    category_id INT REFERENCES categories(category_id) ON DELETE SET NULL,
    image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Серверная корзина пользователей (уникальная для каждого пользователя)
CREATE TABLE cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    service_id INT NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, service_id)
);

-- 6. Заказы пользователей
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    delivery_address TEXT NOT NULL,
    delivery_date DATE NOT NULL,
    delivery_time VARCHAR(20) DEFAULT '12:00',
    total_amount NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'Новый',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Позиции заказов (связь с услугами)
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    service_id INT REFERENCES services(service_id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL
);

-- 8. Отзывы на услуги
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    service_id INT NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Восстановление пароля (коды сброса)
CREATE TABLE password_resets (
    reset_id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Наполнение данными
INSERT INTO roles (role_id, name) VALUES 
(1, 'admin'),
(2, 'user');

INSERT INTO categories (category_id, name) VALUES
(1, 'Банкетное обслуживание'),
(2, 'Обслуживающий персонал'),
(3, 'Фуршеты и кофе-брейки'),
(4, 'Бар и напитки'),
(5, 'Гриль и BBQ'),
(6, 'Оборудование и посуда');
SELECT setval('categories_category_id_seq', 6);

INSERT INTO users (user_id, name, email, password, phone, address, role_id) VALUES
(1, 'Администратор Ресторана', 'admin@restaurant.ru', 'admin', '+7 (999) 000-00-01', 'г. Москва, ул. Арбат, д. 10', 1),
(2, 'Иван Заказчиков', 'ivan@mail.ru', 'client', '+7 (999) 111-22-33', 'г. Москва, Ленинский проспект, д. 45, кв. 12', 2),
(3, 'Елена Смирнова', 'elena@mail.ru', '123456', '+7 (999) 444-55-66', 'г. Москва, Тверская ул., д. 7', 2);
SELECT setval('users_user_id_seq', 3);

INSERT INTO services (service_id, name, description, duration, price, category_id, image) VALUES
(1, 'Выездной шеф-повар на банкет', 'Приготовление авторских ресторанных блюд на месте. Закупка премиальных продуктов, гастрономическая подача и сопровождение торжества.', 240, 15000, 1, 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&auto=format&fit=crop&q=80'),
(2, 'Команда официантов (2 специалиста)', 'Выезд двух профессиональных официантов в строгой классической униформе. Сервировка столов, встреча гостей, аккуратная смена блюд и подача напитков.', 300, 7000, 2, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80'),
(3, 'Выездной коктейльный бар и бармен', 'Мобильная светящаяся барная стойка, профессиональный бармен, лед, бокалы и приготовление 10 видов классических и авторских коктейлей.', 240, 12000, 4, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80'),
(4, 'Фуршетный сет «Премиум деликатес»', 'Сет на 15–20 гостей: брускетты с лососем и камамбером, канапе с прошутто, тарталетки с тигровыми креветками, ассорти элитных сыров с орехами и медом.', 120, 18000, 3, 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=80'),
(5, 'Гриль-станция и BBQ-шеф', 'Приготовление сочных стейков Рибай, каре ягненка, овощей-гриль и морепродуктов на открытом огне с фирменными ресторанными соусами.', 300, 22000, 5, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80'),
(6, 'Бизнес кофе-брейк «Гранд»', 'Профессиональная кофемашина, свежемолотый зерновой кофе, ассорти листового чая, свежая французская выпечка (круассаны, макаронс, мини-киши) на 25 персон.', 90, 9500, 3, 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=600&auto=format&fit=crop&q=80'),
(7, 'Аренда фарфоровой посуды и бокалов', 'Комплект ресторанной посуды из тонкого белого фарфора, бокалы для красного/белого вина и шампанского, столовые приборы из нержавеющей стали на 20 персон.', 180, 5000, 6, 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=600&auto=format&fit=crop&q=80'),
(8, 'Выездной сомелье и дегустация', 'Увлекательная слепая дегустация 6 вин Старого и Нового Света с винным интерактивом, гастрономическим сопровождением и рассказом от шеф-сомелье.', 150, 14000, 4, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80'),
(9, 'Кэнди-бар и шоколадный фонтан', 'Трехуровневый фонтан из премиального бельгийского шоколада, свежая клубника, маршмеллоу, эклеры и капкейки ручной работы от шеф-кондитера.', 180, 11000, 1, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80'),
(10, 'Крафтовая лимонадная станция', 'Стеклянные диспенсеры с охлажденными крафтовыми лимонадами (клубника-базилик, маракуйя-мята, огуречный тархун), бокалы и свежие фрукты.', 180, 6500, 4, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80');
SELECT setval('services_service_id_seq', 10);

-- Начальные отзывы
INSERT INTO reviews (service_id, user_id, rating, comment) VALUES
(1, 2, 5, 'Шеф-повар приготовил потрясающий ужин на день рождения! Гости в полном восторге от подачи и вкуса стейков.'),
(2, 3, 5, 'Официанты прибыли вовремя в идеальной форме, работали слаженно и незаметно для гостей. Большое спасибо!'),
(3, 2, 5, 'Коктейльный бар стал главной фишкой вечеринки. Бармен — настоящий мастер шоу!'),
(4, 3, 4, 'Закуски очень свежие и аппетитные, канапе просто таяли во рту. Рекомендуем для деловых встреч.'),
(5, 2, 5, 'Мясо прожарено идеально, овощи-гриль с ароматными травами. Шефу отдельная благодарность!');

-- Начальные заказы для клиента Иван Заказчиков
INSERT INTO orders (order_id, user_id, delivery_address, delivery_date, delivery_time, total_amount, status, notes) VALUES
(1, 2, 'г. Москва, Ленинский проспект, д. 45, кв. 12', CURRENT_DATE - INTERVAL '5 days', '14:00', 22000, 'Выполнен', 'Вход со двора, код домофона 45К'),
(2, 2, 'г. Москва, Ленинский проспект, д. 45, кв. 12', CURRENT_DATE + INTERVAL '2 days', '16:00', 19000, 'В обработке', 'Позвонить за 1 час до прибытия');
SELECT setval('orders_order_id_seq', 2);

INSERT INTO order_items (order_id, service_id, quantity, price) VALUES
(1, 1, 1, 15000),
(1, 2, 1, 7000),
(2, 3, 1, 12000),
(2, 2, 1, 7000);

-- Пример позиции в серверной корзине Ивана
INSERT INTO cart_items (user_id, service_id, quantity) VALUES
(2, 4, 1);

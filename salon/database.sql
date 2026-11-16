-- =======================================================
-- Скрипт создания базы данных для pgAdmin (PostgreSQL)
-- Лабораторная работа: Салон услуг
-- Преподаватель: Д.Д. Юшина
-- =======================================================

-- 1. Таблица ролей (Roles)
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- 2. Таблица категорий (Categories)
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Таблица скидочных купонов (Coupons)
CREATE TABLE IF NOT EXISTS coupons (
    coupon_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    percent NUMERIC NOT NULL
);

-- 4. Таблица пользователей (Users)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role_id INT REFERENCES roles(role_id) DEFAULT 2,
    coupon_id INT REFERENCES coupons(coupon_id)
);

-- 5. Таблица услуг (Services)
CREATE TABLE IF NOT EXISTS services (
    service_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    duration INT DEFAULT 60,
    price NUMERIC NOT NULL,
    category_id INT REFERENCES categories(category_id),
    discount_percent NUMERIC DEFAULT 0
);

-- 6. Таблица записей (Appointments) — в точности как на слайде 2 Юшиной
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    service_id INT REFERENCES services(service_id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Таблица платежей (Payments)
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(appointment_id),
    amount NUMERIC NOT NULL,
    method VARCHAR(50) DEFAULT 'card',
    status VARCHAR(20) DEFAULT 'paid',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =======================================================
-- Заполнение начальными данными (Семена)
-- =======================================================

-- Роли
INSERT INTO roles (role_id, name) VALUES (1, 'admin'), (2, 'client')
ON CONFLICT (role_id) DO NOTHING;

-- Категории (Требование 6)
INSERT INTO categories (name) VALUES 
('Маникюр'),
('Стрижка'),
('Окрашивание'),
('Укладка'),
('Массаж')
ON CONFLICT (name) DO NOTHING;

-- Купоны (Требование 5)
INSERT INTO coupons (code, percent) VALUES 
('WELCOME10', 10),
('VIP20', 20),
('HOLIDAY15', 15)
ON CONFLICT (code) DO NOTHING;

-- Услуги (10 услуг, ровно 3 со скидкой = 30% каталога по Требованию 5)
INSERT INTO services (name, description, duration, price, category_id, discount_percent) VALUES
('Классический маникюр', 'Обработка кутикулы и придание формы ногтям', 60, 1500, 1, 0),
('Маникюр с гель-лаком', 'Покрытие гель-лаком до 3 недель', 90, 2500, 1, 10),
('Детская стрижка', 'Стрижка для детей до 12 лет', 30, 800, 2, 0),
('Женская стрижка', 'Стрижка с мытьем головы и укладкой', 60, 2000, 2, 15),
('Окрашивание в один тон', 'Однотонное стойкое окрашивание', 120, 3500, 3, 0),
('Сложное окрашивание (Airtouch)', 'Балаяж, шатуш, аиртач', 180, 6000, 3, 20),
('Вечерняя укладка', 'Укладка для торжественных мероприятий', 90, 2500, 4, 0),
('Повседневная укладка', 'Легкая укладка феном и брашингом', 45, 1200, 4, 0),
('Массаж головы', 'Расслабляющий массаж 30 минут', 30, 1000, 5, 0),
('Комплекс: стрижка + укладка', 'Стрижка и стильная укладка', 90, 3000, 2, 0)
ON CONFLICT DO NOTHING;

-- Пользователи (пароли простые для учебной проверки)
INSERT INTO users (name, email, password, role_id, coupon_id) VALUES
('Администратор', 'admin@salon.ru', 'admin', 1, NULL),
('Иван Клиентов', 'ivan@mail.ru', 'client', 2, 1)
ON CONFLICT (email) DO NOTHING;

-- Записи (в точности как на скриншоте pgAdmin в презентации Юшиной)
INSERT INTO appointments (user_id, service_id, appointment_date, appointment_time, status, notes) VALUES
(2, 1, '2024-01-15', '10:00:00', 'completed', 'Пациент жалуется на головную боль'),
(2, 2, '2024-01-20', '14:30:00', 'scheduled', 'Плановый осмотр'),
(2, 4, '2024-01-16', '11:15:00', 'completed', 'Профилактическое УЗИ'),
(2, 3, '2024-01-22', '16:00:00', 'scheduled', 'Боли в спине'),
(2, 5, '2024-01-18', '09:30:00', 'completed', 'Ежегодная проверка')
ON CONFLICT DO NOTHING;

-- Платежи к записям
INSERT INTO payments (appointment_id, amount, method, status) VALUES
(1, 1350, 'card', 'paid'),
(2, 2025, 'card', 'paid'),
(3, 1530, 'card', 'paid'),
(4, 800, 'cash', 'paid'),
(5, 3150, 'card', 'paid')
ON CONFLICT DO NOTHING;

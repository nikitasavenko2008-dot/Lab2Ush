
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);


CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS coupons (
    coupon_id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    percent NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role_id INT REFERENCES roles(role_id) DEFAULT 2,
    coupon_id INT REFERENCES coupons(coupon_id)
);

CREATE TABLE IF NOT EXISTS services (
    service_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    duration INT DEFAULT 60,
    price NUMERIC NOT NULL,
    category_id INT REFERENCES categories(category_id),
    discount_percent NUMERIC DEFAULT 0,
    image TEXT
);

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

CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(appointment_id),
    amount NUMERIC NOT NULL,
    method VARCHAR(50) DEFAULT 'card',
    status VARCHAR(20) DEFAULT 'paid',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (role_id, name) VALUES (1, 'admin'), (2, 'client')
ON CONFLICT (role_id) DO NOTHING;

INSERT INTO categories (name) VALUES 
('Маникюр'),
('Стрижка'),
('Окрашивание'),
('Укладка'),
('Массаж')
ON CONFLICT (name) DO NOTHING;

INSERT INTO coupons (code, percent) VALUES 
('WELCOME10', 10),
('VIP20', 20),
('HOLIDAY15', 15)
ON CONFLICT (code) DO NOTHING;

INSERT INTO services (name, description, duration, price, category_id, discount_percent, image) VALUES
('Классический маникюр', 'Обработка кутикулы и придание формы ногтям', 60, 1500, 1, 0, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&auto=format&fit=crop&q=80'),
('Маникюр с гель-лаком', 'Покрытие гель-лаком до 3 недель', 90, 2500, 1, 10, 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=500&auto=format&fit=crop&q=80'),
('Детская стрижка', 'Стрижка для детей до 12 лет', 30, 800, 2, 0, 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=500&auto=format&fit=crop&q=80'),
('Женская стрижка', 'Стрижка с мытьем головы и укладкой', 60, 2000, 2, 15, 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=500&auto=format&fit=crop&q=80'),
('Окрашивание в один тон', 'Однотонное стойкое окрашивание', 120, 3500, 3, 0, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=500&auto=format&fit=crop&q=80'),
('Сложное окрашивание (Airtouch)', 'Балаяж, шатуш, аиртач', 180, 6000, 3, 20, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80'),
('Вечерняя укладка', 'Укладка для торжественных мероприятий', 90, 2500, 4, 0, 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=500&auto=format&fit=crop&q=80'),
('Повседневная укладка', 'Легкая укладка феном и брашингом', 45, 1200, 4, 0, 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=500&auto=format&fit=crop&q=80'),
('Массаж головы', 'Расслабляющий массаж 30 минут', 30, 1000, 5, 0, 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&auto=format&fit=crop&q=80'),
('Комплекс: стрижка + укладка', 'Стрижка и стильная укладка', 90, 3000, 2, 0, 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&auto=format&fit=crop&q=80')
ON CONFLICT DO NOTHING;

INSERT INTO users (name, email, password, role_id, coupon_id) VALUES
('Администратор', 'admin@salon.ru', 'admin', 1, NULL),
('Иван Клиентов', 'ivan@mail.ru', 'client', 2, 1)
ON CONFLICT (email) DO NOTHING;

INSERT INTO appointments (user_id, service_id, appointment_date, appointment_time, status, notes) VALUES
(2, 1, '2024-01-15', '10:00:00', 'completed', 'Пациент жалуется на головную боль'),
(2, 2, '2024-01-20', '14:30:00', 'scheduled', 'Плановый осмотр'),
(2, 4, '2024-01-16', '11:15:00', 'completed', 'Профилактическое УЗИ'),
(2, 3, '2024-01-22', '16:00:00', 'scheduled', 'Боли в спине'),
(2, 5, '2024-01-18', '09:30:00', 'completed', 'Ежегодная проверка')
ON CONFLICT DO NOTHING;

INSERT INTO payments (appointment_id, amount, method, status) VALUES
(1, 1350, 'card', 'paid'),
(2, 2025, 'card', 'paid'),
(3, 1530, 'card', 'paid'),
(4, 800, 'cash', 'paid'),
(5, 3150, 'card', 'paid')
ON CONFLICT DO NOTHING;

/**
 * Страница Корзины и оформления заказа (Лаб 4, разд. 2.2, 2.3)
 * Лабораторная работа №4 — Студент: Никита Савенко
 * 
 * - Отображает список выбранных позиций серверной корзины
 * - Позволяет изменять количество и удалять позиции
 * - Форма оформления заказа: адрес доставки, дата (валидация >= текущей), время, пожелания
 * - Промокод "VIP10"
 * - Сохранение заказа в БД через POST /api/orders и очистка корзины
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { apiPost } from "../api";
import Loader from "../components/Loader";
import ErrorBox from "../components/ErrorBox";
import "./Cart.css";

export default function Cart() {
  const { cart, cartLoading, cartError, updateQty, removeFromCart, clearCart, auth, fetchCart } = useShop();
  const navigate = useNavigate();

  // Получаем текущую дату в формате YYYY-MM-DD для валидации (дата не может быть меньше текущей)
  const today = new Date().toISOString().split("T")[0];

  // Поля оформления заказа
  const [deliveryAddress, setDeliveryAddress] = useState(auth.user?.address || "");
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [deliveryTime, setDeliveryTime] = useState("14:00");
  const [notes, setNotes] = useState("");

  // Промокод
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");

  // Состояние отправки заказа
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);

  const isAdmin = auth.user?.role === "admin";

  // Если зашел администратор — перенаправляем в панель управления (у администратора нет корзины)
  useEffect(() => {
    if (isAdmin) {
      navigate("/admin");
    }
  }, [isAdmin, navigate]);

  const userPersonalDiscount = Number(auth.user?.personal_discount_percent) || 0;

  // Обновляем адрес при загрузке данных пользователя
  useEffect(() => {
    if (auth.user?.address && !deliveryAddress) {
      setDeliveryAddress(auth.user.address);
    }
  }, [auth.user, deliveryAddress]);

  // Проверка и применение промокода через API базы данных
  const handleApplyPromo = async (e) => {
    e.preventDefault();
    setPromoError("");
    if (!promoInput.trim()) return;

    try {
      const res = await apiGet(`/api/coupons/check/${encodeURIComponent(promoInput.trim())}`);
      if (res.valid && res.coupon) {
        setAppliedPromo({
          code: res.coupon.code,
          discountPercent: Number(res.coupon.discount_percent),
          description: res.coupon.description,
        });
      }
    } catch (err) {
      if (promoInput.trim().toUpperCase() === "VIP10") {
        setAppliedPromo({ code: "VIP10", discountPercent: 10, description: "Скидка постоянного клиента" });
      } else {
        setPromoError(err.message || "Неверный или неактивный промокод");
      }
    }
  };

  // Расчет сумм с учетом индивидуальных скидок на услуги
  const subtotal = cart.reduce((sum, item) => {
    const rawP = Number(item.price) || 0;
    const disc = Number(item.discount_percent) || 0;
    const effP = disc > 0 ? Math.round(rawP * (1 - disc / 100)) : rawP;
    return sum + effP * (Number(item.quantity) || 1);
  }, 0);

  // Личная скидка клиента
  const personalDiscountAmount =
    userPersonalDiscount > 0 ? Math.round((subtotal * userPersonalDiscount) / 100) : 0;

  // Скидка по промокоду
  const promoDiscountAmount = appliedPromo
    ? Math.round(((subtotal - personalDiscountAmount) * appliedPromo.discountPercent) / 100)
    : 0;

  const totalDiscount = personalDiscountAmount + promoDiscountAmount;
  const totalAmount = Math.max(0, subtotal - totalDiscount);

  // Оформление заказа
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!auth.token) {
      navigate("/login");
      return;
    }

    if (!deliveryAddress.trim()) {
      setOrderError("Пожалуйста, укажите адрес доставки / обслуживания");
      return;
    }

    if (!deliveryDate) {
      setOrderError("Пожалуйста, выберите дату мероприятия");
      return;
    }

    // Валидация: дата не может быть меньше текущей
    if (deliveryDate < today) {
      setOrderError("Дата обслуживания не может быть меньше сегодняшней даты");
      return;
    }

    setSubmitting(true);
    setOrderError("");

    try {
      const notesParts = [];
      if (notes) notesParts.push(notes);
      if (userPersonalDiscount > 0) notesParts.push(`Личная скидка клиента: ${userPersonalDiscount}%`);
      if (appliedPromo) notesParts.push(`Промокод: ${appliedPromo.code} (-${appliedPromo.discountPercent}%)`);
      const orderNotes = notesParts.join(" | ");

      const res = await apiPost(
        "/api/orders",
        {
          delivery_address: deliveryAddress.trim(),
          delivery_date: deliveryDate,
          delivery_time: deliveryTime,
          notes: orderNotes,
          coupon_code: appliedPromo ? appliedPromo.code : "",
        },
        auth.token
      );

      setCreatedOrder(res);
      await fetchCart();
    } catch (err) {
      setOrderError(err.message || "Ошибка при создании заказа");
    } finally {
      setSubmitting(false);
    }
  };

  if (isAdmin) {
    return null;
  }

  if (!auth.token) {
    return (
      <div className="cart-page-container">
        <div className="login-required-card">
          <span className="card-emoji">🔒</span>
          <h2>Корзина доступна после входа</h2>
          <p>
            В соответствии с требованиями приложения, серверная корзина уникальна для каждого
            клиента и сохраняется в базе данных при выходе. Пожалуйста, авторизуйтесь.
          </p>
          <div className="login-prompt-btns">
            <Link to="/login" className="primary-btn">
              Войти в аккаунт
            </Link>
            <Link to="/register" className="secondary-btn">
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Экран успешного оформления заказа
  if (createdOrder) {
    return (
      <div className="cart-page-container">
        <div className="order-success-card">
          <div className="success-icon-badge">✓</div>
          <h2>Заказ №{createdOrder.order_id} успешно оформлен!</h2>
          <p className="success-text">
            Мы сохранили информацию о вашем заказе на сервере. Наш шеф-координатор свяжется с вами
            для подтверждения деталей кейтеринга.
          </p>

          <div className="order-summary-box">
            <div className="summary-line">
              <span>Адрес мероприятия:</span>
              <strong>{deliveryAddress}</strong>
            </div>
            <div className="summary-line">
              <span>Дата и время:</span>
              <strong>
                {deliveryDate} к {deliveryTime}
              </strong>
            </div>
            <div className="summary-line">
              <span>Сумма заказа:</span>
              <strong className="summary-total-val">
                {Number(createdOrder.total_amount || totalAmount).toLocaleString("ru-RU")} ₽
              </strong>
            </div>
          </div>

          <div className="success-actions">
            <Link to="/dashboard" className="primary-btn">
              Перейти в личный кабинет к заказу
            </Link>
            <Link to="/" className="secondary-btn">
              Вернуться в каталог
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-container">
      <div className="cart-page-header">
        <h1>Корзина ресторанных услуг</h1>
        <p className="cart-subtitle">
          Ваши выбранные услуги кейтеринга (сохраняются в базе данных вашего аккаунта)
        </p>
      </div>

      {cartLoading && <Loader text="Загрузка корзины с сервера..." />}
      {cartError && <ErrorBox message={cartError} />}

      {!cartLoading && cart.length === 0 && (
        <div className="empty-cart-view">
          <span className="empty-cart-emoji">🛒</span>
          <h3>Ваша корзина пуста</h3>
          <p>Перейдите в каталог, чтобы выбрать выездных поваров, официантов или фуршетные сеты.</p>
          <Link to="/" className="primary-btn">
            Перейти в каталог
          </Link>
        </div>
      )}

      {!cartLoading && cart.length > 0 && (
        <div className="cart-grid-layout">
          {/* Левая колонка: список позиций в корзине */}
          <div className="cart-items-column">
            <div className="cart-items-card">
              <div className="cart-card-header">
                <h3>Позиции заказа ({cart.length})</h3>
                <button type="button" className="clear-cart-link" onClick={clearCart}>
                  Очистить корзину
                </button>
              </div>

              <div className="cart-items-list">
                {cart.map((item) => {
                  const rawPrice = Number(item.price) || 0;
                  const discountPercent = Number(item.discount_percent) || 0;
                  const effectiveUnitPrice =
                    discountPercent > 0 ? Math.round(rawPrice * (1 - discountPercent / 100)) : rawPrice;
                  const itemQty = Number(item.quantity) || 1;
                  const itemStock = item.stock_quantity !== undefined ? Number(item.stock_quantity) : 15;
                  const itemTotal = effectiveUnitPrice * itemQty;
                  const isMaxStock = itemQty >= itemStock;

                  return (
                    <div key={item.cart_item_id} className="cart-item-row">
                      <img
                        src={
                          item.image ||
                          "https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80"
                        }
                        alt={item.name}
                        className="cart-item-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=80";
                        }}
                      />

                      <div className="cart-item-info">
                        <span className="cart-item-category">{item.category_name || "Без категории"}</span>
                        <h4 className="cart-item-title">{item.name}</h4>
                        <div className="cart-item-meta">
                          <span>⏱ {item.duration} мин</span>
                          <span className="unit-price">
                            {discountPercent > 0 ? (
                              <>
                                <s style={{ color: "#94a3b8", marginRight: "5px" }}>
                                  {rawPrice.toLocaleString("ru-RU")} ₽
                                </s>
                                <strong style={{ color: "#dc2626" }}>
                                  {effectiveUnitPrice.toLocaleString("ru-RU")} ₽
                                </strong>{" "}
                                <span style={{ color: "#ef4444", fontWeight: "bold" }}>(-{discountPercent}%)</span>
                              </>
                            ) : (
                              `${rawPrice.toLocaleString("ru-RU")} ₽ / позиция`
                            )}
                          </span>
                          <span className="cart-item-stock-tag">
                            В наличии: {itemStock} шт.
                          </span>
                        </div>
                      </div>

                      <div className="cart-item-qty-block">
                        <button
                          type="button"
                          className="qty-btn minus"
                          onClick={() => updateQty(item.cart_item_id, itemQty - 1)}
                          title="Уменьшить количество"
                        >
                          −
                        </button>
                        <span className="qty-counter">{itemQty}</span>
                        <button
                          type="button"
                          className={`qty-btn plus ${isMaxStock ? "disabled" : ""}`}
                          onClick={() => {
                            if (!isMaxStock) {
                              updateQty(item.cart_item_id, itemQty + 1);
                            }
                          }}
                          disabled={isMaxStock}
                          title={isMaxStock ? "Достигнут максимум наличия на складе" : "Увеличить количество"}
                        >
                          +
                        </button>
                      </div>

                      <div className="cart-item-sum-block">
                        <span className="cart-item-total">{itemTotal.toLocaleString("ru-RU")} ₽</span>
                        <button
                          type="button"
                          className="cart-item-remove-btn"
                          onClick={() => removeFromCart(item.cart_item_id)}
                          title="Удалить из корзины"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Блок промокода и персональной скидки */}
            <div className="promo-code-card">
              <h4>Промокод и личная скидка</h4>

              {userPersonalDiscount > 0 && (
                <div className="personal-discount-active-box">
                  🎟 <strong>Ваша персональная скидка клиента: {userPersonalDiscount}%</strong>
                  <div className="personal-disc-sub">Автоматически учитывается в расчете заказа</div>
                </div>
              )}

              <form onSubmit={handleApplyPromo} className="promo-form">
                <input
                  type="text"
                  placeholder="Введите промокод (например VIP10, WELCOME15)"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="promo-input"
                />
                <button type="submit" className="apply-promo-btn">
                  Применить
                </button>
              </form>
              {promoError && <p className="promo-err-msg">{promoError}</p>}
              {appliedPromo && (
                <div className="promo-applied-badge">
                  ✓ Промокод <strong>{appliedPromo.code}</strong> активирован: скидка {appliedPromo.discountPercent}%
                  {appliedPromo.description && <div>{appliedPromo.description}</div>}
                </div>
              )}
            </div>
          </div>

          {/* Правая колонка: форма оформления заказа (Лаб 4, разд. 2.3) */}
          <div className="checkout-column">
            <div className="checkout-card">
              <h3>Оформление заказа</h3>

              {orderError && <div className="checkout-alert error">{orderError}</div>}

              <form onSubmit={handleCheckout} className="checkout-form">
                <div className="form-group">
                  <label htmlFor="address-input">
                    Адрес проведения / доставки <span className="req">*</span>
                  </label>
                  <input
                    id="address-input"
                    type="text"
                    required
                    placeholder="г. Москва, ул. Примерная, д. 10"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                  <small className="field-hint">Куда приехать шеф-повару, официантам или доставке</small>
                </div>

                <div className="form-row-two">
                  <div className="form-group">
                    <label htmlFor="date-input">
                      Дата обслуживания <span className="req">*</span>
                    </label>
                    <input
                      id="date-input"
                      type="date"
                      required
                      min={today}
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                    <small className="field-hint">Не ранее сегодняшней даты</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="time-input">
                      Время начала <span className="req">*</span>
                    </label>
                    <input
                      id="time-input"
                      type="time"
                      required
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes-input">Пожелания к заказу / мероприятию</label>
                  <textarea
                    id="notes-input"
                    rows="2"
                    placeholder="Повод (банкет, юбилей, корпоратив), количество гостей, особенности..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Расчет итогов */}
                <div className="order-totals-breakdown">
                  <div className="totals-row">
                    <span>Подытог:</span>
                    <span>{subtotal.toLocaleString("ru-RU")} ₽</span>
                  </div>

                  {userPersonalDiscount > 0 && (
                    <div className="totals-row discount-row">
                      <span>Личная скидка клиента ({userPersonalDiscount}%):</span>
                      <span>-{personalDiscountAmount.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  )}

                  {appliedPromo && (
                    <div className="totals-row discount-row">
                      <span>Промокод {appliedPromo.code} ({appliedPromo.discountPercent}%):</span>
                      <span>-{promoDiscountAmount.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  )}

                  <div className="totals-row final-total-row">
                    <span>Итого к оплате:</span>
                    <span className="total-highlight">
                      {totalAmount.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="checkout-submit-btn"
                  disabled={submitting || cart.length === 0}
                >
                  {submitting ? "Оформление заказа..." : "Оформить заказ"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

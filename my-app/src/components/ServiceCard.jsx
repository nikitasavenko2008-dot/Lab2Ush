/**
 * Карточка услуги каталога «Royal Catering»
 * Лабораторная работа №4 — Студент: Никита Савенко
 * 
 * Отображает название, описание, категорию (через SQL JOIN), длительность, цену,
 * средний рейтинг и кнопку вызова модального окна отзывов.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import "./ServiceCard.css";

export default function ServiceCard({ service, onOpenReviews }) {
  const { addToCart, auth } = useShop();
  const navigate = useNavigate();
  const [addedNotice, setAddedNotice] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);

  const handleAddToCart = async () => {
    if (!auth.token) {
      navigate("/login");
      return;
    }

    const res = await addToCart(service, 1);
    if (res?.error) {
      setErrorNotice(res.error);
      setTimeout(() => setErrorNotice(null), 3000);
    } else {
      setAddedNotice(true);
      setTimeout(() => setAddedNotice(false), 2000);
    }
  };

  const imgUrl =
    service.image ||
    "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=80";

  const numRating = Number(service.avg_rating) || 0;
  const reviewsCount = Number(service.reviews_count) || 0;

  return (
    <div className="service-card">
      <div className="card-image-wrap">
        <img src={imgUrl} alt={service.name} className="card-img" loading="lazy" />
        <span className="card-category-badge">{service.category_name}</span>
      </div>

      <div className="card-body">
        <div className="card-header-info">
          <div className="card-rating" onClick={onOpenReviews} title="Нажмите, чтобы прочитать отзывы">
            <span className="star-icon">★</span>
            <span className="rating-value">{numRating > 0 ? numRating.toFixed(1) : "—"}</span>
            <span className="reviews-counter">({reviewsCount} отзывов)</span>
          </div>
          <span className="card-duration">⏱ {service.duration} мин</span>
        </div>

        <h3 className="card-title">{service.name}</h3>
        <p className="card-desc">{service.description}</p>

        <div className="card-bottom-row">
          <div className="card-price-container">
            <span className="price-label">Стоимость:</span>
            <span className="card-price">{Number(service.price).toLocaleString("ru-RU")} ₽</span>
          </div>

          <div className="card-actions">
            <button
              type="button"
              className="card-reviews-btn"
              onClick={onOpenReviews}
              title="Посмотреть отзывы"
            >
              💬 Отзывы
            </button>

            <button
              type="button"
              className={`card-add-btn ${addedNotice ? "success" : ""}`}
              onClick={handleAddToCart}
            >
              {addedNotice ? "✓ В корзине" : "+ В корзину"}
            </button>
          </div>
        </div>

        {errorNotice && <div className="card-error-notice">{errorNotice}</div>}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { formatDuration, formatPrice } from "../utils";
import "./ServiceCard.css";

export default function ServiceCard({ service, onOpenReviews }) {
  const { addToCart, auth } = useShop();
  const navigate = useNavigate();
  const [addedNotice, setAddedNotice] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);

  const isAdmin = auth.user?.role === "admin";

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
  const discountPercent = Number(service.discount_percent) || 0;
  const hasDiscount = discountPercent > 0;
  const rawPrice = Number(service.price) || 0;
  const finalPrice = hasDiscount
    ? Number((rawPrice * (1 - discountPercent / 100)).toFixed(2))
    : rawPrice;
  const stock = service.stock_quantity !== undefined ? Number(service.stock_quantity) : 15;
  const isOutOfStock = stock <= 0;

  return (
    <div className="service-card">
      <div className="card-image-wrap">
        <img src={imgUrl} alt={service.name} className="card-img" loading="lazy" />
        <span className="card-category-badge">{service.category_name}</span>
        {hasDiscount && (
          <span className="card-discount-badge">-{discountPercent}%</span>
        )}
      </div>

      <div className="card-body">
        <div className="card-header-info">
          <div className="card-rating" onClick={onOpenReviews} title="Нажмите, чтобы прочитать отзывы">
            <span className="star-icon">★</span>
            <span className="rating-value">{numRating > 0 ? numRating.toFixed(1) : "—"}</span>
            <span className="reviews-counter">({reviewsCount} отзывов)</span>
          </div>
          <span className="card-duration">⏱ {formatDuration(service.duration)}</span>
        </div>

        <h3 className="card-title">{service.name}</h3>
        <p className="card-desc">{service.description}</p>

        <div className="card-stock-info">
          <span className={`stock-tag ${isOutOfStock ? "stock-out" : ""}`}>
            {isOutOfStock ? "✕ Нет в наличии" : `📦 В наличии: ${stock} шт.`}
          </span>
        </div>

        <div className="card-bottom-row">
          <div className="card-price-container">
            {hasDiscount ? (
              <div className="price-discount-wrapper">
                <span className="old-strikethrough-price">{formatPrice(rawPrice)} ₽</span>
                <span className="card-price discounted-color">{formatPrice(finalPrice)} ₽</span>
              </div>
            ) : (
              <span className="card-price">{formatPrice(rawPrice)} ₽</span>
            )}
          </div>

          <div className="card-actions">
            <button
              type="button"
              className="card-reviews-btn"
              onClick={onOpenReviews}
            >
              Отзывы
            </button>

            {!isAdmin && (
              <button
                type="button"
                className={`card-add-btn ${addedNotice ? "success" : ""} ${isOutOfStock ? "disabled" : ""}`}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {addedNotice ? "✓ В корзине" : isOutOfStock ? "Закончился" : "В корзину"}
              </button>
            )}
          </div>
        </div>

        {errorNotice && (
          <div className="card-error-notice">{errorNotice}</div>
        )}
      </div>
    </div>
  );
}

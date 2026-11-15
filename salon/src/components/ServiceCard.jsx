import { useShop } from "../context/ShopContext";
import "./ServiceCard.css";

export default function ServiceCard({ service }) {
  const { addToCart } = useShop();

  const hasDiscount = service.discount_percent > 0;
  const discountPrice = Math.round(
    service.price * (1 - service.discount_percent / 100)
  );

  return (
    <div className="service-card">
      {hasDiscount && (
        <span className="badge">-{service.discount_percent}%</span>
      )}
      <div className="card-category">{service.category_name}</div>
      <h3 className="card-title">{service.name}</h3>
      <p className="card-desc">{service.description}</p>
      <div className="card-meta">⏱ {service.duration} мин</div>
      <div className="card-price-row">
        {hasDiscount ? (
          <>
            <span className="old-price">{service.price} ₽</span>
            <span className="new-price">{discountPrice} ₽</span>
          </>
        ) : (
          <span className="price">{service.price} ₽</span>
        )}
      </div>
      <button className="add-btn" onClick={() => addToCart(service)}>
        В корзину
      </button>
    </div>
  );
}

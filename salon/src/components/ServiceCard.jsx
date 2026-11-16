import { useShop } from "../context/ShopContext";
import "./ServiceCard.css";

const fallbackImages = {
  1: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&auto=format&fit=crop&q=80",
  2: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=500&auto=format&fit=crop&q=80",
  3: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=500&auto=format&fit=crop&q=80",
  4: "https://images.unsplash.com/photo-1560869713-7d0a29430803?w=500&auto=format&fit=crop&q=80",
  5: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=500&auto=format&fit=crop&q=80",
  6: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80",
  7: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=500&auto=format&fit=crop&q=80",
  8: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=500&auto=format&fit=crop&q=80",
  9: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&auto=format&fit=crop&q=80",
  10: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&auto=format&fit=crop&q=80",
};

export default function ServiceCard({ service }) {
  const { addToCart, auth } = useShop();
  const isAdmin = auth.user?.role === "admin";

  const hasDiscount = service.discount_percent > 0;
  const finalPrice = hasDiscount
    ? Math.round(service.price * (1 - service.discount_percent / 100))
    : service.price;

  const imgUrl = service.image || fallbackImages[service.service_id] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=80";

  return (
    <div className="service-card">
      <div className="card-image-wrap">
        <img src={imgUrl} alt={service.name} className="card-img" loading="lazy" />
        {hasDiscount && (
          <span className="discount-badge">-{service.discount_percent}%</span>
        )}
      </div>

      <div className="card-body">
        <div className="card-cat">{service.category_name}</div>
        <h3 className="card-title">{service.name}</h3>
        <p className="card-desc">{service.description}</p>
        <div className="card-duration">⏱ {service.duration} мин</div>

        <div className="card-price-row">
          {hasDiscount ? (
            <>
              <span className="old-price">{service.price} ₽</span>
              <span className="new-price">{finalPrice} ₽</span>
            </>
          ) : (
            <span className="regular-price">{service.price} ₽</span>
          )}
        </div>

        {!isAdmin && (
          <button className="add-btn" onClick={() => addToCart(service)}>
            В корзину
          </button>
        )}
      </div>
    </div>
  );
}

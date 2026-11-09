import "./ProductCard.css";

function ProductCard({ name, price, image, onAdd }) {
  return (
    <div className="product-card">
      <img src={image} alt={name} className="product-image" />
      <h2 className="product-name">{name}</h2>
      <p className="product-price">{price} ₽</p>
      <button className="add-btn" onClick={onAdd}>
        В корзину
      </button>
    </div>
  );
}

export default ProductCard;

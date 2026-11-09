import { useShop } from "../context/ShopContext";
import ProductCard from "../ProductCard";
import "./Catalog.css";

// Список товаров
const products = [
  { id: 1, name: "Кроссовки Nike", price: 7990, image: "https://yandex-images.clstorage.net/f4XZH7235/0bff33wd/EKLxHIYMX5hw7OrxxvOW_H4iy_ijky6vMxKaKlMYkR1LakMlzljB5AfRqefTI-Jcb0Z2QTvCNXMCADFfoVc5CVHWoByize-chbj_ZWLHJnxfI0_8Q4JObsQBiGkFyxO_LSjgt7_8JBEitXhDpyUFXUzTEceepJI19QDGziYELtxxYPFbcegMqiBf6gH05Bas3cWq-HNjX5wH4yi7t2hwLK_KIxcevkZjcoQvwiZWFzgMYRDGn1QzVdQS5L-HpY4MwVEiicJofIkjncggBQf2H73VWhrwQc6uNXBKu7Tb835sqRLEHnxUk0GWzrBFdeYLDxJxZJ-kcvXn8LdtlrYM7wDxstoz-ywKIl76sASVR4zdxvqI8bGt3OVxSKmG6-AvPsuihj6MtFHBlJxyFhYFu93xAacc5VAEFxJ3D8Unft3yw3AZM8u8K-FtWHK0Rkdvb_RKGOFD_V5EoGvaZtqy7V2KwFUcz6agEBRv4DUW5Ck8YwH0vHawhgZBhH3kln7uQSCCy0A4L8oQvppy90Tnv23ke3njgG4v91M5K_WIc18-mNO2H1xG4kFnv8LFFIXYPsPxlKy2YnbW8Qd9lHUd7WJi80tAeO6b0X9o08VV9k8PN6haIHPPXNVAaziVOtLuf4pClj6_FZABp-zSlvRFyE-wQ2ZOlJC2REFlPVTG7t8CgqMbk7hduTPvC4JEpUTurSUoKjFQXiyHoArptyoDPJ36IaWczGbAQ4ac4dY31Qu_82M1LLfhJdchJwzVR14fcfPiuVA4vQngL-thp2Tm7G13iRjTgu_fplAa-rT4QfyfWeB3vL0mEYA2rpH2J7YLzyAgVw5GMMamUGdvdtZMLyCC0KqBq_0LkIzaINSWZW28B0rYohO8bCey-SmXGWGufcrRtA1PpsDipA2wVgZEad2gcYb_9FI2pOLXX4Ul7i7hQXAYM7nPqHGvm_I1t2ceHndJC_IRPHyVgtqJtPgTw" },
  { id: 2, name: "Футболка Adidas", price: 2490, image: "https://basket-43.wbbasket.ru/vol11163/part1116360/1116360164/images/big/1.webp" },
  { id: 3, name: "Рюкзак Puma", price: 3990, image: "https://avatars.mds.yandex.net/get-mpic/18505141/2a0000019b9712985692cf72ca6264537a04/orig" },
  { id: 4, name: "Часы Casio", price: 5490, image: "https://avatars.mds.yandex.net/get-mpic/5221929/2a0000019152d6a2ffed75603d31357ea56b/orig" },
  { id: 5, name: "Кепка New Era", price: 1990, image: "https://avatars.mds.yandex.net/get-mpic/7690783/img_id5888161202453077206.jpeg/orig" },
];

export default function Catalog() {
  const { addToCart } = useShop();

  function handleAdd(product) {
    addToCart(product);
  }

  return (
    <div className="catalog">
      <h1>Каталог товаров</h1>
      <div className="cards-container">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            name={p.name}
            price={p.price}
            image={p.image}
            onAdd={() => handleAdd(p)}
          />
        ))}
      </div>
    </div>
  );
}

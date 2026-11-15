import "./CategoryFilter.css";

export default function CategoryFilter({ categories, selected, onToggle }) {
  return (
    <aside className="aside">
      <h3>Категории</h3>
      {categories.map((cat) => (
        <label key={cat.id} className="cat-item">
          <input
            type="checkbox"
            checked={selected.includes(cat.id)}
            onChange={() => onToggle(cat.id)}
          />
          <span>{cat.name}</span>
        </label>
      ))}
    </aside>
  );
}

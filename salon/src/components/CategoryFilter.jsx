import "./CategoryFilter.css";

export default function CategoryFilter({ categories, selected, onToggle }) {
  return (
    <aside className="aside-filter">
      <h3>Категории</h3>
      <div className="cat-list">
        {categories.map((cat) => (
          <label key={cat.category_id} className="cat-item">
            <input
              type="checkbox"
              checked={selected.includes(cat.category_id)}
              onChange={() => onToggle(cat.category_id)}
            />
            <span>{cat.name}</span>
          </label>
        ))}
      </div>
    </aside>
  );
}

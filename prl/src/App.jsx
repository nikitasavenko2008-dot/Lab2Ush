import { Routes, Route } from "react-router-dom";
import { useShop } from "./context/ShopContext";
import Navbar from "./components/Navbar";
import Catalog from "./pages/Catalog";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import "./App.css";

function App() {
  const { isDark } = useShop();

  return (
    <div className={isDark ? "app dark" : "app"}>
      <Navbar />
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;

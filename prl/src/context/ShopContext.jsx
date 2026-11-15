import { createContext, useContext, useState, useReducer, useEffect } from "react";

const ShopContext = createContext();

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const exists = state.find((item) => item.id === action.payload.id);
      if (exists) {
        return state.map((item) =>
          item.id === action.payload.id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...state, { ...action.payload, qty: 1 }];
    }
    case "REMOVE_ITEM":
      return state.filter((item) => item.id !== action.payload);
    case "INCREASE_QTY":
      return state.map((item) =>
        item.id === action.payload ? { ...item, qty: item.qty + 1 } : item
      );
    case "DECREASE_QTY":
      return state.map((item) =>
        item.id === action.payload && item.qty > 1
          ? { ...item, qty: item.qty - 1 }
          : item
      );
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

export function ShopProvider({ children }) {
  const [cart, cartDispatch] = useReducer(cartReducer, []);

  function getSavedTheme() {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  }

  const [isDark, setIsDark] = useState(getSavedTheme);

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  function addToCart(product) {
    cartDispatch({ type: "ADD_ITEM", payload: product });
  }

  function removeFromCart(id) {
    cartDispatch({ type: "REMOVE_ITEM", payload: id });
  }

  function increaseQty(id) {
    cartDispatch({ type: "INCREASE_QTY", payload: id });
  }

  function decreaseQty(id) {
    cartDispatch({ type: "DECREASE_QTY", payload: id });
  }

  function clearCart() {
    cartDispatch({ type: "CLEAR" });
  }

  function toggleTheme() {
    setIsDark(!isDark);
  }

  const value = {
    cart,
    addToCart,
    removeFromCart,
    increaseQty,
    decreaseQty,
    clearCart,
    isDark,
    toggleTheme,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  return useContext(ShopContext);
}

import { createContext, useContext, useState, useReducer } from "react";

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
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

export function ShopProvider({ children }) {
  const [cart, cartDispatch] = useReducer(cartReducer, []);
  const [isDark, setIsDark] = useState(false);

  function addToCart(product) {
    cartDispatch({ type: "ADD_ITEM", payload: product });
  }

  function removeFromCart(id) {
    cartDispatch({ type: "REMOVE_ITEM", payload: id });
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
    clearCart,
    isDark,
    toggleTheme,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  return useContext(ShopContext);
}

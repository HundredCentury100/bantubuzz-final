import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('bantubuzz_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
        localStorage.removeItem('bantubuzz_cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bantubuzz_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item) => {
    // item structure: { package_id, creator_id, creator_name, title, description, price, deliverables }
    const existingItem = cartItems.find(i => i.package_id === item.package_id);

    if (existingItem) {
      toast.error('This package is already in your cart');
      return;
    }

    setCartItems(prev => [...prev, { ...item, added_at: new Date().toISOString() }]);
    toast.success('Package added to cart');
  };

  const removeFromCart = (package_id) => {
    setCartItems(prev => prev.filter(item => item.package_id !== package_id));
    toast.success('Package removed from cart');
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('bantubuzz_cart');
    toast.success('Cart cleared');
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price || 0), 0);
  };

  const getCartCount = () => {
    return cartItems.length;
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartCount,
    isCartOpen,
    openCart,
    closeCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

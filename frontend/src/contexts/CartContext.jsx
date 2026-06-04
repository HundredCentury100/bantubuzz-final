import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const isBrandUser = user?.user_type === 'brand';
  const isCreatorUser = user?.user_type === 'creator';
  const storageKey = isBrandUser && user?.id
    ? `bantubuzz_cart_brand_${user.id}`
    : (!isAuthenticated ? 'bantubuzz_cart_guest' : null);

  // Load cart from localStorage when the signed-in cart owner changes.
  useEffect(() => {
    setCartLoaded(false);

    if (isCreatorUser || !storageKey) {
      setCartItems([]);
      setIsCartOpen(false);
      localStorage.removeItem('bantubuzz_cart');
      setCartLoaded(true);
      return;
    }

    const legacyCart = localStorage.getItem('bantubuzz_cart');
    const guestCart = isBrandUser ? localStorage.getItem('bantubuzz_cart_guest') : null;
    const savedCart = localStorage.getItem(storageKey) || guestCart || legacyCart;

    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
        localStorage.setItem(storageKey, savedCart);
        localStorage.removeItem('bantubuzz_cart');
        if (isBrandUser) {
          localStorage.removeItem('bantubuzz_cart_guest');
        }
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
        localStorage.removeItem(storageKey);
        localStorage.removeItem('bantubuzz_cart');
        setCartItems([]);
      }
    } else {
      setCartItems([]);
    }
    setCartLoaded(true);
  }, [storageKey, isBrandUser, isCreatorUser]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!cartLoaded || !storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(cartItems));
  }, [cartItems, cartLoaded, storageKey]);

  const addToCart = (item) => {
    if (isCreatorUser) {
      toast.error('Only brands can book creator packages');
      return;
    }

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
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    localStorage.removeItem('bantubuzz_cart');
    localStorage.removeItem('bantubuzz_cart_guest');
    if (!isCreatorUser) {
      toast.success('Cart cleared');
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price);
      return total + (isNaN(price) ? 0 : price);
    }, 0);
  };

  const getCartCount = () => {
    return cartItems.length;
  };

  const openCart = () => {
    if (isCreatorUser) return;
    setIsCartOpen(true);
  };
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

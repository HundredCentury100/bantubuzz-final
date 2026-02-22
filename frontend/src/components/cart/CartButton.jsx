import { useCart } from '../../contexts/CartContext';
import { ShoppingCart } from 'lucide-react';

export default function CartButton() {
  const { getCartCount, openCart } = useCart();
  const count = getCartCount();

  if (count === 0) return null;

  return (
    <button
      onClick={openCart}
      className="fixed bottom-6 right-6 z-50 bg-primary text-white rounded-full p-4 shadow-lg hover:bg-primary-dark transition-all transform hover:scale-110 flex items-center gap-2"
      aria-label="Open cart"
    >
      <ShoppingCart className="w-6 h-6" />
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
        {count}
      </span>
    </button>
  );
}

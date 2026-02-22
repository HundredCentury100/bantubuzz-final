import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { X, Trash2, ShoppingCart, MessageCircle } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../hooks/useAuth';

export default function CartModal() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { cartItems, removeFromCart, clearCart, getCartTotal, isCartOpen, closeCart } = useCart();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to complete your purchase');
      closeCart();
      localStorage.setItem('checkout_pending', 'true');
      navigate('/login');
      return;
    }

    if (user?.user_type !== 'brand') {
      toast.error('Only brands can book creator packages');
      return;
    }

    // Navigate to checkout page — bookings are created AFTER payment selection
    closeCart();
    navigate('/checkout');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={closeCart}
      />

      {/* Modal */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
            <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
              {cartItems.length}
            </span>
          </div>
          <button
            onClick={closeCart}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingCart className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-sm mt-2">Browse creators and add packages to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.package_id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">by {item.creator_name}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.package_id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove from cart"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                  )}

                  {item.deliverables && item.deliverables.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 font-medium mb-1">Deliverables:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {item.deliverables.slice(0, 3).map((deliverable, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-primary">•</span>
                            <span className="line-clamp-1">{deliverable}</span>
                          </li>
                        ))}
                        {item.deliverables.length > 3 && (
                          <li className="text-gray-400">+{item.deliverables.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(item.price)}</span>
                  </div>
                </div>
              ))}

              {/* Negotiate Custom Package Option */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-dashed border-primary/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Need a custom package?</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Contact creators directly to negotiate a custom package that fits your needs
                    </p>
                    <button
                      onClick={() => {
                        closeCart();
                        navigate('/brand/messages');
                      }}
                      className="text-sm font-medium text-primary hover:text-primary-dark transition"
                    >
                      Go to Messages →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-700 font-medium">Total:</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(getCartTotal())}</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCheckout}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
              >
                Proceed to Checkout
              </button>

              <button
                onClick={clearCart}
                className="w-full bg-white text-gray-700 py-2 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition"
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './index.css'
import { AuthProvider } from './hooks/useAuth'
import { NotificationProvider } from './contexts/NotificationContext'
import { MessagingProvider } from './contexts/MessagingContext'
import { CartProvider } from './contexts/CartContext'
import CartButton from './components/cart/CartButton'
import CartModal from './components/cart/CartModal'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <HelmetProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CartProvider>
              <NotificationProvider>
                <MessagingProvider>
                  <App />
                  <CartButton />
                  <CartModal />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#1F2937', // Brand color: dark (Navy)
                      color: '#F3F4F6',      // Gray-100
                    },
                    success: {
                      iconTheme: {
                        primary: '#ccdb53',   // Brand color: primary (Olive-Green)
                        secondary: '#1F2937', // Brand color: dark (Navy)
                      },
                    },
                  }}
                />
                </MessagingProvider>
              </NotificationProvider>
            </CartProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)

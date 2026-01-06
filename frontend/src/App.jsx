import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import RegisterCreator from './pages/RegisterCreator';
import RegisterBrand from './pages/RegisterBrand';
import VerifyOTP from './pages/VerifyOTP';
import CreatorDashboard from './pages/CreatorDashboard';
import CreatorProfileEdit from './pages/CreatorProfileEdit';
import PackageManagement from './pages/PackageManagement';
import PackageForm from './pages/PackageForm';
import BrandDashboard from './pages/BrandDashboard';
import BrandProfileEdit from './pages/BrandProfileEdit';
import Creators from './pages/Creators';
import CreatorProfile from './pages/CreatorProfile';
import Packages from './pages/Packages';
import PackageDetails from './pages/PackageDetails';
import BrowsePackages from './pages/BrowsePackages';
import BrowseCreators from './pages/BrowseCreators';
import Bookings from './pages/Bookings';
import BookingDetails from './pages/BookingDetails';
import Payment from './pages/Payment';
import PaymentReturn from './pages/PaymentReturn';
import Messages from './pages/Messages';
import Campaigns from './pages/Campaigns';
import CampaignForm from './pages/CampaignForm';
import CampaignDetails from './pages/CampaignDetails';
import BrowseCampaigns from './pages/BrowseCampaigns';
import CreatorCampaignDetails from './pages/CreatorCampaignDetails';
import Collaborations from './pages/Collaborations';
import CollaborationDetails from './pages/CollaborationDetails';
import ReviewForm from './pages/ReviewForm';
import NotFound from './pages/NotFound';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Admin Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminCashouts from './pages/admin/Cashouts';
import AdminFeaturedCreators from './pages/admin/FeaturedCreators';
import AdminCategories from './pages/AdminCategories';
import AdminCollaborations from './pages/AdminCollaborations';
import AdminBookings from './pages/AdminBookings';
import AdminCampaigns from './pages/AdminCampaigns';
import AdminPayments from './pages/AdminPayments';
import AdminReviews from './pages/AdminReviews';

// Wallet Pages
import Wallet from './pages/Wallet';
import CashoutRequest from './pages/CashoutRequest';
import BrandWallet from './pages/BrandWallet';

// Public Pages
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import SuccessStories from './pages/SuccessStories';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Protected Route Component
const ProtectedRoute = ({ children, requiredType }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredType && user?.user_type !== requiredType) {
    // Redirect to appropriate dashboard
    return <Navigate to={`/${user?.user_type}/dashboard`} replace />;
  }

  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={`/${user?.user_type}/dashboard`} replace />;
  }

  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  if (!token || !user.is_admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/creators" element={<Creators />} />
      <Route path="/creators/:id" element={<CreatorProfile />} />
      <Route path="/packages" element={<Packages />} />
      <Route path="/packages/:id" element={<PackageDetails />} />

      {/* Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register/creator"
        element={
          <PublicRoute>
            <RegisterCreator />
          </PublicRoute>
        }
      />
      <Route
        path="/register/brand"
        element={
          <PublicRoute>
            <RegisterBrand />
          </PublicRoute>
        }
      />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Creator Protected Routes */}
      <Route
        path="/creator/dashboard"
        element={
          <ProtectedRoute requiredType="creator">
            <CreatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/profile/edit"
        element={
          <ProtectedRoute requiredType="creator">
            <CreatorProfileEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/packages"
        element={
          <ProtectedRoute requiredType="creator">
            <PackageManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/packages/create"
        element={
          <ProtectedRoute requiredType="creator">
            <PackageForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/packages/edit/:id"
        element={
          <ProtectedRoute requiredType="creator">
            <PackageForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/campaigns"
        element={
          <ProtectedRoute requiredType="creator">
            <BrowseCampaigns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/campaigns/:id"
        element={
          <ProtectedRoute requiredType="creator">
            <CreatorCampaignDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/collaborations"
        element={
          <ProtectedRoute requiredType="creator">
            <Collaborations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/collaborations/:id"
        element={
          <ProtectedRoute requiredType="creator">
            <CollaborationDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/bookings"
        element={
          <ProtectedRoute requiredType="creator">
            <Bookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet"
        element={
          <ProtectedRoute requiredType="creator">
            <Wallet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet/cashout"
        element={
          <ProtectedRoute requiredType="creator">
            <CashoutRequest />
          </ProtectedRoute>
        }
      />

      {/* Brand Protected Routes */}
      <Route
        path="/brand/dashboard"
        element={
          <ProtectedRoute requiredType="brand">
            <BrandDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/profile/edit"
        element={
          <ProtectedRoute requiredType="brand">
            <BrandProfileEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/campaigns"
        element={
          <ProtectedRoute requiredType="brand">
            <Campaigns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/campaigns/create"
        element={
          <ProtectedRoute requiredType="brand">
            <CampaignForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/campaigns/:id/edit"
        element={
          <ProtectedRoute requiredType="brand">
            <CampaignForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/campaigns/:id"
        element={
          <ProtectedRoute requiredType="brand">
            <CampaignDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/browse/packages"
        element={
          <ProtectedRoute requiredType="brand">
            <BrowsePackages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/browse/creators"
        element={
          <ProtectedRoute requiredType="brand">
            <BrowseCreators />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/bookings"
        element={
          <ProtectedRoute requiredType="brand">
            <Bookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/collaborations"
        element={
          <ProtectedRoute requiredType="brand">
            <Collaborations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/collaborations/:id"
        element={
          <ProtectedRoute requiredType="brand">
            <CollaborationDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/collaborations/:id/review"
        element={
          <ProtectedRoute requiredType="brand">
            <ReviewForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/brand/wallet"
        element={
          <ProtectedRoute requiredType="brand">
            <BrandWallet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings/:id/payment"
        element={
          <ProtectedRoute requiredType="brand">
            <Payment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/return"
        element={<PaymentReturn />}
      />

      {/* Common Protected Routes */}
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings/:id"
        element={
          <ProtectedRoute>
            <BookingDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <Bookings />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/cashouts"
        element={
          <AdminRoute>
            <AdminCashouts />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/featured"
        element={
          <AdminRoute>
            <AdminFeaturedCreators />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <AdminRoute>
            <AdminCategories />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/collaborations"
        element={
          <AdminRoute>
            <AdminCollaborations />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <AdminRoute>
            <AdminBookings />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/campaigns"
        element={
          <AdminRoute>
            <AdminCampaigns />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <AdminRoute>
            <AdminPayments />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reviews"
        element={
          <AdminRoute>
            <AdminReviews />
          </AdminRoute>
        }
      />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Public Info Pages */}
      <Route path="/about" element={<About />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/success-stories" element={<SuccessStories />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

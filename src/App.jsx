import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginModal from './pages/Login.jsx';
import SignupModal from './pages/Signup.jsx';
import ForgotPasswordModal from './pages/ForgotPassword.jsx';
import VerifyEmailModal from './pages/VerifyEmail.jsx';
import Dashboard from './pages/Dashboard.jsx';

import RequestForm from './pages/RequestForm.jsx';
import CashRequestForm from './pages/CashRequestForm.jsx';
import ProductRequestForm from './pages/ProductRequestForm.jsx';
import DonationForm from './pages/DonationForm.jsx';
import CashDonationForm from './pages/CashDonationForm.jsx';
import ProductDonationForm from './pages/ProductDonationForm.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ProductBrowse from './pages/ProductBrowse.jsx';
import Profile from './pages/Profile.jsx';
import About from './pages/About.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import BrowseDonations from './pages/BrowseDonations.jsx';
import BiddingGallery from './pages/BiddingGallery.jsx';
import Contact from './pages/Contact.jsx';
import Help from './pages/Help.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';
import VerifyDocuments from './pages/VerifyDocuments.jsx';
import StripeMockCheckout from './pages/StripeMockCheckout.jsx';
import StripeSuccess from './pages/StripeSuccess.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

// ScrollToTop component to reset scroll position on navigation
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Small delay to ensure the DOM has updated after navigation
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      // Also reset scroll for any internal scrollable containers
      const scrollableContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, .overflow-y-scroll');
      scrollableContainers.forEach(container => {
        container.scrollTo(0, 0);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}

function SignupModalTrigger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isSignupOpen = searchParams.get('signup') === 'true';

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('signup');
    setSearchParams(newParams);
  };

  return <SignupModal isOpen={isSignupOpen} onClose={handleClose} />;
}

function LoginModalTrigger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoginOpen = searchParams.get('login') === 'true';

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('login');
    setSearchParams(newParams);
  };

  return <LoginModal isOpen={isLoginOpen} onClose={handleClose} />;
}

function ForgotPasswordModalTrigger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isForgotOpen = searchParams.get('forgot') === 'true';

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('forgot');
    setSearchParams(newParams);
  };

  return <ForgotPasswordModal isOpen={isForgotOpen} onClose={handleClose} />;
}

function VerifyEmailModalTrigger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isVerifyOpen = searchParams.get('verify') === 'true';

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('verify');
    newParams.delete('email'); // Clean up email as well
    setSearchParams(newParams);
  };

  return <VerifyEmailModal isOpen={isVerifyOpen} onClose={handleClose} />;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <SignupModalTrigger />
      <LoginModalTrigger />
      <ForgotPasswordModalTrigger />
      <VerifyEmailModalTrigger />
      <Routes>
        {/* Public Routes with Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/browse" element={<BrowseDonations />} />
          <Route path="/bidding-gallery" element={<BiddingGallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<Help />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>

        {/* Auth Routes (modals) */}
        <Route path="/login" element={<Navigate to="/?login=true" replace />} />
        <Route path="/signup" element={<Navigate to="/?signup=true" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/?forgot=true" replace />} />
        <Route path="/verify-email" element={<Navigate to="/?verify=true" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/verify-documents"
          element={
            <ProtectedRoute>
              <VerifyDocuments />
            </ProtectedRoute>
          }
        />

        {/* Bidding - Redirect to bidding-gallery */}
        <Route path="/bidding" element={<Navigate to="/bidding-gallery" replace />} />

        {/* Protected Routes - Require User Authentication */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/request-donation"
          element={
            <ProtectedRoute>
              <RequestForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cash-request"
          element={
            <ProtectedRoute>
              <CashRequestForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/product-request"
          element={
            <ProtectedRoute>
              <ProductRequestForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donate"
          element={
            <ProtectedRoute>
              <DonationForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cash-donation"
          element={
            <ProtectedRoute>
              <CashDonationForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/product-donation"
          element={
            <ProtectedRoute>
              <ProductDonationForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/browse-products"
          element={
            <ProtectedRoute>
              <ProductBrowse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/admin-panel"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stripe-checkout"
          element={
            <ProtectedRoute>
              <StripeMockCheckout />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stripe-success/:donationId"
          element={
            <ProtectedRoute>
              <StripeSuccess />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HeartHandshake,
  HandHeart,
  Heart,
  Package,
  Gavel,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Search,
  X,
  Filter,
  ArrowRight,
  Shield
} from "lucide-react";
import { supabase } from "../supabaseClient";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import SkeletonLoader from "../components/SkeletonLoader";
import { getErrorMessage } from "../utils/errorHandler";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import VerificationFormModal from "../components/VerificationFormModal";
import CustomDropdown from "../components/CustomDropdown";

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [hasPendingDonation, setHasPendingDonation] = useState(false);
  const [hasPendingProductRequest, setHasPendingProductRequest] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedNotification, setExpandedNotification] = useState(null);
  const [historyTab, setHistoryTab] = useState("stats"); // 'stats', 'donations', 'requests'
  const [donationHistory, setDonationHistory] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  const [donationSearch, setDonationSearch] = useState("");
  const [donationFilter, setDonationFilter] = useState("all"); // all, cash, product
  const [donationStatusFilter, setDonationStatusFilter] = useState("all"); // all, approved, pending, rejected
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState("all"); // all, cash, product
  const [requestStatusFilter, setRequestStatusFilter] = useState("all"); // all, approved, pending, rejected
  const [showDonationFilters, setShowDonationFilters] = useState(false);
  const [showRequestFilters, setShowRequestFilters] = useState(false);
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalDonationAmount: 0,
    totalRequests: 0,
    approvedDonations: 0,
    rejectedDonations: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    pendingDonations: 0,
    pendingRequests: 0,
    // Product stats
    totalProductDonations: 0,
    totalProductRequests: 0,
    approvedProductDonations: 0,
    rejectedProductDonations: 0,
    approvedProductRequests: 0,
    rejectedProductRequests: 0,
    pendingProductDonations: 0,
    pendingProductRequests: 0,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  // Handle URL params to switch tabs and scroll to section
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');

    if (tab === 'donations' || tab === 'requests' || tab === 'stats') {
      setHistoryTab(tab);

      // Scroll to history section after a short delay to ensure DOM is updated
      setTimeout(() => {
        const historySection = document.getElementById('history-section');
        if (historySection) {
          historySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // No tab parameter - reset to stats tab and scroll to top
      setHistoryTab('stats');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [location.search]);

  // Refresh notifications periodically and when tab becomes visible
  useEffect(() => {
    if (!currentUser) return;

    const refreshNotifications = () => {
      loadNotifications(currentUser.id);
    };

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Refresh every 30 seconds
    const interval = setInterval(refreshNotifications, 30000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [currentUser]);

  // Debug: Log notification state
  useEffect(() => {
    console.log("Notification bell should be visible. Unread count:", unreadCount);
  }, [unreadCount]);

  const loadUserData = async () => {
    if (window.location.pathname !== "/dashboard") return;
    const user = localStorage.getItem("currentUser");
    if (!user) {
      navigate("/login");
      return;
    }

    const userData = JSON.parse(user);

    try {
      // Load user data
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userData.id)
        .single();

      if (error) throw error;

      localStorage.setItem("currentUser", JSON.stringify(data));
      setCurrentUser(data);

      // Check if user has pending verification request
      const { data: verificationData } = await supabase
        .from("verification_requests")
        .select("status")
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setVerificationStatus(verificationData?.status || null);

      // Check for pending cash request
      const { data: pendingRequests } = await supabase
        .from("cash_requests")
        .select("id, status")
        .eq("user_id", userData.id)
        .eq("status", "pending");
      setHasPendingRequest(!!(pendingRequests && pendingRequests.length > 0));

      // Check for pending product requests
      const { data: pendingProductRequests } = await supabase
        .from("product_requests")
        .select("status")
        .eq("user_id", data.id)
        .eq("status", "pending");

      setHasPendingProductRequest(!!(pendingProductRequests && pendingProductRequests.length > 0));

      // Check for pending cash donation
      const { data: pendingDonations } = await supabase
        .from("cash_donations")
        .select("id, status")
        .eq("user_id", userData.id)
        .eq("status", "pending");
      setHasPendingDonation(!!(pendingDonations && pendingDonations.length > 0));

      // Load notifications - ensure user_id is the correct type
      const userId = typeof userData.id === 'string' ? parseInt(userData.id) : userData.id;
      console.log("Loading notifications for user:", userId, "Original:", userData.id);
      loadNotifications(userId);


      // Load history
      loadHistory(userId);
    } catch (error) {
      console.error("Error:", error);
      setCurrentUser(userData);
    }
  };

  const loadHistory = async (userId) => {
    try {
      // Load cash donation history
      const { data: cashDonations, error: cashDonationsError } = await supabase
        .from("cash_donations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Load product donation history
      const { data: productDonations, error: productDonationsError } = await supabase
        .from("product_donations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Load cash request history
      const { data: cashRequests, error: cashRequestsError } = await supabase
        .from("cash_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Load product request history
      const { data: productRequests, error: productRequestsError } = await supabase
        .from("product_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Combine all donations for history display
      const allDonations = [
        ...(cashDonations || []).map(d => ({ ...d, type: 'cash' })),
        ...(productDonations || []).map(d => ({ ...d, type: 'product' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setDonationHistory(allDonations);

      // Combine all requests for history display
      const allRequests = [
        ...(cashRequests || []).map(r => ({ ...r, type: 'cash' })),
        ...(productRequests || []).map(r => ({ ...r, type: 'product' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setRequestHistory(allRequests);

      // Calculate combined stats
      const cashDonationsList = cashDonations || [];
      const productDonationsList = productDonations || [];
      const cashRequestsList = cashRequests || [];
      const productRequestsList = productRequests || [];

      // Cash donation stats
      const totalCashDonations = cashDonationsList.length;
      const totalDonationAmount = cashDonationsList
        .filter((d) => d.status === "approved")
        .reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const approvedCashDonations = cashDonationsList.filter((d) => d.status === "approved").length;
      const rejectedCashDonations = cashDonationsList.filter((d) => d.status === "rejected").length;
      const pendingCashDonations = cashDonationsList.filter((d) => d.status === "pending").length;

      // Product donation stats
      const totalProductDonations = productDonationsList.length;
      const approvedProductDonations = productDonationsList.filter((d) => d.status === "approved").length;
      const rejectedProductDonations = productDonationsList.filter((d) => d.status === "rejected").length;
      const pendingProductDonations = productDonationsList.filter((d) => d.status === "pending").length;

      // Cash request stats
      const totalCashRequests = cashRequestsList.length;
      const approvedCashRequests = cashRequestsList.filter((r) => r.status === "approved").length;
      const rejectedCashRequests = cashRequestsList.filter((r) => r.status === "rejected").length;
      const pendingCashRequests = cashRequestsList.filter((r) => r.status === "pending").length;

      // Product request stats
      const totalProductRequests = productRequestsList.length;
      const approvedProductRequests = productRequestsList.filter((r) => r.status === "approved").length;
      const rejectedProductRequests = productRequestsList.filter((r) => r.status === "rejected").length;
      const pendingProductRequests = productRequestsList.filter((r) => r.status === "pending").length;

      // Combined totals
      const totalDonations = totalCashDonations + totalProductDonations;
      const totalRequests = totalCashRequests + totalProductRequests;
      const approvedDonations = approvedCashDonations + approvedProductDonations;
      const rejectedDonations = rejectedCashDonations + rejectedProductDonations;
      const pendingDonations = pendingCashDonations + pendingProductDonations;
      const approvedRequests = approvedCashRequests + approvedProductRequests;
      const rejectedRequests = rejectedCashRequests + rejectedProductRequests;
      const pendingRequests = pendingCashRequests + pendingProductRequests;

      setStats({
        totalDonations,
        totalDonationAmount,
        totalRequests,
        approvedDonations,
        rejectedDonations,
        approvedRequests,
        rejectedRequests,
        pendingDonations,
        pendingRequests,
        // Product stats
        totalProductDonations,
        totalProductRequests,
        approvedProductDonations,
        rejectedProductDonations,
        approvedProductRequests,
        rejectedProductRequests,
        pendingProductDonations,
        pendingProductRequests,
      });
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const loadNotifications = async (userId) => {

    try {
      console.log("Loading notifications for user_id:", userId, "Type:", typeof userId);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading notifications:", error);
        // If table doesn't exist, just log and continue
        if (error.code === "PGRST116" || error.message.includes("does not exist")) {
          console.log("Notifications table not created yet. Please run the SQL from NOTIFICATIONS_SETUP.md");
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        throw error;
      }

      console.log("Notifications query result:", data);
      setNotifications(data || []);
      const unread = (data || []).filter((n) => !n.is_read).length;
      setUnreadCount(unread);
      console.log("Notifications loaded:", data?.length || 0, "Unread:", unread);
    } catch (error) {
      console.error("Error loading notifications:", error);
      // Set empty state on error so UI still works
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Filter donations derived directly from state (eliminates flicker bugs)
  const filteredDonations = useMemo(() => {
    let filtered = [...donationHistory];

    if (donationFilter !== "all") {
      filtered = filtered.filter((d) => d.type === donationFilter);
    }

    if (donationStatusFilter !== "all") {
      filtered = filtered.filter((d) => d.status === donationStatusFilter);
    }

    if (donationSearch.trim()) {
      const search = donationSearch.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          (d.type === "cash" && d.amount && d.amount.toString().includes(search)) ||
          (d.type === "product" && d.product_name && d.product_name.toLowerCase().includes(search)) ||
          (d.category && d.category.toLowerCase().includes(search)) ||
          (d.message && d.message.toLowerCase().includes(search)) ||
          (d.description && d.description.toLowerCase().includes(search))
      );
    }
    return filtered;
  }, [donationHistory, donationFilter, donationStatusFilter, donationSearch]);

  // Filter requests derived directly from state
  const filteredRequests = useMemo(() => {
    let filtered = [...requestHistory];

    if (requestFilter !== "all") {
      filtered = filtered.filter((r) => r.type === requestFilter);
    }

    if (requestStatusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === requestStatusFilter);
    }

    if (requestSearch.trim()) {
      const search = requestSearch.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.type === "cash" && r.amount && r.amount.toString().includes(search)) ||
          (r.type === "product" && r.product_name && r.product_name.toLowerCase().includes(search)) ||
          (r.category && r.category.toLowerCase().includes(search)) ||
          (r.description && r.description.toLowerCase().includes(search)) ||
          (r.reason && r.reason.toLowerCase().includes(search))
      );
    }
    return filtered;
  }, [requestHistory, requestFilter, requestStatusFilter, requestSearch]);

  const markAllAsRead = async () => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUser.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleRequestClick = async () => {
    try {
      // Fetch latest status to be 100% sure
      const { data, error } = await supabase
        .from("users")
        .select("is_verified")
        .eq("id", currentUser.id)
        .single();

      if (data?.is_verified) {
        // Update local state and storage too
        const updatedUser = { ...currentUser, is_verified: true };
        setCurrentUser(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        navigate("/request-donation");
      } else {
        setShowVerificationForm(true);
      }
    } catch (err) {
      console.error("Error checking verification status:", err);
      // Fallback to current state
      if (!currentUser.is_verified) {
        setShowVerificationForm(true);
      } else {
        navigate("/request-donation");
      }
    }
  };

  const handleDonateClick = async () => {

    navigate("/donate");
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  if (!currentUser) {
    return (
      <LoadingSpinner size="large" message="Loading dashboard..." fullScreen={true} />
    );
  }

  // Determine button text and notice
  let buttonText = "Verify Documents";
  let noticeText = "⚠️ You need to verify your documents first";

  if (hasPendingRequest) {
    buttonText = "Request Pending";
    noticeText = "⏳ Your cash request is pending admin review";
  } else if (verificationStatus === "pending") {
    buttonText = "Verification Pending";
    noticeText = "⏳ Your verification request is being reviewed by admin";
  } else if (verificationStatus === "rejected") {
    buttonText = "Resubmit Documents";
    noticeText = "❌ Your verification was rejected. Please resubmit.";
  } else if (currentUser.is_verified) {
    buttonText = "Request Now";
    noticeText = null;
  }

  const donationButtonText = hasPendingDonation ? "Donation Pending" : "Donate Now";

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in pt-20">
      <AuthenticatedNavbar />

      {/* Welcome banner - Full Width */}
      <section className="relative mb-10 overflow-hidden min-h-[420px] flex items-center shadow-md border-b border-gray-100">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/assets/images/dashboard_hero_heart.png')",
          }}
        />
        <div className="absolute inset-0 bg-primary-900/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-800/60 to-transparent" />

        <div className="relative w-full max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-8 py-10 sm:py-16 z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full border border-white/20 text-sm font-medium mb-6 backdrop-blur-md">
              <Heart className="w-4 h-4 text-[#1db5f4]" fill="currentColor" />
              <span>Making a difference together</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-outfit tracking-tight text-white mb-6 drop-shadow-sm">
              Share4Good
            </h1>

            <p className="text-lg text-white/90 max-w-xl mb-10 leading-relaxed font-outfit">
              Connect with your community. Donate products, contribute cash,
              or bid on items to support those in need.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleDonateClick}
                className="bg-[#1db5f4] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#159bd4] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-cyan-500/25"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-8 pb-8">
        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 px-2">
          {/* Request Donation Card */}
          <div
            onClick={handleRequestClick}
            className="group relative bg-white rounded-[2rem] p-6 transition-all duration-500 hover:-translate-y-2 border border-blue-50/50 shadow-xl shadow-blue-900/5 overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-2xl hover:border-[#124074]/20"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative mb-3">
              <HandHeart className="w-10 h-10 text-[#124074] stroke-[1.2] transition-all duration-500 group-hover:scale-110" />
            </div>

            <div className="relative flex-grow">
              <h3 className="text-2xl font-bold font-outfit text-[#124074] mb-3 tracking-tight">Need Help?</h3>
              <p className="text-[#124074]/60 leading-relaxed font-medium mb-5">
                Submit a request for assistance or essential products smoothly and securely.
              </p>
            </div>

            <div className="group relative py-2 mt-auto flex w-max items-center justify-start gap-3">
              <span className="font-bold text-xl text-[#124074] transition-transform duration-300 group-hover:translate-x-1">
                Request Now
              </span>
              <ArrowRight className="w-5 h-5 text-[#124074] transition-transform duration-300 group-hover:translate-x-2" />
            </div>
          </div>

          {/* Make Donation Card */}
          <div
            onClick={handleDonateClick}
            className="group relative bg-white rounded-[2rem] p-6 transition-all duration-500 hover:-translate-y-2 border border-blue-50/50 shadow-xl shadow-blue-900/5 overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-2xl hover:border-[#124074]/20"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative mb-3">
              <Heart className="w-10 h-10 text-[#124074] stroke-[1.2] transition-all duration-500 group-hover:scale-110" />
            </div>

            <div className="relative flex-grow">
              <h3 className="text-2xl font-bold font-outfit text-[#124074] mb-3 tracking-tight">Support Now</h3>
              <p className="text-[#124074]/60 leading-relaxed font-medium mb-5">
                Make an impact by donating cash or sharing products with people who need them.
              </p>
            </div>

            <div className="group relative py-2 mt-auto flex w-max items-center justify-start gap-3">
              <span className="font-bold text-xl text-[#124074] transition-transform duration-300 group-hover:translate-x-1">
                Donate Now
              </span>
              <ArrowRight className="w-5 h-5 text-[#124074] transition-transform duration-300 group-hover:translate-x-2" />
            </div>
          </div>

          {/* Browse Products Card */}
          <div
            onClick={() => navigate("/browse-products")}
            className="group relative bg-white rounded-[2rem] p-6 transition-all duration-500 hover:-translate-y-2 border border-blue-50/50 shadow-xl shadow-blue-900/5 overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-2xl hover:border-[#124074]/20"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative mb-3">
              <Package className="w-10 h-10 text-[#124074] stroke-[1.2] transition-all duration-500 group-hover:scale-110" />
            </div>

            <div className="relative flex-grow">
              <h3 className="text-2xl font-bold font-outfit text-[#124074] mb-3 tracking-tight">Explore Items</h3>
              <p className="text-[#124074]/60 leading-relaxed font-medium mb-5">
                Browse through available products and request the ones that could help you.
              </p>
            </div>

            <div className="group relative py-2 mt-auto flex w-max items-center justify-start gap-3">
              <span className="font-bold text-xl text-[#124074] transition-transform duration-300 group-hover:translate-x-1">
                Browse Items
              </span>
              <ArrowRight className="w-5 h-5 text-[#124074] transition-transform duration-300 group-hover:translate-x-2" />
            </div>
          </div>

          {/* Live Bidding Card */}
          <div
            onClick={() => navigate("/bidding-gallery")}
            className="group relative bg-white rounded-[2rem] p-6 transition-all duration-500 hover:-translate-y-2 border border-blue-50/50 shadow-xl shadow-blue-900/5 overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-2xl hover:border-[#124074]/20"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative mb-3">
              <Gavel className="w-10 h-10 text-[#124074] stroke-[1.2] transition-all duration-500 group-hover:scale-110" />
            </div>

            <div className="relative flex-grow">
              <h3 className="text-2xl font-bold font-outfit text-[#124074] mb-3 tracking-tight">Live Auctions</h3>
              <p className="text-[#124074]/60 leading-relaxed font-medium mb-5">
                Participate in real-time bidding for unique items and support charitable causes.
              </p>
            </div>

            <div className="group relative py-2 mt-auto flex w-max items-center justify-start gap-3">
              <span className="font-bold text-xl text-[#124074] transition-transform duration-300 group-hover:translate-x-1">
                View Bidding
              </span>
              <ArrowRight className="w-5 h-5 text-[#124074] transition-transform duration-300 group-hover:translate-x-2" />
            </div>
          </div>
        </div>

        {/* History & Statistics Section */}
        <div id="history-section" className="card bg-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold font-outfit text-gray-900">Your History & Statistics</h2>
          </div>

          <div className="flex gap-8 border-b border-gray-200">
            <button
              onClick={() => setHistoryTab("stats")}
              className={`pb-4 px-2 flex items-center gap-2 text-base font-medium transition-colors border-b-2 -mb-px ${historyTab === "stats"
                ? "text-[#1db5f4] border-[#1db5f4]"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:border-gray-300"
                }`}
            >
              <TrendingUp className="w-5 h-5" />
              Statistics
            </button>
            <button
              onClick={() => setHistoryTab("donations")}
              className={`pb-4 px-2 flex items-center gap-2 text-base font-medium transition-colors border-b-2 -mb-px ${historyTab === "donations"
                ? "text-[#1db5f4] border-[#1db5f4]"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:border-gray-300"
                }`}
            >
              <Heart className="w-5 h-5" />
              Donations ({donationHistory.length})
            </button>
            <button
              onClick={() => setHistoryTab("requests")}
              className={`pb-4 px-2 flex items-center gap-2 text-base font-medium transition-colors border-b-2 -mb-px ${historyTab === "requests"
                ? "text-[#1db5f4] border-[#1db5f4]"
                : "text-slate-600 border-transparent hover:text-slate-900 hover:border-gray-300"
                }`}
            >
              <Package className="w-5 h-5" />
              Requests ({requestHistory.length})
            </button>
          </div>

          <div className="mt-6">
            {historyTab === "stats" && (
              <div className="space-y-8">
                {/* Overview Section */}
                <div>
                  <h3 className="text-xl font-bold font-outfit text-gray-900 mb-6">Overview</h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="card">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Heart className="w-6 h-6 text-primary-600" fill="currentColor" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium mb-1">Total Donations</p>
                          <p className="text-3xl font-bold text-gray-900 font-outfit">{stats.totalDonations}</p>
                          <p className="text-xs text-gray-500">Cash + Products</p>
                        </div>
                      </div>
                    </div>
                    <div className="card">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium mb-1">Total Requests</p>
                          <p className="text-3xl font-bold text-gray-900 font-outfit">{stats.totalRequests}</p>
                          <p className="text-xs text-gray-500">Cash + Products</p>
                        </div>
                      </div>
                    </div>
                    <div className="card">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium mb-1">Cash Donated</p>
                          <p className="text-2xl font-bold text-gray-900 font-outfit">PKR {stats.totalDonationAmount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Approved only</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Donations Breakdown */}
                <div>
                  <h3 className="text-xl font-bold font-outfit text-gray-900 mb-6">Donations Breakdown</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Cash Donations */}
                    <div
                      className="card cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
                      onClick={() => {
                        setHistoryTab("donations");
                        setDonationFilter("cash");
                        window.scrollTo({ top: document.querySelector('#history-section')?.offsetTop - 100, behavior: 'smooth' });
                      }}
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold font-outfit text-gray-900">Cash Donations</h4>
                          <p className="text-sm text-gray-600">{stats.totalDonations - stats.totalProductDonations} Total</p>
                        </div>
                      </div>
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-900">Approved</span>
                          <span className="text-lg font-bold text-gray-900">{stats.approvedDonations - stats.approvedProductDonations}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-900">Pending</span>
                          <span className="text-lg font-bold text-gray-900">{stats.pendingDonations - stats.pendingProductDonations}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-900">Rejected</span>
                          <span className="text-lg font-bold text-gray-900">{stats.rejectedDonations - stats.rejectedProductDonations}</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Total Amount:</span>
                          <span className="text-xl font-bold text-primary-600">PKR {stats.totalDonationAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Product Donations */}
                    <div
                      className="card cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
                      onClick={() => {
                        setHistoryTab("donations");
                        setDonationFilter("product");
                        window.scrollTo({ top: document.querySelector('#history-section')?.offsetTop - 100, behavior: 'smooth' });
                      }}
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold font-outfit text-gray-900">Product Donations</h4>
                          <p className="text-sm text-gray-600">{stats.totalProductDonations} Total</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Approved</span>
                          <span className="text-lg font-bold text-gray-900">{stats.approvedProductDonations}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Pending</span>
                          <span className="text-lg font-bold text-gray-900">{stats.pendingProductDonations}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Rejected</span>
                          <span className="text-lg font-bold text-gray-900">{stats.rejectedProductDonations}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requests Breakdown */}
                <div>
                  <h3 className="text-xl font-bold font-outfit text-gray-900 mb-6">Requests Breakdown</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Cash Requests */}
                    <div
                      className="card cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
                      onClick={() => {
                        setHistoryTab("requests");
                        setRequestFilter("cash");
                        window.scrollTo({ top: document.querySelector('#history-section')?.offsetTop - 100, behavior: 'smooth' });
                      }}
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold font-outfit text-gray-900">Cash Requests</h4>
                          <p className="text-sm text-gray-600">{stats.totalRequests - stats.totalProductRequests} Total</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Approved</span>
                          <span className="text-lg font-bold text-gray-900">{stats.approvedRequests - stats.approvedProductRequests}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Pending</span>
                          <span className="text-lg font-bold text-gray-900">{stats.pendingRequests - stats.pendingProductRequests}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Rejected</span>
                          <span className="text-lg font-bold text-gray-900">{stats.rejectedRequests - stats.rejectedProductRequests}</span>
                        </div>
                      </div>
                    </div>

                    {/* Product Requests */}
                    <div
                      className="card cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
                      onClick={() => {
                        setHistoryTab("requests");
                        setRequestFilter("product");
                        window.scrollTo({ top: document.querySelector('#history-section')?.offsetTop - 100, behavior: 'smooth' });
                      }}
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold font-outfit text-gray-900">Product Requests</h4>
                          <p className="text-sm text-gray-600">{stats.totalProductRequests} Total</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Approved</span>
                          <span className="text-lg font-bold text-gray-900">{stats.approvedProductRequests}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Pending</span>
                          <span className="text-lg font-bold text-gray-900">{stats.pendingProductRequests}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Rejected</span>
                          <span className="text-lg font-bold text-gray-900">{stats.rejectedProductRequests}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {historyTab === "donations" && (
              <div className="space-y-6">
                {/* Search and Filter for Donations */}
                <div className="card border border-gray-100 bg-white p-4 shadow-sm mb-6">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Search Bar */}
                    <div className="relative flex-1 w-full shadow-sm rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search donations by name or category..."
                        value={donationSearch}
                        onChange={(e) => setDonationSearch(e.target.value)}
                        className="block w-full pl-11 pr-10 py-3.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-normal text-gray-700"
                      />
                      {donationSearch && (
                        <button
                          onClick={() => setDonationSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                      onClick={() => setShowDonationFilters(!showDonationFilters)}
                      className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all w-full md:w-auto shrink-0 shadow-sm ${showDonationFilters || donationFilter !== "all" || donationStatusFilter !== "all"
                        ? "bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                    >
                      <Filter className="w-5 h-5" />
                      Filters
                      {(donationFilter !== "all" || donationStatusFilter !== "all") && (
                        <span className="flex h-2.5 w-2.5 relative ml-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-600"></span>
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Expandable Filters Section */}
                  <div className={`transition-all duration-300 ease-in-out ${showDonationFilters ? 'max-h-96 opacity-100 mt-4 pt-4 border-t border-gray-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Donation Type
                        </label>
                        <CustomDropdown
                          options={[
                            { value: "all", label: "All" },
                            { value: "cash", label: "Cash Donations" },
                            { value: "product", label: "Product Donations" }
                          ]}
                          value={donationFilter}
                          onChange={setDonationFilter}
                        />
                      </div>
                      <div className="relative z-40">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Status
                        </label>
                        <CustomDropdown
                          options={[
                            { value: "all", label: "All" },
                            { value: "approved", label: "Approved" },
                            { value: "pending", label: "Pending" },
                            { value: "rejected", label: "Rejected" }
                          ]}
                          value={donationStatusFilter}
                          onChange={setDonationStatusFilter}
                        />
                      </div>
                    </div>

                    {(donationSearch || donationFilter !== "all" || donationStatusFilter !== "all") && (
                      <div className="flex justify-end mt-5 pt-4 border-t border-gray-50">
                        <button
                          onClick={() => {
                            setDonationSearch("");
                            setDonationFilter("all");
                            setDonationStatusFilter("all");
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        >
                          <X className="w-4 h-4" />
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  Showing <strong className="text-gray-900">{filteredDonations.length}</strong> of <strong className="text-gray-900">{donationHistory.length}</strong> donations
                </div>

                {/* Donations List */}
                <div className="space-y-4">
                  {filteredDonations.length === 0 ? (
                    <div className="card text-center py-12">
                      <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        {donationHistory.length === 0 ? "No donations yet" : "No donations match your filters"}
                      </h3>
                      <p className="text-gray-500">
                        {donationHistory.length === 0
                          ? "Start making a difference by donating today!"
                          : "Try adjusting your search or filter criteria"}
                      </p>
                    </div>
                  ) : (
                    filteredDonations.map((donation) => (
                      <div key={`${donation.type}-${donation.id}`} className="card border-l-4 border-primary-500">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary-100">
                            {donation.status === "approved" ? (
                              <CheckCircle className="w-6 h-6 text-primary-600" />
                            ) : donation.status === "rejected" ? (
                              <AlertCircle className="w-6 h-6 text-primary-600" />
                            ) : (
                              <Clock className="w-6 h-6 text-primary-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h4 className="text-lg font-bold font-outfit text-gray-900">
                                  {donation.type === 'cash'
                                    ? `PKR ${parseFloat(donation.amount || 0).toLocaleString()}`
                                    : donation.product_name || 'Product Donation'}
                                </h4>
                                <span className="text-sm text-gray-500">
                                  ({donation.type === 'cash' ? 'Cash' : 'Product'} Donation)
                                </span>
                              </div>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
                                {donation.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Category:</strong> {donation.category || donation.type}
                            </p>
                            {donation.message && (
                              <p className="text-sm text-gray-600 mb-2 italic">"{donation.message}"</p>
                            )}
                            {donation.description && (
                              <p className="text-sm text-gray-600 mb-2 italic">"{donation.description}"</p>
                            )}
                            <p className="text-xs text-gray-500">
                              {new Date(donation.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {historyTab === "requests" && (
              <div className="space-y-6">
                {/* Search and Filter for Requests */}
                <div className="card border border-gray-100 bg-white p-4 shadow-sm mb-6">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Search Bar */}
                    <div className="relative flex-1 w-full shadow-sm rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search requests by name or category..."
                        value={requestSearch}
                        onChange={(e) => setRequestSearch(e.target.value)}
                        className="block w-full pl-11 pr-10 py-3.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-normal text-gray-700"
                      />
                      {requestSearch && (
                        <button
                          onClick={() => setRequestSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                      onClick={() => setShowRequestFilters(!showRequestFilters)}
                      className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all w-full md:w-auto shrink-0 shadow-sm ${showRequestFilters || requestFilter !== "all" || requestStatusFilter !== "all"
                        ? "bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                    >
                      <Filter className="w-5 h-5" />
                      Filters
                      {(requestFilter !== "all" || requestStatusFilter !== "all") && (
                        <span className="flex h-2.5 w-2.5 relative ml-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-600"></span>
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Expandable Filters Section */}
                  <div className={`transition-all duration-300 ease-in-out ${showRequestFilters ? 'max-h-96 opacity-100 mt-4 pt-4 border-t border-gray-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Request Type
                        </label>
                        <CustomDropdown
                          options={[
                            { value: "all", label: "All" },
                            { value: "cash", label: "Cash Requests" },
                            { value: "product", label: "Product Requests" }
                          ]}
                          value={requestFilter}
                          onChange={setRequestFilter}
                        />
                      </div>
                      <div className="relative z-40">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Status
                        </label>
                        <CustomDropdown
                          options={[
                            { value: "all", label: "All" },
                            { value: "approved", label: "Approved" },
                            { value: "pending", label: "Pending" },
                            { value: "rejected", label: "Rejected" }
                          ]}
                          value={requestStatusFilter}
                          onChange={setRequestStatusFilter}
                        />
                      </div>
                    </div>

                    {(requestSearch || requestFilter !== "all" || requestStatusFilter !== "all") && (
                      <div className="flex justify-end mt-5 pt-4 border-t border-gray-50">
                        <button
                          onClick={() => {
                            setRequestSearch("");
                            setRequestFilter("all");
                            setRequestStatusFilter("all");
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        >
                          <X className="w-4 h-4" />
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  Showing <strong className="text-gray-900">{filteredRequests.length}</strong> of <strong className="text-gray-900">{requestHistory.length}</strong> requests
                </div>

                {/* Requests List */}
                <div className="space-y-4">
                  {filteredRequests.length === 0 ? (
                    <div className="card text-center py-12">
                      <HeartHandshake className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        {requestHistory.length === 0 ? "No requests yet" : "No requests match your filters"}
                      </h3>
                      <p className="text-gray-500">
                        {requestHistory.length === 0
                          ? "Submit a request to get help from our community!"
                          : "Try adjusting your search or filter criteria"}
                      </p>
                    </div>
                  ) : (
                    filteredRequests.map((request) => (
                      <div key={`${request.type}-${request.id}`} className="card border-l-4 border-primary-500">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary-100">
                            {request.status === "approved" ? (
                              <CheckCircle className="w-6 h-6 text-primary-600" />
                            ) : request.status === "rejected" ? (
                              <AlertCircle className="w-6 h-6 text-primary-600" />
                            ) : (
                              <Clock className="w-6 h-6 text-primary-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h4 className="text-lg font-bold font-outfit text-gray-900">
                                  {request.type === 'cash'
                                    ? `PKR ${parseFloat(request.amount || 0).toLocaleString()}`
                                    : request.product_name || 'Product Request'}
                                </h4>
                                <span className="text-sm text-gray-500">
                                  ({request.type === 'cash' ? 'Cash' : 'Product'} Request)
                                </span>
                              </div>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
                                {request.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Category:</strong> {request.category || request.type}
                            </p>
                            {request.description && (
                              <p className="text-sm text-gray-600 mb-2 italic">"{request.description}"</p>
                            )}
                            <p className="text-xs text-gray-500">
                              {new Date(request.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </div>


      </div>

      {/* Verification Required Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowVerificationModal(false)}></div>
          <div className="relative bg-white w-full max-w-md p-8 rounded-[2rem] shadow-2xl animate-slide-up text-center">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Shield className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Verification Required</h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              To ensure the safety and trust of our community, you must verify your identity by uploading documents before you can request assistance.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setShowVerificationForm(true);
                }}
                className="w-full bg-[#124074] text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#103866] transition-colors shadow-lg shadow-blue-900/20"
              >
                Verify Now
              </button>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="w-full bg-slate-50 text-slate-500 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Verification Form Modal */}
      <VerificationFormModal
        isOpen={showVerificationForm}
        onClose={() => setShowVerificationForm(false)}
        onSuccess={() => {
          setShowVerificationForm(false);
          // Refresh user data or show a success message
          window.location.reload();
        }}
      />

    </div>
  );
}

export default Dashboard;

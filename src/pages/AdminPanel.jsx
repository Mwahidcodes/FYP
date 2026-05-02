import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../styles/AdminPanel.css";
import { notifyUser } from "../utils/notifications";
import { X, RefreshCw, CheckCheck, AlertCircle, ArrowUpDown, Bell, Users, DollarSign, Gift, Package, ShoppingBag, BarChart2, ShieldCheck, LogOut, HandHeart, Home, FileText, Gavel, LayoutDashboard, User, Settings, Mail, Calendar } from "lucide-react";
import CustomDropdown from "../components/CustomDropdown";
import Summary from "../components/Summary";


// Component for displaying bidding product image with Supabase signed URL support
const BiddingProductImage = ({ imageUrl, productName, size = "large" }) => {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        if (!imageUrl) {
          setLoading(false);
          return;
        }

        // Get a signed URL for the image
        const { data, error: urlError } = await supabase.storage
          .from('verification-documents')
          .createSignedUrl(imageUrl, 3600);

        if (urlError) throw urlError;
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error loading bidding product image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [imageUrl]);

  const isSmall = size === "small";
  const dimensions = isSmall ? { width: '50px', height: '50px' } : { width: '100%', height: '200px' };

  if (loading) {
    return (
      <div style={{
        ...dimensions,
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        marginBottom: isSmall ? '0' : '1rem'
      }}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div style={{
        ...dimensions,
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        marginBottom: isSmall ? '0' : '1rem',
        color: '#9ca3af',
        fontSize: isSmall ? '0.6rem' : '0.8rem',
        textAlign: 'center',
        padding: '2px'
      }}>
        {isSmall ? 'No Img' : '📦 No Image Available'}
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={productName || 'Bidding Product'}
      style={{
        ...dimensions,
        borderRadius: '8px',
        objectFit: 'cover',
        marginBottom: isSmall ? '0' : '1rem'
      }}
      onClick={(e) => {
        if (!isSmall) {
          e.stopPropagation();
          window.open(signedUrl, '_blank');
        }
      }}
    />
  );
};

function AdminPanel() {
  const navigate = useNavigate();

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
  ];

  const [activeTab, setActiveTab] = useState("verifications");
  const [verifications, setVerifications] = useState([]);
  const [cashRequests, setCashRequests] = useState([]);
  const [cashDonations, setCashDonations] = useState([]);
  const [productDonations, setProductDonations] = useState([]);
  const [productRequests, setProductRequests] = useState([]);
  const [biddingProducts, setBiddingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }
  const [isLoading, setIsLoading] = useState(false); // Prevent duplicate loads
  const [submittingId, setSubmittingId] = useState(null); // Track which item is being submitted
  const [showBiddingModal, setShowBiddingModal] = useState(false);
  const [biddingFeedback, setBiddingFeedback] = useState(null);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showAdminNotifications, setShowAdminNotifications] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    const storedAdmin = localStorage.getItem("adminUser");
    if (storedAdmin) {
      try {
        setAdminUser(JSON.parse(storedAdmin));
      } catch (e) {
        console.error("Error parsing admin user:", e);
      }
    }
  }, []);

  // Search and filter states for each tab
  const [verificationSearch, setVerificationSearch] = useState("");
  const [verificationStatusFilter, setVerificationStatusFilter] = useState("all");
  const [cashRequestSearch, setCashRequestSearch] = useState("");
  const [cashRequestStatusFilter, setCashRequestStatusFilter] = useState("all");
  const [cashDonationSearch, setCashDonationSearch] = useState("");
  const [cashDonationStatusFilter, setCashDonationStatusFilter] = useState("all");
  const [productDonationSearch, setProductDonationSearch] = useState("");
  const [productDonationStatusFilter, setProductDonationStatusFilter] = useState("all");
  const [productDonationCategoryFilter, setProductDonationCategoryFilter] = useState("all");
  const [productRequestSearch, setProductRequestSearch] = useState("");
  const [productRequestStatusFilter, setProductRequestStatusFilter] = useState("all");
  const [biddingSearch, setBiddingSearch] = useState("");
  const [biddingStatusFilter, setBiddingStatusFilter] = useState("all");
  const [biddingSortBy, setBiddingSortBy] = useState("newest");
  const [selectedProductForBidding, setSelectedProductForBidding] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const ITEMS_PER_PAGE = 10;
  
  // Verification states
  const [verificationsLoading, setVerificationsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [verificationPage, setVerificationPage] = useState(0);
  const [hasMoreVerifications, setHasMoreVerifications] = useState(true);
  const [verificationCounts, setVerificationCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // Cash Request states
  const [cashRequestsLoading, setCashRequestsLoading] = useState(false);
  const [cashRequestPage, setCashRequestPage] = useState(0);
  const [hasMoreCashRequests, setHasMoreCashRequests] = useState(true);
  const [cashRequestTotal, setCashRequestTotal] = useState(0);

  // Cash Donation states
  const [cashDonationsLoading, setCashDonationsLoading] = useState(false);
  const [cashDonationPage, setCashDonationPage] = useState(0);
  const [hasMoreCashDonations, setHasMoreCashDonations] = useState(true);
  const [cashDonationTotal, setCashDonationTotal] = useState(0);

  // Product Donation states
  const [productDonationsLoading, setProductDonationsLoading] = useState(false);
  const [productDonationPage, setProductDonationPage] = useState(0);
  const [hasMoreProductDonations, setHasMoreProductDonations] = useState(true);
  const [productDonationTotal, setProductDonationTotal] = useState(0);

  // Product Request states
  const [productRequestsLoading, setProductRequestsLoading] = useState(false);
  const [productRequestPage, setProductRequestPage] = useState(0);
  const [hasMoreProductRequests, setHasMoreProductRequests] = useState(true);
  const [productRequestTotal, setProductRequestTotal] = useState(0);

  // Bidding states
  const [biddingLoadingMore, setBiddingLoadingMore] = useState(false);
  const [biddingPage, setBiddingPage] = useState(0);
  const [hasMoreBidding, setHasMoreBidding] = useState(true);
  const [biddingTotal, setBiddingTotal] = useState(0);
  const [rejectionCountdown, setRejectionCountdown] = useState(null);
  const rejectionTimerRef = useRef(null);
  const biddingErrorRef = useRef(null);

  // Scroll to bidding error when it appears
  useEffect(() => {
    if (biddingFeedback && biddingFeedback.type === 'error' && biddingErrorRef.current) {
      biddingErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [biddingFeedback]);

  const handleOpenDetail = async (item, type) => {
    // We now fetch the FULL item from the database when opening the modal 
    // since the initial lists are now optimized and minimal.
    setLoading(true);
    try {
      let tableName = "";
      switch(type) {
        case 'verification': tableName = "verification_requests"; break;
        case 'cash_request': tableName = "cash_requests"; break;
        case 'cash_donation': tableName = "cash_donations"; break;
        case 'product_donation': tableName = "product_donations"; break;
        case 'product_request': tableName = "product_requests"; break;
        case 'bidding': tableName = "bidding_products"; break;
        default: tableName = "";
      }

      if (tableName) {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .eq("id", item.id)
          .single();
        
        if (!error && data) {
          let processed = data;
          // Special handling for verification pipe-separated fields
          if (type === 'verification') {
            const hasPipe = (data.affidavit_url && String(data.affidavit_url).includes('|')) || 
                            (data.affidavit_name && String(data.affidavit_name).includes('|'));
            if (hasPipe) {
              const urls = String(data.affidavit_url || '').split('|');
              const names = String(data.affidavit_name || '').split('|');
              processed = {
                ...data,
                affidavit_url: urls[0] || null,
                affidavit_name: names[0] || null,
                bank_statement_url: urls[1] || null,
                bank_statement_name: names[1] || null,
                rent_agreement_url: urls[2] || null,
                rent_agreement_name: names[2] || null
              };
            }
          }
          setSelectedItem(processed);
        } else {
          setSelectedItem(item);
        }
      } else {
        setSelectedItem(item);
      }
    } catch (err) {
      console.error("Error fetching full details:", err);
      setSelectedItem(item);
    } finally {
      setLoading(false);
      setSelectedType(type);
      setShowDetailModal(true);

      // Mark failed auction as read if opened
      if (type === 'bidding' && item.status === 'ended' && item.winner_name === 'NO_BIDS_UNREAD') {
        try {
          supabase
            .from('bidding_products')
            .update({ winner_name: 'NO_BIDS_READ' })
            .eq('id', item.id)
            .then(() => {
              // Update local state to remove blink and badge count
              setBiddingProducts(prev => prev.map(p => p.id === item.id ? { ...p, winner_name: 'NO_BIDS_READ' } : p));
            });
        } catch (err) {
          console.error("Error marking bidding as read:", err);
        }
      }
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedItem(null);
    setSelectedType(null);
  };

  // Automatically scroll to top when switching tabs
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);



  // Filter visibility states for each tab
  const [showCashDonationFilters, setShowCashDonationFilters] = useState(false);
  const [showProductDonationFilters, setShowProductDonationFilters] = useState(false);
  const [showProductRequestFilters, setShowProductRequestFilters] = useState(false);
  const [showBiddingFilters, setShowBiddingFilters] = useState(false);

  // Sorting states for all sections
  const [verificationSortBy, setVerificationSortBy] = useState("newest");
  const [expandedVerificationId, setExpandedVerificationId] = useState(null);
  const [cashRequestSortBy, setCashRequestSortBy] = useState("newest");
  const [cashDonationSortBy, setCashDonationSortBy] = useState("newest");
  const [productDonationSortBy, setProductDonationSortBy] = useState("newest");
  const [productRequestSortBy, setProductRequestSortBy] = useState("newest");
  const [biddingFormData, setBiddingFormData] = useState({
    startingPrice: "",
    bidStartDate: "",
    bidEndDate: "",
  });
  const [biddingLoading, setBiddingLoading] = useState(false);

  const sortByStatus = (items) => {  // store verification requests, cash requests, donations
    const priority = { pending: 0, approved: 1, rejected: 2 };

    return [...items].sort((a, b) => {
      const aPriority = priority[a.status] ?? 3;
      const bPriority = priority[b.status] ?? 3;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // For same status, show newest first
      return new Date(b.created_at) - new Date(a.created_at);
    });
  };

  // Sorting function for all sections
  const sortItems = (items, sortBy) => {
    const sorted = [...items];

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at || b.bid_start_date) - new Date(a.created_at || a.bid_start_date));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at || a.bid_start_date) - new Date(b.created_at || b.bid_start_date));
      case 'name-asc':
        return sorted.sort((a, b) => {
          const nameA = (a.user_name || a.product_name || '').toLowerCase();
          const nameB = (b.user_name || b.product_name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case 'name-desc':
        return sorted.sort((a, b) => {
          const nameA = (a.user_name || a.product_name || '').toLowerCase();
          const nameB = (b.user_name || b.product_name || '').toLowerCase();
          return nameB.localeCompare(nameA);
        });
      case 'status':
        return sortByStatus(sorted);
      default:
        return sorted;
    }
  };

  // Load all data function
  const loadAllData = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setLoading(true);

    try {
      // Initialize first page for all
      await Promise.all([
        loadVerificationsSeparately(0, false),
        loadCashRequestsSeparately(0, false),
        loadCashDonationsSeparately(0, false),
        loadProductDonationsSeparately(0, false),
        loadProductRequestsSeparately(0, false),
        loadBiddingSeparately(0, false),
        loadAdminNotifications()
      ]);
    } catch (error) {
      console.error("❌ Fatal error loading all data:", error);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const loadCashRequestsSeparately = async (page = 0, append = false) => {
    try {
      if (page === 0) setCashRequestsLoading(true);
      else setLoadingMore(true);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("cash_requests")
        .select("id, user_name, user_email, status, amount, category, created_at", { count: 'exact' });

      if (cashRequestStatusFilter !== 'all') {
        query = query.eq('status', cashRequestStatusFilter);
      }

      if (cashRequestSearch.trim()) {
        const search = `%${cashRequestSearch.toLowerCase()}%`;
        query = query.or(`user_name.ilike.${search},user_email.ilike.${search},amount.ilike.${search},category.ilike.${search}`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (append) {
        setCashRequests(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = (data || []).filter(i => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      } else {
        setCashRequests(data || []);
      }
      setHasMoreCashRequests(data && data.length === ITEMS_PER_PAGE);
      if (count !== null) setCashRequestTotal(count);
      setCashRequestPage(page);
    } catch (err) {
      console.error("Error loading cash requests:", err);
    } finally {
      setCashRequestsLoading(false);
      setLoadingMore(false);
    }
  };

  const loadCashDonationsSeparately = async (page = 0, append = false) => {
    try {
      if (page === 0) setCashDonationsLoading(true);
      else setLoadingMore(true);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("cash_donations")
        .select("id, user_name, user_email, status, amount, payment_gateway, created_at", { count: 'exact' });

      if (cashDonationStatusFilter !== 'all') {
        query = query.eq('status', cashDonationStatusFilter);
      } else {
        // Still hide incomplete Stripe payments if showing 'all'
        query = query.neq('status', 'waiting_payment');
      }

      if (cashDonationSearch.trim()) {
        const search = `%${cashDonationSearch.toLowerCase()}%`;
        query = query.or(`user_name.ilike.${search},user_email.ilike.${search},amount.ilike.${search},payment_gateway.ilike.${search}`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (append) {
        setCashDonations(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = (data || []).filter(i => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      } else {
        setCashDonations(data || []);
      }
      setHasMoreCashDonations(data && data.length === ITEMS_PER_PAGE);
      if (count !== null) setCashDonationTotal(count);
      setCashDonationPage(page);
    } catch (err) {
      console.error("Error loading cash donations:", err);
    } finally {
      setCashDonationsLoading(false);
      setLoadingMore(false);
    }
  };

  const loadProductDonationsSeparately = async (page = 0, append = false) => {
    try {
      if (page === 0) setProductDonationsLoading(true);
      else setLoadingMore(true);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("product_donations")
        .select("id, user_name, status, product_name, category, created_at, image_url, description", { count: 'exact' });

      if (productDonationStatusFilter !== 'all') {
        query = query.eq('status', productDonationStatusFilter);
      }

      if (productDonationCategoryFilter !== 'all') {
        query = query.eq('category', productDonationCategoryFilter);
      }

      if (productDonationSearch.trim()) {
        const search = `%${productDonationSearch.toLowerCase()}%`;
        query = query.or(`user_name.ilike.${search},product_name.ilike.${search},category.ilike.${search}`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (append) {
        setProductDonations(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = (data || []).filter(i => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      } else {
        setProductDonations(data || []);
      }
      setHasMoreProductDonations(data && data.length === ITEMS_PER_PAGE);
      if (count !== null) setProductDonationTotal(count);
      setProductDonationPage(page);
    } catch (err) {
      console.error("Error loading product donations:", err);
    } finally {
      setProductDonationsLoading(false);
      setLoadingMore(false);
    }
  };

  const loadProductRequestsSeparately = async (page = 0, append = false) => {
    try {
      if (page === 0) setProductRequestsLoading(true);
      else setLoadingMore(true);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("product_requests")
        .select("id, user_name, status, product_name, product_category, created_at", { count: 'exact' });

      if (productRequestStatusFilter !== 'all') {
        query = query.eq('status', productRequestStatusFilter);
      }

      if (productRequestSearch.trim()) {
        const search = `%${productRequestSearch.toLowerCase()}%`;
        query = query.or(`user_name.ilike.${search},product_name.ilike.${search},product_category.ilike.${search}`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (append) {
        setProductRequests(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = (data || []).filter(i => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      } else {
        setProductRequests(data || []);
      }
      setHasMoreProductRequests(data && data.length === ITEMS_PER_PAGE);
      if (count !== null) setProductRequestTotal(count);
      setProductRequestPage(page);
    } catch (err) {
      console.error("Error loading product requests:", err);
    } finally {
      setProductRequestsLoading(false);
      setLoadingMore(false);
    }
  };

  const loadBiddingSeparately = async (page = 0, append = false) => {
    try {
      if (page === 0) setBiddingLoading(true);
      else setBiddingLoadingMore(true);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("bidding_products")
        .select("*, product_donations(user_name, created_at, image_url)", { count: 'exact' });

      // Apply Status Filter
      if (biddingStatusFilter !== 'all') {
        query = query.eq('status', biddingStatusFilter);
      }

      // Apply Search Filter
      if (biddingSearch.trim()) {
        const search = `%${biddingSearch.toLowerCase()}%`;
        query = query.or(`product_name.ilike.${search},product_category.ilike.${search}`);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (append) {
        setBiddingProducts(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = (data || []).filter(i => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      } else {
        setBiddingProducts(data || []);
      }
      setHasMoreBidding(data && data.length === ITEMS_PER_PAGE);
      if (count !== null) setBiddingTotal(count);
      setBiddingPage(page);
    } catch (err) {
      console.error("Error loading bidding:", err);
    } finally {
      setBiddingLoading(false);
      setBiddingLoadingMore(false);
    }
  };

  // Load verifications separately - handle JSON parse errors from malformed data
  const loadVerificationsSeparately = async (page = 0, append = false) => {
    try {
      if (page === 0) {
        setVerificationsLoading(true);
      } else {
        setLoadingMore(true);
      }
      console.log(`🔄 Loading verifications (page ${page}, append ${append})...`);

      // Fetch counts first for badges and summary (only on first load)
      if (page === 0) {
        const fetchCounts = async () => {
          try {
            const results = await Promise.all([
              supabase.from("verification_requests").select("id", { count: 'exact', head: true }),
              supabase.from("verification_requests").select("id", { count: 'exact', head: true }).eq("status", "pending"),
              supabase.from("verification_requests").select("id", { count: 'exact', head: true }).eq("status", "approved"),
              supabase.from("verification_requests").select("id", { count: 'exact', head: true }).eq("status", "rejected"),
            ]);

            setVerificationCounts({
              total: results[0].count || 0,
              pending: results[1].count || 0,
              approved: results[2].count || 0,
              rejected: results[3].count || 0,
            });
          } catch (err) {
            console.error("Error fetching verification counts:", err);
          }
        };
        fetchCounts();
      }

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Try loading with specific columns first
     let query = supabase
  .from("verification_requests")
  .select("*", { count: "exact" });

      if (verificationStatusFilter !== 'all') {
        query = query.eq('status', verificationStatusFilter);
      }

      if (verificationSearch.trim()) {
        const search = `%${verificationSearch.toLowerCase()}%`;
        query = query.or(`user_name.ilike.${search},user_email.ilike.${search}`);
      }

      let { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.warn("⚠️ Error with specific columns, trying with all...");
        const fallback = await supabase
          .from("verification_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error("❌ Error loading verifications:", error);
        if (error.message && error.message.includes("JSON")) {
          setFeedback({ type: "error", message: "Error loading verifications: Malformed data in database." });
        }
        if (!append) setVerifications([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log("ℹ️ No more verifications found");
        setHasMoreVerifications(false);
        if (!append) setVerifications([]);
        return;
      }

      console.log(`✅ Verifications loaded: ${data.length} items`);

      const processedData = data.map(item => {
        const hasPipe = (item.affidavit_url && String(item.affidavit_url).includes('|')) ||
          (item.affidavit_name && String(item.affidavit_name).includes('|'));

        if (hasPipe) {
          const urls = String(item.affidavit_url || '').split('|');
          const names = String(item.affidavit_name || '').split('|');
          return {
            ...item,
            affidavit_url: urls[0] || null,
            affidavit_name: names[0] || null,
            bank_statement_url: urls[1] || null,
            bank_statement_name: names[1] || null,
            rent_agreement_url: urls[2] || null,
            rent_agreement_name: names[2] || null
          };
        }
        return item;
      });

      if (append) {
        setVerifications(prev => {
          // Prevent duplicates
          const existingIds = new Set(prev.map(v => v.id));
          const newItems = processedData.filter(v => !existingIds.has(v.id));
          return [...prev, ...newItems];
        });
      } else {
        setVerifications(processedData);
      }

      setHasMoreVerifications(data.length === ITEMS_PER_PAGE);
      setVerificationPage(page);

    } catch (error) {
      console.error("❌ Exception loading verifications:", error);
    } finally {
      if (page === 0) setVerificationsLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMoreVerifications = () => {
    loadVerificationsSeparately(verificationPage + 1, true);
  };

  const handleLoadMoreCashRequests = () => loadCashRequestsSeparately(cashRequestPage + 1, true);
  const handleLoadMoreCashDonations = () => loadCashDonationsSeparately(cashDonationPage + 1, true);
  const handleLoadMoreProductDonations = () => loadProductDonationsSeparately(productDonationPage + 1, true);
  const handleLoadMoreProductRequests = () => loadProductRequestsSeparately(productRequestPage + 1, true);
  const handleLoadMoreBidding = () => loadBiddingSeparately(biddingPage + 1, true);

  const loadAdminNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, created_at, is_read, title, message")
        .in("type", ["bank_details_submitted", "stripe_donation_received"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) {
        setAdminNotifications(data);
      }
    } catch (err) {
      console.error('Error loading admin notifications', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markAdminNotificationAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (!error) {
        setAdminNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Check authentication
    const storedAdmin = localStorage.getItem("adminUser");
    if (!storedAdmin) {
      navigate("/admin");
      return;
    }

    // Load all data on mount
    loadAllData();
    loadAdminNotifications();
    const notifInterval = setInterval(loadAdminNotifications, 30000);

    return () => clearInterval(notifInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAdminNotifications && !event.target.closest('[data-notification-dropdown]')) {
        setShowAdminNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAdminNotifications]);

  // Handle server-side filtering side effects
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'verifications') loadVerificationsSeparately(0, false);
      if (activeTab === 'requests') loadCashRequestsSeparately(0, false);
      if (activeTab === 'donations') loadCashDonationsSeparately(0, false);
      if (activeTab === 'product-donations') loadProductDonationsSeparately(0, false);
      if (activeTab === 'product-requests') loadProductRequestsSeparately(0, false);
      if (activeTab === 'bidding') loadBiddingSeparately(0, false);
    }, 400);
    return () => clearTimeout(timer);
  }, [
    verificationSearch, verificationStatusFilter,
    cashRequestSearch, cashRequestStatusFilter,
    cashDonationSearch, cashDonationStatusFilter,
    productDonationSearch, productDonationStatusFilter, productDonationCategoryFilter,
    productRequestSearch, productRequestStatusFilter,
    biddingSearch, biddingStatusFilter,
    activeTab
  ]);

  // Reload functions for after actions (approve/reject)
  const reloadVerifications = async () => {
    await loadVerificationsSeparately(0, false);
  };

  const reloadCashRequests = async () => {
    const { data, error } = await supabase
      .from("cash_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setCashRequests(sortByStatus(data || []));
  };

  const reloadCashDonations = async () => {
    const { data, error } = await supabase
      .from("cash_donations")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setCashDonations(sortByStatus(data || []));
  };

  const reloadProductDonations = async () => {
    const { data, error } = await supabase
      .from("product_donations")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setProductDonations(sortByStatus(data || []));
  };

  const reloadProductRequests = async () => {
    const { data, error } = await supabase
      .from("product_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setProductRequests(sortByStatus(data || []));
  };

  const getSignedUrl = async (filePath) => {
    try {
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
  };

  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null); // { type: 'verification'|'request'|'donation', id: number, name: string }
  const [rejectionReason, setRejectionReason] = useState("");

  const handleViewDocument = async (filePath, fileName) => {
    setDocumentLoading(true);
    setViewingDocument(fileName);
    const url = await getSignedUrl(filePath);
    setDocumentUrl(url);
    setDocumentLoading(false);
  };

  const closeDocumentViewer = () => {
    setViewingDocument(null);
    setDocumentUrl(null);
    setDocumentLoading(false);
  };

  const DocumentViewer = ({ filePath, fileName, label = "View Document" }) => {
    return (
      <button
        className="btn-view-document"
        onClick={() => handleViewDocument(filePath, fileName)}
      >
        {label}
      </button>
    );
  };

  const handleApprove = async (request) => {
    const actionId = `verify-${request.id}`;
    try {
      setSubmittingId(actionId);

      // Optimistically update local state for instant feedback
      setVerifications(prev =>
        prev.map(req => req.id === request.id ? { ...req, status: 'approved' } : req)
      );

      const { error: userError } = await supabase
        .from("users")
        .update({ is_verified: true })
        .eq("id", request.user_id);

      if (userError) throw userError;

      const { error: reqError } = await supabase
        .from("verification_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (reqError) throw reqError;

      // Create notification and send email
      await notifyUser(
        request.user_id,
        request.user_email,
        request.user_name,
        "verification_approved",
        "Account Verified",
        "Your account has been verified successfully. You can now submit requests for donations.",
        "Your verification documents have been approved.",
        request.id
      );

      setFeedback({ type: "success", message: "User verified successfully." });
      reloadVerifications();
    } catch (error) {
      setFeedback({ type: "error", message: "Error verifying user: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (requestId, reason) => {
    const actionId = `verify-${requestId}-reject`;
    try {
      setSubmittingId(actionId);

      // Optimistically update local state for instant feedback
      setVerifications(prev =>
        prev.map(req => req.id === requestId ? { ...req, status: 'rejected' } : req)
      );

      // Get request details before updating
      const { data: request } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      const { error } = await supabase
        .from("verification_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      // Create notification and send email
      if (request) {
        const message = reason
          ? `Your verification request has been rejected. Reason: ${reason}`
          : "Your verification request has been rejected. Please resubmit your documents.";

        await notifyUser(
          request.user_id,
          request.user_email,
          request.user_name,
          "verification_rejected",
          "Verification Rejected",
          message,
          reason || "Please review your documents and resubmit for verification.",
          requestId,
          reason
        );
      }

      setFeedback({ type: "success", message: "Verification request rejected." });
      setRejectModal(null);
      setRejectionReason("");

      // Still reload to ensure sync
      reloadVerifications();
    } catch (error) {
      setFeedback({ type: "error", message: "Error rejecting verification: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveRequest = async (id) => {
    const actionId = `cash-req-${id}`;
    try {
      setSubmittingId(actionId);
      // Get request details before updating
      const { data: request } = await supabase
        .from("cash_requests")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("cash_requests")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (request) {
        await notifyUser(
          request.user_id,
          request.user_email,
          request.user_name,
          "request_approved_bank_details",
          "Request Approved",
          `Your cash request of PKR ${request.amount} has been approved!`,
          `Amount: PKR ${request.amount}\nCategory: ${request.category}\nDescription: ${request.description}\n\nYour request has been processed.`,
          id
        );
      }

      setFeedback({ type: "success", message: "Cash request approved." });
      reloadCashRequests();
    } catch (error) {
      setFeedback({ type: "error", message: "Error approving request: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRejectRequest = async (id, reason) => {
    const actionId = `cash-req-${id}-reject`;
    try {
      setSubmittingId(actionId);
      // Get request details before updating
      const { data: request } = await supabase
        .from("cash_requests")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("cash_requests")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (request) {
        const message = reason
          ? `Your cash request of PKR ${request.amount} has been rejected. Reason: ${reason}`
          : `Your cash request of PKR ${request.amount} has been rejected.`;

        await notifyUser(
          request.user_id,
          request.user_email,
          request.user_name,
          "request_rejected",
          "Request Rejected",
          message,
          `Amount: PKR ${request.amount}\nCategory: ${request.category}`,
          id,
          reason
        );
      }

      setFeedback({ type: "success", message: "Cash request rejected." });
      setRejectModal(null);
      setRejectionReason("");
      reloadCashRequests();
    } catch (error) {
      setFeedback({ type: "error", message: "Error rejecting request: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveDonation = async (id) => {
    const actionId = `cash-don-${id}`;
    try {
      setSubmittingId(actionId);
      // Get donation details before updating
      const { data: donation } = await supabase
        .from("cash_donations")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("cash_donations")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (donation) {
        await notifyUser(
          donation.user_id,
          donation.user_email,
          donation.user_name,
          "donation_approved",
          "Donation Approved",
          `Your donation of PKR ${donation.amount} has been approved! Thank you for your generosity.`,
          `Amount: PKR ${donation.amount}\nCategory: ${donation.category}\nMessage: ${donation.message || "N/A"}`,
          id
        );
      }

      setFeedback({ type: "success", message: "Donation approved." });
      reloadCashDonations();
    } catch (error) {
      setFeedback({ type: "error", message: "Error approving donation: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRejectDonation = async (id, reason) => {
    const actionId = `cash-don-${id}-reject`;
    try {
      setSubmittingId(actionId);
      // Get donation details before updating
      const { data: donation } = await supabase
        .from("cash_donations")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("cash_donations")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (donation) {
        const message = reason
          ? `Your donation of PKR ${donation.amount} has been rejected. Reason: ${reason}`
          : `Your donation of PKR ${donation.amount} has been rejected.`;

        await notifyUser(
          donation.user_id,
          donation.user_email,
          donation.user_name,
          "donation_rejected",
          "Donation Rejected",
          message,
          `Amount: PKR ${donation.amount}\nCategory: ${donation.category}`,
          id,
          reason
        );
      }

      setFeedback({ type: "success", message: "Donation rejected." });
      setRejectModal(null);
      setRejectionReason("");
      reloadCashDonations();
    } catch (error) {
      setFeedback({ type: "error", message: "Error rejecting donation: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const openRejectModal = (type, id, name) => {
    setRejectModal({ type, id, name });
    setRejectionReason("");
  };

  const handleApproveProductDonation = async (id) => {
    const actionId = `prod-don-${id}`;
    try {
      setSubmittingId(actionId);
      // Get donation details before updating
      const { data: donation } = await supabase
        .from("product_donations")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("product_donations")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (donation) {
        await notifyUser(
          donation.user_id,
          donation.user_email,
          donation.user_name,
          "product_donation_approved",
          "Product Donation Approved",
          `Your product donation has been approved! Thank you for your generosity.`,
          `Product: ${donation.product_name || "N/A"}\nCategory: ${donation.category}\nDescription: ${donation.description || "N/A"}`,
          id
        );
      }

      setFeedback({ type: "success", message: "Product donation approved." });
      reloadProductDonations();
    } catch (error) {
      setFeedback({ type: "error", message: "Error approving product donation: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRejectProductDonation = async (id, reason) => {
    const actionId = `prod-don-${id}-reject`;
    try {
      setSubmittingId(actionId);
      // Get donation details before updating
      const { data: donation } = await supabase
        .from("product_donations")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("product_donations")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (donation) {
        const message = reason
          ? `Your product donation has been rejected. Reason: ${reason}`
          : `Your product donation has been rejected.`;

        await notifyUser(
          donation.user_id,
          donation.user_email,
          donation.user_name,
          "product_donation_rejected",
          "Product Donation Rejected",
          message,
          `Product: ${donation.product_name || "N/A"}\nCategory: ${donation.category}`,
          id,
          reason
        );
      }

      setFeedback({ type: "success", message: "Product donation rejected." });
      setRejectModal(null);
      setRejectionReason("");
      reloadProductDonations();
    } catch (error) {
      setFeedback({ type: "error", message: "Error rejecting product donation: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveProductRequest = async (id) => {
    const actionId = `prod-req-${id}`;
    try {
      setSubmittingId(actionId);
      // Get request details before updating
      const { data: request } = await supabase
        .from("product_requests")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("product_requests")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (request) {
        await notifyUser(
          request.user_id,
          request.user_email,
          request.user_name,
          "product_request_approved",
          "Product Request Approved",
          `Your product request for "${request.product_name}" has been approved!`,
          `Product: ${request.product_name}\nCategory: ${request.product_category}\nReason: ${(request.reason || "").replace("[DELIVERY ADDRESS]", "\nDelivery Address:")}`,
          id
        );
      }

      setFeedback({ type: "success", message: "Product request approved." });
      reloadProductRequests();
    } catch (error) {
      setFeedback({ type: "error", message: "Error approving product request: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRejectProductRequest = async (id, reason) => {
    const actionId = `prod-req-${id}-reject`;
    try {
      setSubmittingId(actionId);
      // Get request details before updating
      const { data: request } = await supabase
        .from("product_requests")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("product_requests")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (request) {
        const message = reason
          ? `Your product request for "${request.product_name}" has been rejected. Reason: ${reason}`
          : `Your product request for "${request.product_name}" has been rejected.`;

        await notifyUser(
          request.user_id,
          request.user_email,
          request.user_name,
          "product_request_rejected",
          "Product Request Rejected",
          message,
          `Product: ${request.product_name}\nCategory: ${request.product_category}`,
          id,
          reason
        );
      }

      setFeedback({ type: "success", message: "Product request rejected." });
      setRejectModal(null);
      setRejectionReason("");
      reloadProductRequests();
    } catch (error) {
      setFeedback({ type: "error", message: "Error rejecting product request: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectModal || !!submittingId) return false;
    let success = false;

    try {
      if (rejectModal.type === "verification") {
        await handleReject(rejectModal.id, rejectionReason);
        success = true;
      } else if (rejectModal.type === "request" || rejectModal.type === "cash_request") {
        await handleRejectRequest(rejectModal.id, rejectionReason);
        success = true;
      } else if (rejectModal.type === "donation" || rejectModal.type === "cash_donation") {
        await handleRejectDonation(rejectModal.id, rejectionReason);
        success = true;
      } else if (rejectModal.type === "product-donation" || rejectModal.type === "product_donation") {
        await handleRejectProductDonation(rejectModal.id, rejectionReason);
        success = true;
      } else if (rejectModal.type === "product-request" || rejectModal.type === "product_request") {
        await handleRejectProductRequest(rejectModal.id, rejectionReason);
        success = true;
      }
      return success;
    } catch (err) {
      console.error("Rejection failed:", err);
      return false;
    }
  };

  const startRejectionCountdown = () => {
    if (!rejectionReason.trim()) return;

    setRejectionCountdown(3);
    rejectionTimerRef.current = setInterval(() => {
      setRejectionCountdown(prev => {
        if (prev <= 1) {
          clearInterval(rejectionTimerRef.current);
          rejectionTimerRef.current = null;
          setRejectionCountdown(null);

          // Proceed with actual rejection
          confirmReject().then(success => {
            if (success) {
              closeDetailModal();
            }
          });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCancelRejection = () => {
    if (rejectionTimerRef.current) {
      clearInterval(rejectionTimerRef.current);
      rejectionTimerRef.current = null;
      setRejectionCountdown(null);
      // Admin is returned to the rejection reason page (which is just the modal itself)
    } else {
      setRejectModal(null);
      setRejectionReason("");
    }
  };

  // Bidding Management Functions
  const openBiddingModal = (product) => {
    setSelectedProductForBidding(product);
    setBiddingFormData({
      startingPrice: "",
      bidStartDate: "",
      bidEndDate: "",
    });
    setBiddingFeedback(null);
    setShowBiddingModal(true);
  };

  const closeBiddingModal = () => {
    setShowBiddingModal(false);
    setSelectedProductForBidding(null);
    setBiddingFeedback(null);
    setBiddingFormData({
      startingPrice: "",
      bidStartDate: "",
      bidEndDate: "",
    });
  };

  const handleCreateBiddingProduct = async (e) => {
    e.preventDefault();
    if (!selectedProductForBidding) {
      setFeedback({ type: "error", message: "Please select a product first." });
      return;
    }

    if (biddingLoading) return; // Prevent double submission

    setBiddingLoading(true);
    setFeedback(null); // Clear previous feedback

    const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");

    // Check if admin user exists in users table, otherwise set to null
    let adminUserId = null;
    if (adminUser && adminUser.id) {
      try {
        const { data: userCheck } = await supabase
          .from("users")
          .select("id")
          .eq("id", adminUser.id)
          .single();
        if (userCheck) {
          adminUserId = adminUser.id;
        }
      } catch (err) {
        console.log("Admin user not found in users table, setting created_by_admin_id to null");
        adminUserId = null; // Explicitly set to null if not found
      }
    }

    try {
      // Validate form
      if (!biddingFormData.startingPrice || parseFloat(biddingFormData.startingPrice) <= 0) {
        setBiddingFeedback({ type: "error", message: "Please enter a valid starting price." });
        return;
      }

      if (!biddingFormData.bidStartDate || !biddingFormData.bidEndDate) {
        setBiddingFeedback({ type: "error", message: "Please select both start and end dates." });
        return;
      }

      const startDate = new Date(biddingFormData.bidStartDate);
      const endDate = new Date(biddingFormData.bidEndDate);
      const now = new Date();

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        setBiddingFeedback({ type: "error", message: "Invalid date format. Please select valid dates." });
        return;
      }

      // Strict component validation (e.g., April 31 check)
      const validateDateComponents = (dateStr, dateObj) => {
        const [datePart] = dateStr.split('T');
        const [y, m, d] = datePart.split('-').map(Number);
        return (
          dateObj.getFullYear() === y && 
          (dateObj.getMonth() + 1) === m && 
          dateObj.getDate() === d &&
          y.toString().length === 4
        );
      };

      if (!validateDateComponents(biddingFormData.bidStartDate, startDate) || 
          !validateDateComponents(biddingFormData.bidEndDate, endDate)) {
        setBiddingFeedback({ type: "error", message: "Invalid date or year format. Please check the dates (e.g., April 31 does not exist) and ensure year is 4 digits." });
        return;
      }

      if (startDate >= endDate) {
        setBiddingFeedback({ type: "error", message: "Start Date cannot be ahead of or equal to End Date." });
        return;
      }

      // Determine initial status
      let status = "upcoming";
      if (startDate <= now && endDate >= now) {
        status = "active";
      } else if (endDate < now) {
        setFeedback({ type: "error", message: "End date cannot be in the past." });
        return;
      }

      // Check if product is already in bidding
      const { data: existing } = await supabase
        .from("bidding_products")
        .select("id")
        .eq("product_donation_id", selectedProductForBidding.id)
        .in("status", ["upcoming", "active"]);

      if (existing && existing.length > 0) {
        setFeedback({ type: "error", message: "This product is already up for bidding." });
        return;
      }

      // Convert datetime-local format to ISO string for Supabase
      const startDateISO = new Date(biddingFormData.bidStartDate).toISOString();
      const endDateISO = new Date(biddingFormData.bidEndDate).toISOString();

      console.log("Creating bidding product with data:", {
        product_donation_id: selectedProductForBidding.id,
        starting_price: parseFloat(biddingFormData.startingPrice),
        bid_start_date: startDateISO,
        bid_end_date: endDateISO,
        status: status,
      });

      // Create bidding product
      const { data, error } = await supabase.from("bidding_products").insert([
        {
          product_donation_id: selectedProductForBidding.id,
          product_name: selectedProductForBidding.product_name || "Unnamed Product",
          product_category: selectedProductForBidding.category,
          product_description: selectedProductForBidding.description,
          product_image_url: selectedProductForBidding.image_url,
          starting_price: parseFloat(biddingFormData.startingPrice),
          current_highest_bid: parseFloat(biddingFormData.startingPrice),
          bid_start_date: startDateISO,
          bid_end_date: endDateISO,
          status: status,
          created_by_admin_id: adminUserId,
        },
      ]).select();

      if (error) {
        console.error("Error creating bidding product:", error);
        throw error;
      }

      console.log("Bidding product created successfully:", data);

      setBiddingFeedback({ type: "success", message: "Product added to bidding successfully!" });
      setTimeout(() => {
        closeBiddingModal();
      }, 1500);
      await loadAllData();
    } catch (error) {
      console.error("Error creating bidding product:", error);
      setBiddingFeedback({
        type: "error",
        message: "Error creating bidding product: " + (error.message || "Unknown error. Please check console.")
      });
    } finally {
      setBiddingLoading(false);
    }
  };

  const reloadBiddingProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("bidding_products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBiddingProducts(data || []);
    } catch (error) {
      console.error("Error reloading bidding products:", error);
    }
  };

  // Check for ended bids and set winners, also auto-fix wrongly ended auctions
  const checkAndSetWinners = async () => {
    try {
      const now = new Date().toISOString();
      const nowObj = new Date();

      // 1. AUTO-FIX: Find ended/completed auctions that should be active
      const { data: wronglyEnded } = await supabase
        .from("bidding_products")
        .select("*")
        .in("status", ["ended", "completed"])
        .gt("bid_end_date", now);

      if (wronglyEnded && wronglyEnded.length > 0) {
        for (const bidding of wronglyEnded) {
          const startDate = new Date(bidding.bid_start_date);
          if (startDate <= nowObj) {
            // Should be active
            await supabase
              .from("bidding_products")
              .update({ 
                status: "active",
                winner_id: null,
                winner_name: null,
                winner_email: null,
                payment_verified: false,
                delivery_arranged: false
              })
              .eq("id", bidding.id);
          }
        }
      }

      // 2. AUTO-FIX: Find upcoming auctions that should be active now
      const { data: shouldBeActive } = await supabase
        .from("bidding_products")
        .select("*")
        .eq("status", "upcoming")
        .lte("bid_start_date", now);

      if (shouldBeActive && shouldBeActive.length > 0) {
        for (const bidding of shouldBeActive) {
          if (new Date(bidding.bid_end_date) > nowObj) {
            await supabase
              .from("bidding_products")
              .update({ status: "active" })
              .eq("id", bidding.id);
          }
        }
      }

      // 3. END AUCTIONS: Find active bids that have ended
      const { data: endedBids, error: fetchError } = await supabase
        .from("bidding_products")
        .select("*")
        .in("status", ["active", "upcoming"]) // Also check expired upcoming auctions
        .lte("bid_end_date", now);

      if (fetchError) throw fetchError;

      if (endedBids && endedBids.length > 0) {
        // Process each ended bid
        for (const bidding of endedBids) {
          // Check if winner already set
          if (bidding.winner_id) continue;

          // Fetch all admin users for notification
          const adminUsers = await supabase
            .from("users")
            .select("id, email, name")
            .eq("role", "admin");

          // Get the highest bidder (winning bid)
          if (bidding.highest_bidder_id) {
            // Update bidding product with winner
            const { error: updateError } = await supabase
              .from("bidding_products")
              .update({
                status: "ended",
                winner_id: bidding.highest_bidder_id,
                winner_name: bidding.highest_bidder_name,
                winner_email: bidding.highest_bidder_email,
              })
              .eq("id", bidding.id);

            if (updateError) {
              console.error(`Error updating winner for bidding ${bidding.id}:`, updateError);
              continue;
            }

            // Send notification to winner
            await notifyUser(
              bidding.highest_bidder_id,
              bidding.highest_bidder_email,
              bidding.highest_bidder_name,
              "bid_won",
              "Congratulations! You Won the Bid",
              `Congratulations! You won the bid for "${bidding.product_name}" with a bid of PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()}.\n\nPlease transfer your payments at Meezan Bank\nAccount Number: 01234567890123\nAccount Title: Share For Good`,
              `Product: ${bidding.product_name}\nWinning Bid: PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()}\nPlease transfer your payments at Meezan Bank\nAccount Number: 01234567890123\nAccount Title: Share For Good`,
              bidding.id
            );

            // Send notification to admin
            if (adminUsers.data && adminUsers.data.length > 0) {
              for (const admin of adminUsers.data) {
                await notifyUser(
                  admin.id,
                  admin.email,
                  admin.name,
                  "bid_ended",
                  "Bidding Ended - Winner Selected",
                  `Bidding for "${bidding.product_name}" has ended. Winner: ${bidding.highest_bidder_name} (PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()})`,
                  `Product: ${bidding.product_name}\nWinner: ${bidding.highest_bidder_name}\nWinning Bid: PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()}\nPlease verify payment and arrange delivery.`,
                  bidding.id
                );
              }
            }

            // Fetch all unique bidders for this product to notify them
            const { data: bidders } = await supabase
              .from("bids")
              .select("user_id, user_email, user_name")
              .eq("bidding_product_id", bidding.id);

            if (bidders && bidders.length > 0) {
              const uniqueBidders = Array.from(new Set(bidders.map(b => b.user_id)))
                .map(id => bidders.find(b => b.user_id === id));

              for (const bidder of uniqueBidders) {
                // Skip winner (already notified)
                if (bidder.user_id === bidding.highest_bidder_id) continue;

                await notifyUser(
                  bidder.user_id,
                  bidder.user_email,
                  bidder.user_name,
                  "bid_ended",
                  "Bidding Ended",
                  `The bidding for "${bidding.product_name}" has ended.`,
                  `Thank you for participating in the bidding for "${bidding.product_name}". The auction has concluded and a winner has been selected. Better luck next time!`,
                  bidding.id
                );
              }
            }
          } else {
            // No bids placed, mark as ended and mark as unread for admin
            await supabase
              .from("bidding_products")
              .update({ 
                status: "ended",
                winner_name: "NO_BIDS_UNREAD" // Internal flag for unread failed auction
              })
              .eq("id", bidding.id);

            // Move back to product donations (approve status) so it can be promoted again or requested normally
            if (bidding.product_donation_id) {
              await supabase
                .from("product_donations")
                .update({ status: "approved" })
                .eq("id", bidding.product_donation_id);
              
              // We KEEP the bidding record so it shows as "ENDED" in the admin panel
              // but it's no longer active.
            }

            // Notify admin that no bids were placed and product was reverted
            if (adminUsers.data && adminUsers.data.length > 0) {
              for (const admin of adminUsers.data) {
                await notifyUser(
                  admin.id,
                  admin.email,
                  admin.name,
                  "bid_ended",
                  "Bidding Ended - Reverted to Requests",
                  `Bidding for "${bidding.product_name}" ended with no bids. It has been moved back to Product Donations.`,
                  `The bidding period for "${bidding.product_name}" has expired without any participants. The item has been automatically moved back to the Product Donations list so you can re-promote it if needed.`,
                  bidding.id
                );
              }
            }
          }
        }

        // Reload both bidding products and product donations to show updated status
        await Promise.all([
          reloadBiddingProducts(),
          loadProductDonationsSeparately(0, false)
        ]);
      }
    } catch (error) {
      console.error("Error checking and setting winners:", error);
    }
  };

  // View bids for a bidding product
  const [selectedBiddingForBids, setSelectedBiddingForBids] = useState(null);
  const [bidsList, setBidsList] = useState([]);
  const [showBidsModal, setShowBidsModal] = useState(false);

  const openBidsModal = async (bidding) => {
    setSelectedBiddingForBids(bidding);
    setShowBidsModal(true);
    await loadBidsForProduct(bidding.id);
  };

  const closeBidsModal = () => {
    setShowBidsModal(false);
    setSelectedBiddingForBids(null);
    setBidsList([]);
  };

  const loadBidsForProduct = async (biddingProductId) => {
    try {
      const { data, error } = await supabase
        .from("bids")
        .select("*")
        .eq("bidding_product_id", biddingProductId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBidsList(data || []);
    } catch (error) {
      console.error("Error loading bids:", error);
      setBidsList([]);
    }
  };

  // Verify payment for winner
  const handleVerifyPayment = async (biddingId) => {
    const actionId = `bid-verify-${biddingId}`;
    try {
      setSubmittingId(actionId);
      // Get current bidding product
      const { data: currentBidding } = await supabase
        .from("bidding_products")
        .select("*")
        .eq("id", biddingId)
        .single();

      if (!currentBidding) throw new Error("Bidding product not found");

      // Update payment_verified
      // Keep status as "ended" (will show as "Action Required" in UI until delivery is arranged)
      // Only change to "completed" when both payment verified AND delivery arranged
      const newStatus = (currentBidding.payment_verified && currentBidding.delivery_arranged) ? "completed" : "ended";

      const { error } = await supabase
        .from("bidding_products")
        .update({
          payment_verified: true,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", biddingId);

      if (error) throw error;

      // Get updated bidding product to notify winner
      const { data: bidding } = await supabase
        .from("bidding_products")
        .select("*")
        .eq("id", biddingId)
        .single();

      if (bidding && bidding.winner_id) {
        await notifyUser(
          bidding.winner_id,
          bidding.winner_email,
          bidding.winner_name,
          "payment_verified",
          "Payment Verified",
          `Your payment for "${bidding.product_name}" has been verified. Delivery will be arranged soon.`,
          `Product: ${bidding.product_name}\nWinning Bid: PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()}\nPayment Status: Verified`,
          biddingId
        );
      }

      setFeedback({ type: "success", message: "Payment verified successfully!" });
      await reloadBiddingProducts();
    } catch (error) {
      console.error("Error verifying payment:", error);
      setFeedback({ type: "error", message: "Error verifying payment: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  // Mark delivery as arranged
  const handleArrangeDelivery = async (biddingId) => {
    const actionId = `bid-deliver-${biddingId}`;
    try {
      setSubmittingId(actionId);
      const { error } = await supabase
        .from("bidding_products")
        .update({ delivery_arranged: true, status: "completed" })
        .eq("id", biddingId);

      if (error) throw error;

      // Get bidding product to notify winner
      const { data: bidding } = await supabase
        .from("bidding_products")
        .select("*")
        .eq("id", biddingId)
        .single();

      if (bidding && bidding.winner_id) {
        await notifyUser(
          bidding.winner_id,
          bidding.winner_email,
          bidding.winner_name,
          "delivery_arranged",
          "Delivery Arranged",
          `Delivery for "${bidding.product_name}" has been arranged. You will be contacted soon for delivery details.`,
          `Product: ${bidding.product_name}\nDelivery Status: Arranged\nYou will be contacted with delivery details.`,
          biddingId
        );
      }

      setFeedback({ type: "success", message: "Delivery arranged successfully!" });
      await reloadBiddingProducts();
    } catch (error) {
      console.error("Error arranging delivery:", error);
      setFeedback({ type: "error", message: "Error arranging delivery: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  // End or Delete auction manually
  const handleEndAuction = async (biddingId) => {
    try {
      const now = new Date().toISOString();
      
      // We first fetch the current item to check its status
      const { data: currentItem } = await supabase
        .from("bidding_products")
        .select("status, bid_start_date")
        .eq("id", biddingId)
        .single();

      if (!currentItem) throw new Error("Auction not found");

      if (currentItem.status === 'upcoming') {
        // For upcoming auctions, we COMPLETELY DELETE from database as requested
        const { error } = await supabase
          .from("bidding_products")
          .delete()
          .eq("id", biddingId);

        if (error) throw error;
        setFeedback({ type: "success", message: "Upcoming auction removed successfully!" });
      } else {
        // For active auctions, we mark as ended
        const updateData = { 
          status: "ended", 
          bid_end_date: now 
        };

        const { error } = await supabase
          .from("bidding_products")
          .update(updateData)
          .eq("id", biddingId);

        if (error) throw error;
        setFeedback({ type: "success", message: "Auction ended successfully!" });
      }

      await reloadBiddingProducts();
    } catch (error) {
      console.error("Error handling auction end/delete:", error);
      setFeedback({ type: "error", message: "Error: " + error.message });
    }
  };

  // Reactivate auction manually
  const handleReactivateAuction = async (biddingId) => {
    try {
      const { error } = await supabase
        .from("bidding_products")
        .update({ 
          status: "active", 
          payment_verified: false, 
          delivery_arranged: false,
          winner_id: null,
          winner_name: null,
          winner_email: null,
          winner_id: null // Ensuring winner info is cleared
        })
        .eq("id", biddingId);

      if (error) throw error;
      setFeedback({ type: "success", message: "Auction reactivated successfully!" });
      await reloadBiddingProducts();
    } catch (error) {
      console.error("Error reactivating auction:", error);
      setFeedback({ type: "error", message: "Error reactivating auction: " + error.message });
    }
  };

  // Check for ended bids on component mount and periodically
  useEffect(() => {
    checkAndSetWinners();
    // Check every 5 minutes for ended bids
    const interval = setInterval(checkAndSetWinners, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar no-scrollbar">
        <div className="sidebar-header">
          <div className="sidebar-website-logo">
            <div className="logo-icon">
              <img src="/logo.png" alt="Share4Good Logo" />
            </div>
            <span className="website-name">Share<span>4</span>Good</span>
          </div>
        </div>

        <nav className="sidebar-nav">

          <button
            className={`sidebar-nav-item ${activeTab === "summary" ? "active" : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            <div className="nav-item-content">
              <span className="nav-item-text">Summary</span>
            </div>
          </button>


          <button
            className={`sidebar-nav-item ${activeTab === "verifications" ? "active" : ""}`}
            onClick={() => setActiveTab("verifications")}
          >
            <div className="nav-item-content">
              <span className="nav-item-text">Verifications</span>
            </div>
            {verificationCounts.pending > 0 && <span className="nav-item-badge badge-highlight">{verificationCounts.pending}</span>}
          </button>


          <button
            className={`sidebar-nav-item ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            <div className="nav-item-content">
              <span className="nav-item-text">Cash Requests</span>
            </div>
            {(() => {
              const pendingCount = cashRequests.filter((r) => r.status === "pending").length;
              return pendingCount > 0 ? <span className="nav-item-badge badge-highlight">{pendingCount}</span> : null;
            })()}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === "donations" ? "active" : ""}`}
            onClick={() => setActiveTab("donations")}
          >
            <div className="nav-item-content">
              <span className="nav-item-text">Cash Donations</span>
            </div>
            {(() => {
              const pendingCount = cashDonations.filter((d) => d.status === "pending").length;
              return pendingCount > 0 ? <span className="nav-item-badge badge-highlight">{pendingCount}</span> : null;
            })()}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === "product-donations" ? "active" : ""}`}
            onClick={() => setActiveTab("product-donations")}
          >
            <div className="nav-item-content">
              <span className="nav-item-text">Product Donations</span>
            </div>
            {(() => {
              const pendingCount = productDonations.filter((d) => d.status === "pending").length;
              return pendingCount > 0 ? <span className="nav-item-badge badge-highlight">{pendingCount}</span> : null;
            })()}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === "product-requests" ? "active" : ""}`}
            onClick={() => setActiveTab("product-requests")}
          >
            <div className="nav-item-content">
              <span className="nav-item-text">Product Requests</span>
            </div>
            {(() => {
              const pendingCount = productRequests.filter((r) => r.status === "pending").length;
              return pendingCount > 0 ? <span className="nav-item-badge badge-highlight">{pendingCount}</span> : null;
            })()}
          </button>


          <button
            className={`sidebar-nav-item ${activeTab === "bidding" ? "active" : ""}`}
            onClick={() => setActiveTab("bidding")}
          >
            <div className="nav-item-content">
              <span className="nav-item-text">Bidding Management</span>
            </div>
            {(() => {
              const unreadFailedCount = biddingProducts.filter(b => b.status === "ended" && b.winner_name === "NO_BIDS_UNREAD").length;
              const pendingActionCount = biddingProducts.filter(b => {
                const needsPaymentAction = b.status === "ended" && b.highest_bidder_name && !b.payment_verified;
                const needsDeliveryAction = b.status === "ended" && b.highest_bidder_name && b.payment_verified && !b.delivery_arranged;
                return needsPaymentAction || needsDeliveryAction;
              }).length;
              const totalCount = unreadFailedCount + pendingActionCount;
              
              if (totalCount === 0) return null;
              
              return (
                <span className={`nav-item-badge ${unreadFailedCount > 0 ? 'pulse-badge-red' : ''}`}>
                  {totalCount}
                </span>
              );
            })()}
          </button>
        </nav>

        <div className="sidebar-footer"></div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="header-title">
            <h2>{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="header-actions">
            <button
              className="btn-header-logout"
              onClick={() => {
                localStorage.removeItem("adminUser");
                navigate("/admin");
              }}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="admin-content-area">
          {feedback && feedback.type !== "success" && (
            <div
              className={`page-alert ${feedback.type === "success"
                ? "page-alert-success"
                : "page-alert-error"
                }`}
            >
              <span className="page-alert-emoji">
                {feedback.type === "success" ? "✅" : "❌"}
              </span>
              <span>{feedback.message}</span>
            </div>
          )}

          {activeTab === "summary" && (
            <Summary
              verifications={verifications}
              verificationCounts={verificationCounts}
              cashRequests={cashRequests}
              cashDonations={cashDonations}
              productDonations={productDonations}
              productRequests={productRequests}
              biddingProducts={biddingProducts}
            />
          )}

          <div className="admin-content-inner">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading...</p>
              </div>
            ) : (
              <>
                {activeTab === "verifications" && (
                  <div className="requests-section">
                    <div className="admin-search-filter">
                      <h3 className="admin-search-filter-title">Search & Filters</h3>
                      <div className="admin-filter-controls">
                        <div className="admin-search-box">
                          <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={verificationSearch}
                            onChange={(e) => setVerificationSearch(e.target.value)}
                            className="admin-search-input"
                          />
                          <i className="ri-search-line admin-search-icon"></i>
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Status</label>
                          <CustomDropdown
                            options={statusOptions}
                            value={verificationStatusFilter}
                            onChange={setVerificationStatusFilter}
                            placeholder="All Status"
                          />
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Sort By</label>
                          <CustomDropdown
                            options={sortOptions}
                            value={verificationSortBy}
                            onChange={setVerificationSortBy}
                            placeholder="Sort By"
                          />
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const sorted = sortItems(verifications, verificationSortBy);

                      if (verificationsLoading) {
                        return (
                          <div className="empty-state" style={{ padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                            <p style={{ color: '#64748b' }}>Loading verification requests...</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {sorted.length === 0 ? (
                            <div className="empty-state">No verification requests found</div>
                          ) : (
                            <div className="admin-cards-grid">
                              {sorted.map((request) => (
                                <div
                                  key={request.id}
                                  className="admin-item-card"
                                  onClick={() => handleOpenDetail(request, 'verification')}
                                >
                                  <div className="card-header-main">
                                    <h3>{request.user_name}</h3>
                                    <span className={`status-badge ${request.status}`}>{request.status}</span>
                                  </div>
                                  <div className="card-details-preview">
                                    <span className="card-meta-info">
                                      <Mail size={14} /> {request.user_email}
                                    </span>
                                  </div>
                                  <div className="click-hint">
                                    <span>View verification details</span>
                                    <FileText size={14} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {hasMoreVerifications && (
                            <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                              <button
                                className="btn-add-bidding"
                                onClick={handleLoadMoreVerifications}
                                disabled={verificationsLoading || loadingMore}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                              >
                                {loadingMore && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                {loadingMore ? "Loading..." : "Load More Requests"}
                              </button>
                              <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                                Showing {verifications.length} of {verificationCounts.total}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {activeTab === "requests" && (
                  <div className="requests-section">
                    <div className="admin-search-filter">
                      <h3 className="admin-search-filter-title">Search & Filters</h3>
                      <div className="admin-filter-controls">
                        <div className="admin-search-box">
                          <input
                            type="text"
                            placeholder="Search by name, email, or amount..."
                            value={cashRequestSearch}
                            onChange={(e) => setCashRequestSearch(e.target.value)}
                            className="admin-search-input"
                          />
                          <i className="ri-search-line admin-search-icon"></i>
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Status</label>
                          <CustomDropdown
                            options={statusOptions}
                            value={cashRequestStatusFilter}
                            onChange={setCashRequestStatusFilter}
                            placeholder="All Status"
                          />
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Sort By</label>
                          <CustomDropdown
                            options={sortOptions}
                            value={cashRequestSortBy}
                            onChange={setCashRequestSortBy}
                            placeholder="Sort By"
                          />
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const sorted = sortItems(cashRequests, cashRequestSortBy);

                      if (cashRequestsLoading) {
                        return (
                          <div className="empty-state" style={{ padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                            <p style={{ color: '#64748b' }}>Loading cash requests...</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {sorted.length === 0 ? (
                            <div className="empty-state">No cash requests found</div>
                          ) : (
                            <div className="admin-cards-grid">
                              {sorted.map((request) => (
                                <div
                                  key={request.id}
                                  className="admin-item-card"
                                  onClick={() => handleOpenDetail(request, 'cash_request')}
                                >
                                  <div className="card-header-main">
                                    <h3>{request.user_name}</h3>
                                    <span className={`status-badge ${request.status}`}>{request.status}</span>
                                  </div>
                                  <div className="card-details-preview">
                                    <p style={{ color: '#10b981', fontWeight: 700, margin: 0, fontSize: '1.1rem' }}>PKR {request.amount}</p>
                                    <span className="card-meta-info">
                                      <Package size={14} /> {request.category}
                                    </span>
                                  </div>
                                  <div className="click-hint">
                                    <span>Review request</span>
                                    <DollarSign size={14} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {hasMoreCashRequests && (
                            <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                              <button
                                className="btn-add-bidding"
                                onClick={handleLoadMoreCashRequests}
                                disabled={cashRequestsLoading || loadingMore}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                              >
                                {loadingMore && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                {loadingMore ? "Loading..." : "Load More Requests"}
                              </button>
                              <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                                Showing {cashRequests.length} of {cashRequestTotal}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {activeTab === "product-requests" && (
                  <div className="requests-section">
                    <div className="admin-search-filter">
                      <h3 className="admin-search-filter-title">Search & Filters</h3>
                      <div className="admin-filter-controls">
                        <div className="admin-search-box">
                          <input
                            type="text"
                            placeholder="Search by name, product, or category..."
                            value={productRequestSearch}
                            onChange={(e) => setProductRequestSearch(e.target.value)}
                            className="admin-search-input"
                          />
                          <i className="ri-search-line admin-search-icon"></i>
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Status</label>
                          <CustomDropdown
                            options={statusOptions}
                            value={productRequestStatusFilter}
                            onChange={setProductRequestStatusFilter}
                            placeholder="All Status"
                          />
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Sort By</label>
                          <CustomDropdown
                            options={sortOptions}
                            value={productRequestSortBy}
                            onChange={setProductRequestSortBy}
                            placeholder="Sort By"
                          />
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const sorted = sortItems(productRequests, productRequestSortBy);

                      if (productRequestsLoading) {
                        return (
                          <div className="empty-state" style={{ padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                            <p style={{ color: '#64748b' }}>Loading product requests...</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {sorted.length === 0 ? (
                            <div className="empty-state">No product requests found</div>
                          ) : (
                            <div className="admin-cards-grid">
                              {sorted.map((request) => (
                                <div
                                  key={request.id}
                                  className="admin-item-card"
                                  onClick={() => handleOpenDetail(request, 'product_request')}
                                >
                                  <div className="card-header-main">
                                    <h3>{request.user_name}</h3>
                                    <span className={`status-badge ${request.status}`}>{request.status}</span>
                                  </div>
                                  <div className="card-details-preview">
                                    <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>{request.product_name}</p>
                                    <span className="card-meta-info">
                                      <Package size={14} /> {request.product_category}
                                    </span>
                                  </div>
                                  <div className="click-hint">
                                    <span>Check product request</span>
                                    <ShoppingBag size={14} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {hasMoreProductRequests && (
                            <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                              <button
                                className="btn-add-bidding"
                                onClick={handleLoadMoreProductRequests}
                                disabled={productRequestsLoading || loadingMore}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                              >
                                {loadingMore && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                {loadingMore ? "Loading..." : "Load More Requests"}
                              </button>
                              <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                                Showing {productRequests.length} of {productRequestTotal}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {activeTab === "donations" && (
                  <div className="requests-section">
                    <div className="admin-search-filter">
                      <h3 className="admin-search-filter-title">Search & Filters</h3>
                      <div className="admin-filter-controls">
                        <div className="admin-search-box">
                          <input
                            type="text"
                            placeholder="Search by name, email, or amount..."
                            value={cashDonationSearch}
                            onChange={(e) => setCashDonationSearch(e.target.value)}
                            className="admin-search-input"
                          />
                          <i className="ri-search-line admin-search-icon"></i>
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Status</label>
                          <CustomDropdown
                            options={statusOptions}
                            value={cashDonationStatusFilter}
                            onChange={setCashDonationStatusFilter}
                            placeholder="All Status"
                          />
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Sort By</label>
                          <CustomDropdown
                            options={sortOptions}
                            value={cashDonationSortBy}
                            onChange={setCashDonationSortBy}
                            placeholder="Sort By"
                          />
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const sorted = sortItems(cashDonations, cashDonationSortBy);

                      if (cashDonationsLoading) {
                        return (
                          <div className="empty-state" style={{ padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                            <p style={{ color: '#64748b' }}>Loading cash donations...</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {sorted.length === 0 ? (
                            <div className="empty-state">No cash donations found</div>
                          ) : (
                            <div className="admin-cards-grid">
                              {sorted.map((donation) => (
                                <div
                                  key={donation.id}
                                  className="admin-item-card"
                                  onClick={() => handleOpenDetail(donation, 'cash_donation')}
                                >
                                  <div className="card-header-main">
                                    <h3>{donation.user_name}</h3>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <span className={`status-badge ${donation.status}`}>{donation.status}</span>
                                      {donation.payment_gateway === 'stripe' && (
                                        <span className="status-badge approved" style={{ background: '#6366f1', color: 'white', border: 'none' }}>
                                          <ShieldCheck size={10} /> Stripe
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="card-details-preview">
                                    <p style={{ color: '#10b981', fontWeight: 700, margin: 0, fontSize: '1.1rem' }}>PKR {donation.amount}</p>
                                    <span className="card-meta-info">
                                      <Mail size={14} /> {donation.user_email}
                                    </span>
                                  </div>
                                  <div className="click-hint">
                                    <span>View donation details</span>
                                    <HandHeart size={14} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {hasMoreCashDonations && (
                            <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                              <button
                                className="btn-add-bidding"
                                onClick={handleLoadMoreCashDonations}
                                disabled={cashDonationsLoading || loadingMore}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                              >
                                {loadingMore && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                {loadingMore ? "Loading..." : "Load More Donations"}
                              </button>
                              <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                                Showing {cashDonations.length} of {cashDonationTotal}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {activeTab === "product-donations" && (
                  <div className="requests-section">
                    <div className="admin-search-filter">
                      <h3 className="admin-search-filter-title">Search & Filters</h3>
                      <div className="admin-filter-controls">
                        <div className="admin-search-box">
                          <input
                            type="text"
                            placeholder="Search by name or product..."
                            value={productDonationSearch}
                            onChange={(e) => setProductDonationSearch(e.target.value)}
                            className="admin-search-input"
                          />
                          <i className="ri-search-line admin-search-icon"></i>
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Status</label>
                          <CustomDropdown
                            options={statusOptions}
                            value={productDonationStatusFilter}
                            onChange={setProductDonationStatusFilter}
                            placeholder="All Status"
                          />
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Sort By</label>
                          <CustomDropdown
                            options={sortOptions}
                            value={productDonationSortBy}
                            onChange={setProductDonationSortBy}
                            placeholder="Sort By"
                          />
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const sorted = sortItems(productDonations, productDonationSortBy);

                      if (productDonationsLoading) {
                        return (
                          <div className="empty-state" style={{ padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                            <p style={{ color: '#64748b' }}>Loading product donations...</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {sorted.length === 0 ? (
                            <div className="empty-state">No product donations found</div>
                          ) : (
                            <div className="admin-cards-grid">
                              {sorted.map((donation) => (
                                <div
                                  key={donation.id}
                                  className="admin-item-card"
                                  onClick={() => handleOpenDetail(donation, 'product_donation')}
                                >
                                  <div className="card-header-main">
                                    <h3>{donation.user_name}</h3>
                                    <span className={`status-badge ${donation.status}`}>{donation.status}</span>
                                  </div>
                                  <div className="card-details-preview">
                                    <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>{donation.product_name}</p>
                                    <span className="card-meta-info">
                                      <Package size={14} /> {donation.category}
                                    </span>
                                  </div>
                                  <div className="click-hint">
                                    <span>Check product donation</span>
                                    <Gift size={14} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {hasMoreProductDonations && (
                            <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                              <button
                                className="btn-add-bidding"
                                onClick={handleLoadMoreProductDonations}
                                disabled={productDonationsLoading || loadingMore}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                              >
                                {loadingMore && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                                {loadingMore ? "Loading..." : "Load More Donations"}
                              </button>
                              <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                                Showing {productDonations.length} of {productDonationTotal}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {activeTab === "bidding" && (
                  <div className="bidding-section">
                    <div className="bidding-section-header">
                      <h2 className="bidding-section-title">Bidding Management</h2>
                      <button
                        className="btn-add-bidding"
                        onClick={async () => {
                          await reloadProductRequests();
                          setShowBiddingModal(true);
                          setSelectedProductForBidding(null);
                        }}
                      >
                        + Add Product to Bidding
                      </button>
                    </div>

                    <div className="admin-search-filter">
                      <h3 className="admin-search-filter-title">Search & Filters</h3>
                      <div className="admin-filter-controls">
                        <div className="admin-search-box">
                          <input
                            type="text"
                            placeholder="Search by name or category..."
                            value={biddingSearch}
                            onChange={(e) => setBiddingSearch(e.target.value)}
                            className="admin-search-input"
                          />
                          <i className="ri-search-line admin-search-icon"></i>
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Status</label>
                          <CustomDropdown
                            options={[
                              { value: 'all', label: 'All Status' },
                              { value: 'active', label: 'Active' },
                              { value: 'ended', label: 'Ended' },
                              { value: 'upcoming', label: 'Upcoming' },
                            ]}
                            value={biddingStatusFilter}
                            onChange={setBiddingStatusFilter}
                            placeholder="All Status"
                          />
                        </div>
                        <div className="dropdown-container">
                          <label className="admin-filter-label">Sort By</label>
                          <CustomDropdown
                            options={sortOptions}
                            value={biddingSortBy}
                            onChange={setBiddingSortBy}
                            placeholder="Sort By"
                          />
                        </div>
                      </div>
                    </div>

                    {biddingProducts.length === 0 ? (
                      <div className="empty-state">No products in bidding</div>
                    ) : (
                      <>
                        <div className="admin-cards-grid">
                          {biddingProducts
                            .sort((a, b) => {
                              if (biddingSortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
                              if (biddingSortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
                              if (biddingSortBy === 'name-asc') return (a.product_name || '').localeCompare(b.product_name || '');
                              if (biddingSortBy === 'name-desc') return (b.product_name || '').localeCompare(a.product_name || '');
                              return 0;
                            })
                            .map((bidding) => {
                              // Determine display status for UI
                              let displayStatus = bidding.status;
                              if (bidding.status === 'ended') {
                                // Only show pending if there's actually a winner to process
                                if (bidding.highest_bidder_id && (!bidding.payment_verified || !bidding.delivery_arranged)) {
                                  displayStatus = 'pending';
                                } else if (!bidding.highest_bidder_id) {
                                  displayStatus = 'ended';
                                }
                              }

                              return (
                                <div
                                  key={bidding.id}
                                  className={`admin-item-card ${bidding.winner_name === 'NO_BIDS_UNREAD' ? 'new-unread-failed' : ''}`}
                                  onClick={() => handleOpenDetail(bidding, 'bidding')}
                                >
                                  <div className="card-header-main">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                      <BiddingProductImage
                                        imageUrl={bidding.product_image_url || bidding.product_donations?.image_url}
                                        productName={bidding.product_name}
                                        size="small"
                                      />
                                      <h3 style={{ margin: 0 }}>{bidding.product_name}</h3>
                                    </div>
                                    <span className={`status-badge ${displayStatus} ${bidding.winner_name === 'NO_BIDS_UNREAD' ? 'blink-unread' : ''}`}>
                                      {displayStatus} {bidding.winner_name === 'NO_BIDS_UNREAD' ? '(NEW)' : ''}
                                    </span>
                                  </div>
                                  <div className="card-details-preview">
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 4px 0', fontWeight: 500 }}>
                                      Starting Price: PKR {parseFloat(bidding.starting_price).toLocaleString()}
                                    </p>
                                    <p style={{ color: '#124074', fontWeight: 700, margin: 0, fontSize: '1rem' }}>
                                      {displayStatus === 'active' ? 'Current Bid:' : 
                                       (bidding.highest_bidder_id ? 'Winning Bid:' : 'Winning Bid:')} 
                                      <span style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>
                                        {!bidding.highest_bidder_id ? '-' : `PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()}`}
                                      </span>
                                    </p>
                                    <div className="card-time-info" style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <span className="card-meta-info">
                                        <Calendar size={14} /> <strong>Start:</strong> {new Date(bidding.bid_start_date).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                      <span className="card-meta-info">
                                        <Calendar size={14} /> <strong>End:</strong> {new Date(bidding.bid_end_date).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="click-hint">
                                    <span>Manage bidding</span>
                                    <Gavel size={14} />
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        {hasMoreBidding && (
                          <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <button
                              className="btn-add-bidding"
                              onClick={handleLoadMoreBidding}
                              disabled={biddingLoadingMore || loadingMore}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                            >
                              {(biddingLoadingMore || loadingMore) && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                              {(biddingLoadingMore || loadingMore) ? "Loading..." : "Load More Auctions"}
                            </button>
                            <p style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                              Showing {biddingProducts.length} of {biddingTotal}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

              </>
            )}
          </div>
        </div>
      </main>

      {/* Bidding Product Modal */}
      {showBiddingModal && (
        <div className="bidding-modal-overlay" onClick={closeBiddingModal}>
          <div className="bidding-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bidding-modal-header">
              <h3>Add Product to Bidding</h3>
              <button className="bidding-modal-close" onClick={closeBiddingModal}>
                ✕
              </button>
            </div>
            <div className="bidding-modal-content">
              {!selectedProductForBidding ? (
                <div>
                  <p className="bidding-modal-instruction">Select an approved product to add to bidding. Items available for request are listed; requested items are hidden. Products already in bidding show &quot;Already in bidding&quot;.</p>
                  <div className="bidding-product-list">
                    {productDonations
                      // Only approved products are candidates
                      .filter((p) => p.status === "approved")
                      .map((product) => {
                        const productId = product.id;

                        // Check if there's any record that resulted in a winner
                        const inBiddingWon = biddingProducts.some(
                          (bp) => Number(bp.product_donation_id) === Number(productId) && bp.winner_id
                        );

                        // Only upcoming/active bids are considered "already in bidding"
                        const inBiddingActive = biddingProducts.some(
                          (bp) =>
                            Number(bp.product_donation_id) === Number(productId) &&
                            ["upcoming", "active"].includes(bp.status)
                        );

                        // Requests that are not rejected
                        const hasActiveRequest = productRequests.some(
                          (r) =>
                            Number(r.product_donation_id) === Number(productId) &&
                            r.status !== "rejected"
                        );

                        // 1) If product was already won, hide it entirely
                        if (inBiddingWon) return null;

                        // 2) If product is requested (pending/approved) and not in active bidding, hide it
                        if (!inBiddingActive && hasActiveRequest) return null;

                        // At this point:
                        // - Either product is available (no request, not in bidding)
                        // - Or product is in upcoming/active bidding
                        return (
                          <div
                            key={product.id}
                            className={`bidding-product-card ${inBiddingActive ? "disabled" : ""
                              }`}
                            onClick={() =>
                              !inBiddingActive && openBiddingModal(product)
                            }
                          >
                            <div className="bidding-product-info">
                              <strong className="bidding-product-name">
                                {product.product_name || "Unnamed Product"}
                              </strong>
                              <p className="bidding-product-category">
                                {product.category}
                              </p>
                            </div>
                            {inBiddingActive && (
                              <span className="bidding-product-badge">
                                Already in bidding
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateBiddingProduct} className="bidding-form">
                  {biddingFeedback && biddingFeedback.type === 'error' && (
                    <div 
                      ref={biddingErrorRef}
                      className="bidding-error-inline" 
                      style={{ color: '#ef4444', background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid #fee2e2' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={16} />
                        <strong>Error: </strong> {biddingFeedback.message}
                      </div>
                    </div>
                  )}
                  {biddingFeedback && biddingFeedback.type === 'success' && (
                    <div 
                      className="bidding-success-inline" 
                      style={{ color: '#10b981', background: '#ecfdf5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid #d1fae5' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldCheck size={16} />
                        <strong>Success: </strong> {biddingFeedback.message}
                      </div>
                    </div>
                  )}
                  <div className="bidding-selected-product">
                    <strong>Selected Product:</strong>
                    <p className="bidding-selected-name">{selectedProductForBidding.product_name || "Unnamed Product"}</p>
                    <p className="bidding-selected-category">{selectedProductForBidding.category}</p>
                  </div>
                  <div className="bidding-form-group">
                    <label htmlFor="starting-price">
                      Starting Price (PKR) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="starting-price"
                      min="0"
                      step="0.01"
                      value={biddingFormData.startingPrice}
                      onChange={(e) =>
                        setBiddingFormData({ ...biddingFormData, startingPrice: e.target.value })
                      }
                      required
                      className="bidding-form-input"
                    />
                  </div>
                  <div className="bidding-form-group">
                    <label htmlFor="bid-start-date">
                      Bid Start Date <span className="required">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      id="bid-start-date"
                      value={biddingFormData.bidStartDate}
                      onChange={(e) =>
                        setBiddingFormData({ ...biddingFormData, bidStartDate: e.target.value })
                      }
                      onKeyDown={(e) => e.preventDefault()}
                      required
                      className="bidding-form-input"
                    />
                  </div>
                  <div className="bidding-form-group">
                    <label htmlFor="bid-end-date">
                      Bid End Date <span className="required">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      id="bid-end-date"
                      value={biddingFormData.bidEndDate}
                      onChange={(e) =>
                        setBiddingFormData({ ...biddingFormData, bidEndDate: e.target.value })
                      }
                      onKeyDown={(e) => e.preventDefault()}
                      required
                      className="bidding-form-input"
                    />
                  </div>
                  <div className="bidding-modal-actions">
                    <button
                      type="button"
                      className="bidding-btn-cancel"
                      onClick={closeBiddingModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="bidding-btn-back"
                      onClick={() => setSelectedProductForBidding(null)}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className={`bidding-btn-submit ${biddingLoading ? 'btn-loading' : ''}`}
                      disabled={biddingLoading}
                    >
                      {biddingLoading ? "Creating..." : "Create Bidding"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Bids Modal */}
      {showBidsModal && selectedBiddingForBids && (
        <div className="bidding-modal-overlay" onClick={closeBidsModal}>
          <div className="bidding-modal view-bids-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bidding-modal-header">
              <h3>Bids for: {selectedBiddingForBids.product_name || "Unnamed Product"}</h3>
              <button className="bidding-modal-close" onClick={closeBidsModal}>
                ✕
              </button>
            </div>
            <div className="bidding-modal-content">
              <div className="bids-summary">
                <div className="bids-summary-item">
                  <span className="bids-summary-label">Current Highest Bid</span>
                  <span className="bids-summary-value">
                    PKR {parseFloat(selectedBiddingForBids.current_highest_bid || selectedBiddingForBids.starting_price).toLocaleString()}
                  </span>
                </div>
                {selectedBiddingForBids.highest_bidder_name && (
                  <div className="bids-summary-item">
                    <span className="bids-summary-label">Highest Bidder</span>
                    <span className="bids-summary-value">{selectedBiddingForBids.highest_bidder_name}</span>
                  </div>
                )}
                <div className="bids-summary-item">
                  <span className="bids-summary-label">Total Bids</span>
                  <span className="bids-summary-value">{bidsList.length}</span>
                </div>
              </div>

              {bidsList.length === 0 ? (
                <div className="bids-empty-state">
                  <p>No bids placed yet.</p>
                </div>
              ) : (
                <div className="bids-table-container">
                  <table className="bids-table">
                    <thead>
                      <tr>
                        <th>Bidder</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bidsList.map((bid, index) => (
                        <tr key={bid.id} className={bid.is_winning_bid ? "winning-bid" : ""}>
                          <td className="bid-bidder">{bid.user_name}</td>
                          <td className="bid-amount">
                            PKR {parseFloat(bid.bid_amount).toLocaleString()}
                          </td>
                          <td className="bid-date">
                            {new Date(bid.created_at).toLocaleString()}
                          </td>
                          <td className="bid-status">
                            {bid.is_winning_bid ? (
                              <span className="winning-badge">🏆 Winning</span>
                            ) : (
                              <span className="bid-status-placeholder">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bidding-modal-actions">
                <button
                  className="bidding-btn-submit"
                  onClick={closeBidsModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="bidding-modal-overlay" onClick={closeDetailModal}>
          <div className="bidding-modal detail-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="bidding-modal-header">
              <h3 style={{ fontWeight: 400, letterSpacing: '0.05em' }}>{selectedType.replace('_', ' ').toUpperCase()} DETAILS</h3>
              <button className="bidding-modal-close" onClick={closeDetailModal}>✕</button>
            </div>
            <div className="bidding-modal-content">
              <div className="admin-detail-card">
                <div className="detail-card-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{selectedItem.user_name || selectedItem.product_name}</h2>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>{selectedItem.user_email || selectedItem.product_category}</p>
                  </div>
                  <span className={`status-badge ${
                    (selectedType === 'bidding' && selectedItem.status === 'ended' && selectedItem.highest_bidder_id && (!selectedItem.payment_verified || !selectedItem.delivery_arranged)) 
                    ? 'pending' 
                    : (selectedType === 'bidding' && selectedItem.status === 'ended' && !selectedItem.highest_bidder_id)
                    ? 'ended'
                    : selectedItem.status
                  }`}>
                    {(selectedType === 'bidding' && selectedItem.status === 'ended' && selectedItem.highest_bidder_id && (!selectedItem.payment_verified || !selectedItem.delivery_arranged)) 
                    ? 'pending' 
                    : (selectedType === 'bidding' && selectedItem.status === 'ended' && !selectedItem.highest_bidder_id)
                    ? 'ended'
                    : selectedItem.status}
                  </span>
                </div>

                <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  {selectedType === 'verification' && (
                    <>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Email</label>
                        <p style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>{selectedItem.user_email || 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Submitted Date</label>
                        <p style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                          {selectedItem.submitted_at
                            ? new Date(selectedItem.submitted_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })
                            : selectedItem.created_at
                              ? new Date(selectedItem.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })
                              : 'N/A'}
                        </p>
                      </div>
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.75rem' }}>Verification Documents</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <HandHeart size={16} style={{ color: '#1db5f4' }} /> Affidavit
                            </span>
                            {selectedItem.affidavit_url ? (
                              <button
                                onClick={() => handleViewDocument(selectedItem.affidavit_url, selectedItem.affidavit_name || 'affidavit')}
                                style={{ padding: '0.4rem 0.8rem', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                View Document
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Not Submitted</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <HandHeart size={16} style={{ color: '#1db5f4' }} /> Bank Statement
                            </span>
                            {selectedItem.bank_statement_url ? (
                              <button
                                onClick={() => handleViewDocument(selectedItem.bank_statement_url, selectedItem.bank_statement_name || 'bank_statement')}
                                style={{ padding: '0.4rem 0.8rem', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                View Document
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Not Submitted</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <HandHeart size={16} style={{ color: '#1db5f4' }} /> Rent Agreement
                            </span>
                            {selectedItem.rent_agreement_url ? (
                              <button
                                onClick={() => handleViewDocument(selectedItem.rent_agreement_url, selectedItem.rent_agreement_name || 'rent_agreement')}
                                style={{ padding: '0.4rem 0.8rem', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                View Document
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Not Submitted</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedType === 'cash_request' && (
                    <>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Requested Amount</label>
                        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>PKR {selectedItem.amount}</p>
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Category</label>
                        <p>{selectedItem.category}</p>
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Submitted Date</label>
                        <p>{new Date(selectedItem.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        {selectedItem.description && selectedItem.description.includes('[PAYMENT DETAILS]') ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                              <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Reason / Description</label>
                              <p style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', margin: 0, border: '1px solid #e2e8f0', color: '#1e293b', lineHeight: '1.6' }}>
                                {selectedItem.description.split('[PAYMENT DETAILS]')[0].trim() || 'No description provided'}
                              </p>
                            </div>
                            <div style={{ background: '#f0f9ff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                              <label style={{ fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <i className="ri-bank-card-line" style={{ fontSize: '1.1rem' }}></i> Payment Details (Receiving)
                              </label>
                              <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e0f2fe', color: '#0c4a6e', fontSize: '0.95rem', whiteSpace: 'pre-line', fontWeight: 500 }}>
                                {selectedItem.description.split('[PAYMENT DETAILS]')[1].trim()}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Reason / Description</label>
                            <p style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#1e293b', lineHeight: '1.6' }}>
                              {selectedItem.description || 'No description provided'}
                            </p>
                          </>
                        )}
                      </div>

                      {selectedItem.proof_url && (
                        <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Proof of Need / Document</label>
                          <DocumentViewer
                            filePath={selectedItem.proof_url}
                            fileName="proof_document"
                            label="View Document"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {selectedType === 'product_request' && (
                    <>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Product Requested</label>
                        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedItem.product_name}</p>
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Category</label>
                        <p>{selectedItem.product_category}</p>
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Submitted Date</label>
                        <p>{new Date(selectedItem.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        {selectedItem.reason && selectedItem.reason.includes('[DELIVERY ADDRESS]') ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                              <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Reason</label>
                              <p style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', margin: 0, border: '1px solid #e2e8f0', color: '#1e293b', lineHeight: '1.6' }}>
                                {selectedItem.reason.split('[DELIVERY ADDRESS]')[0].trim() || 'No reason provided'}
                              </p>
                            </div>
                            <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                              <label style={{ fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <i className="ri-map-pin-line" style={{ fontSize: '1.1rem' }}></i> Delivery Address
                              </label>
                              <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #dcfce7', color: '#14532d', fontSize: '0.95rem', whiteSpace: 'pre-line', fontWeight: 500 }}>
                                {selectedItem.reason.split('[DELIVERY ADDRESS]')[1].trim()}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Reason</label>
                            <p style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#1e293b', lineHeight: '1.6' }}>
                              {selectedItem.reason || 'No reason provided'}
                            </p>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {(selectedType === 'cash_donation' || selectedType === 'product_donation') && (
                    <>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>{selectedType === 'cash_donation' ? 'Donated Amount' : 'Product Name'}</label>
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: selectedType === 'cash_donation' ? '#10b981' : 'inherit' }}>{selectedType === 'cash_donation' ? `PKR ${selectedItem.amount}` : selectedItem.product_name}</p>
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Category</label>
                        <p>{selectedItem.category}</p>
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Donated On</label>
                        <p>{new Date(selectedItem.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>{selectedType === 'cash_donation' ? 'Message' : 'Description'}</label>
                        <p style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>{selectedItem.message || selectedItem.description || "No message provided"}</p>
                      </div>
                      {(selectedItem.screenshot_url || selectedItem.image_url || selectedItem.payment_gateway === 'stripe') && (
                        <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>{selectedType === 'cash_donation' ? 'Payment Verification' : 'Product Image'}</label>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {selectedItem.payment_gateway === 'stripe' ? (
                              <div style={{
                                background: '#f0f4ff',
                                border: '1px solid #c7d2fe',
                                padding: '1rem',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%'
                              }}>
                                <div style={{ background: '#6366f1', padding: '8px', borderRadius: '8px', color: 'white' }}>
                                  <ShieldCheck size={24} />
                                </div>
                                <div>
                                  <h4 style={{ margin: 0, color: '#312e81' }}>Verified via Stripe Checkout</h4>
                                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#4338ca' }}>This payment was processed and verified automatically by Stripe.</p>
                                </div>
                              </div>
                            ) : (
                              <>
                                {selectedItem.screenshot_url && (
                                  <DocumentViewer
                                    filePath={selectedItem.screenshot_url}
                                    fileName="payment_screenshot"
                                    label="View Payment Proof"
                                  />
                                )}
                                {selectedItem.image_url && (
                                  <DocumentViewer
                                    filePath={selectedItem.image_url}
                                    fileName="product_image"
                                    label="View Product Image"
                                  />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedType === 'bidding' && (
                    <>
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Product Image</label>
                        { (selectedItem.product_image_url || selectedItem.product_donations?.image_url) ? (
                          <div style={{ maxWidth: '300px' }}>
                            <BiddingProductImage
                              imageUrl={selectedItem.product_image_url || selectedItem.product_donations?.image_url}
                              productName={selectedItem.product_name}
                              size="large"
                            />
                          </div>
                        ) : (
                          <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No image available</p>
                        )}
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Starting Price</label>
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>PKR {parseFloat(selectedItem.starting_price).toLocaleString()}</p>
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Current/Winning Bid</label>
                        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6' }}>
                          {!selectedItem.highest_bidder_id ? '-' : `PKR ${parseFloat(selectedItem.current_highest_bid).toLocaleString()}`}
                        </p>
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Start Date & Time</label>
                        <p>{new Date(selectedItem.bid_start_date).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                      </div>
                      <div className="detail-item">
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>End Date & Time</label>
                        <p>{new Date(selectedItem.bid_end_date).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                      </div>
                      <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Product Description</label>
                        <p style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>{selectedItem.product_description || "No description"}</p>
                      </div>
                      {selectedItem.highest_bidder_name && (
                        <div className="detail-item">
                          <label style={{ fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Highest Bidder</label>
                          <p style={{ fontWeight: 600 }}>{selectedItem.highest_bidder_name}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="bidding-modal-actions" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                  {selectedItem.status === "pending" && (
                    <>
                      <button
                        className="bidding-btn-submit"
                        disabled={submittingId !== null}
                        onClick={async () => {
                          if (selectedType === 'verification') await handleApprove(selectedItem);
                          else if (selectedType === 'cash_request') await handleApproveRequest(selectedItem.id);
                          else if (selectedType === 'product_request') await handleApproveProductRequest(selectedItem.id);
                          else if (selectedType === 'cash_donation') await handleApproveDonation(selectedItem.id);
                          else if (selectedType === 'product_donation') await handleApproveProductDonation(selectedItem.id);
                          closeDetailModal();
                        }}
                        style={{
                          background: '#10b981',
                          opacity: submittingId !== null ? 0.7 : 1,
                          cursor: submittingId !== null ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          minWidth: '100px'
                        }}
                      >
                        {(submittingId === `verify-${selectedItem.id}` ||
                          submittingId === `cash-req-${selectedItem.id}` ||
                          submittingId === `prod-req-${selectedItem.id}` ||
                          submittingId === `cash-don-${selectedItem.id}` ||
                          submittingId === `prod-don-${selectedItem.id}`) ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        ) : "Approve"}
                      </button>
                      <button
                        className="bidding-btn-cancel"
                        disabled={submittingId !== null}
                        onClick={() => {
                          let type = selectedType === 'cash_request' ? 'request' : selectedType === 'product_donation' ? 'product-donation' : selectedType === 'product_request' ? 'product-request' : selectedType;
                          openRejectModal(type, selectedItem.id, selectedItem.user_name || selectedItem.product_name);
                          // We don't closeDetailModal here because the reject modal will handle it after submission
                        }}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          opacity: submittingId !== null ? 0.7 : 1,
                          cursor: submittingId !== null ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {selectedType === 'bidding' && (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button className="bidding-btn-submit" onClick={() => { openBidsModal(selectedItem); closeDetailModal(); }}>View Bids</button>
                      
                      {selectedItem.status === 'upcoming' && (
                        <button
                          className="bidding-btn-submit"
                          style={{ background: '#ef4444' }}
                          onClick={() => { handleEndAuction(selectedItem.id); closeDetailModal(); }}
                        >
                          Cancel Auction
                        </button>
                      )}


                      {selectedItem.status === 'ended' && selectedItem.highest_bidder_name && (
                        <>
                          <button
                            className="bidding-btn-submit"
                            onClick={() => { handleVerifyPayment(selectedItem.id); closeDetailModal(); }}
                            style={{
                              background: "#10b981",
                              opacity: selectedItem.payment_verified ? 0.5 : 1,
                              cursor: selectedItem.payment_verified ? "not-allowed" : "pointer",
                            }}
                            disabled={selectedItem.payment_verified}
                          >
                            {selectedItem.payment_verified ? "Payment Verified" : "Verify Payment"}
                          </button>
                          <button
                            className="bidding-btn-submit"
                            onClick={() => { handleArrangeDelivery(selectedItem.id); closeDetailModal(); }}
                            style={{
                              background: selectedItem.payment_verified ? "#3b82f6" : "#f59e0b",
                              opacity: (selectedItem.delivery_arranged || !selectedItem.payment_verified) ? 0.5 : 1,
                              cursor: (selectedItem.delivery_arranged || !selectedItem.payment_verified) ? "not-allowed" : "pointer",
                            }}
                            disabled={selectedItem.delivery_arranged || !selectedItem.payment_verified}
                          >
                            {selectedItem.delivery_arranged ? "Delivery Arranged" : "Arrange Delivery"}
                          </button>
                        </>
                      )}

                    </div>
                  )}
                  <button className="bidding-btn-back" onClick={closeDetailModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModal && (
        <div className="reject-modal-overlay" onClick={() => !submittingId && setRejectModal(null)}>  {/*if click on background model close */}
          <div className="reject-modal" onClick={(e) => e.stopPropagation()}>    {/*if click inside model dont close */}
            <div className="reject-modal-header">
              <h3>Reject {rejectModal.type === "verification" ? "Verification" : rejectModal.type === "request" ? "Request" : rejectModal.type === "product-donation" ? "Product Donation" : "Donation"}</h3>
              <button className="btn-close-modal" onClick={handleCancelRejection}>
                ✕
              </button>
            </div>
            <div className="reject-modal-content">
              <p className="reject-modal-info">
                You are about to reject {rejectModal.name}'s {rejectModal.type === "verification" ? "verification request" : rejectModal.type === "request" ? "cash request" : rejectModal.type === "product-donation" ? "product donation" : rejectModal.type === "product-request" ? "product request" : "donation"}.
              </p>
              <div className="reject-reason-input">
                <label htmlFor="rejection-reason">
                  Rejection Reason <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection (e.g., Missing documents, Invalid information, etc.)"
                  rows="4"
                  required
                />

              </div>
              <div className="reject-modal-actions">
                <button
                  className="btn-cancel-reject"
                  onClick={handleCancelRejection}
                  disabled={!!submittingId} // Disable only when actual DB call starts
                >
                  Cancel
                </button>
                <button
                  className="btn-confirm-reject"
                  onClick={() => {
                    if (rejectionCountdown === null && !submittingId) {
                      startRejectionCountdown();
                    }
                  }}
                  disabled={!rejectionReason.trim() || !!submittingId || rejectionCountdown !== null}
                  style={{ position: 'relative' }}
                >
                  {submittingId || rejectionCountdown !== null ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mx-auto"></div>
                  ) : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="document-modal-overlay" onClick={closeDocumentViewer}>
          <div className="document-modal" onClick={(e) => e.stopPropagation()}>
            <div className="document-modal-header">
              <h3>{viewingDocument}</h3>
              <button className="btn-close-modal" onClick={closeDocumentViewer}>
                ✕
              </button>
            </div>
            <div className="document-modal-content">
              {documentLoading ? (
                <div className="document-loading">
                  <p>⏳ Loading document...</p>
                </div>
              ) : documentUrl ? (
                <>
                  {viewingDocument.toLowerCase().endsWith(".pdf") ||
                    documentUrl.toLowerCase().includes(".pdf") ? (
                    <iframe
                      src={documentUrl}
                      className="pdf-viewer-modal"
                      title="Document"
                    />
                  ) : (
                    <img
                      src={documentUrl}
                      alt="Document"
                      className="document-image-modal"
                    />
                  )}
                  <div className="document-modal-actions">
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-open-new-tab"
                    >
                      🔗 Open in New Tab
                    </a>
                  </div>
                </>
              ) : (
                <div className="document-error">
                  <p>❌ Unable to load document</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

import { useNavigate, useLocation, Link } from "react-router-dom";

import { Gavel, Clock, TrendingUp, Eye, Timer, Filter, X, ArrowLeft, Calendar, User, Package } from "lucide-react";



import { supabase } from "../supabaseClient";

import LoadingSpinner from "../components/LoadingSpinner";

import ErrorMessage from "../components/ErrorMessage";

import SkeletonLoader from "../components/SkeletonLoader";
import CustomDropdown from "../components/CustomDropdown";

import { getErrorMessage, isNetworkError, shouldRetry, getRetryDelay } from "../utils/errorHandler";

import "../styles/BiddingPage.css";

import "../styles/BackButton.css";



function BiddingPage() {

  const navigate = useNavigate();

  const location = useLocation();

  const [biddingProducts, setBiddingProducts] = useState([]);

  const [filteredProducts, setFilteredProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("all"); // all, active, upcoming, ended, completed

  const [categoryFilter, setCategoryFilter] = useState("all");

  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, price-low, price-high, ending-soon

  const [selectedProduct, setSelectedProduct] = useState(null);

  const [productImageUrl, setProductImageUrl] = useState(null);

  const [bidHistory, setBidHistory] = useState([]);

  const [showBidHistory, setShowBidHistory] = useState(false);

  const [showBidHistoryButton, setShowBidHistoryButton] = useState(false);

  const [showBidModal, setShowBidModal] = useState(false);

  const [bidAmount, setBidAmount] = useState("");

  const [bidLoading, setBidLoading] = useState(false);

  const [feedback, setFeedback] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);

  const [error, setError] = useState(null);

  const [retryCount, setRetryCount] = useState(0);



  // Refs to prevent infinite loops and manage cleanup

  const hasOpenedBidModalRef = useRef(false);

  const loadingRef = useRef(false);

  const abortControllerRef = useRef(null);



  // Load current user on mount

  useEffect(() => {

    const user = localStorage.getItem("currentUser");

    setCurrentUser(user ? JSON.parse(user) : null);

  }, []);



  useEffect(() => {

    // Create abort controller for cleanup

    abortControllerRef.current = new AbortController();



    loadBiddingProducts();

    // Refresh every 2 minutes to update bids and product status

    // This is less frequent than before (was 30 seconds) to reduce unnecessary re-renders

    // The countdown timers update independently every second without full page refresh

    const interval = setInterval(() => {

      if (!loadingRef.current) {

        loadBiddingProducts();

      }

    }, 120000); // 2 minutes instead of 30 seconds



    return () => {

      clearInterval(interval);

      if (abortControllerRef.current) {

        abortControllerRef.current.abort();

      }

    };

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);



  // Check for productId in URL to auto-open bid modal after login (only once)

  useEffect(() => {

    // Prevent running multiple times

    if (hasOpenedBidModalRef.current) return;



    const searchParams = new URLSearchParams(location.search);

    const productId = searchParams.get("productId");

    const openBid = searchParams.get("openBid") === "true";



    // Only check URL params, not biddingProducts to avoid infinite loop

    if (productId && openBid && currentUser) {

      // Wait for products to load, then find and open modal

      const checkAndOpen = () => {

        if (biddingProducts.length === 0) {

          // Products not loaded yet, check again in 100ms

          setTimeout(checkAndOpen, 100);

          return;

        }



        const product = biddingProducts.find(p => p.id === parseInt(productId));

        if (product && !hasOpenedBidModalRef.current) {

          hasOpenedBidModalRef.current = true;



          // First view the product (loads image and bid history)

          handleViewProduct(product);



          // Then open bid modal after a small delay

          const timeoutId = setTimeout(() => {

            // Check if user is logged in and product is active

            if (currentUser && product.status === "active") {

              setShowBidModal(true);

              setBidAmount("");

              setFeedback(null);

            }

          }, 1000);



          // Clean URL

          navigate("/bidding", { replace: true });



          return () => clearTimeout(timeoutId);

        }

      };



      checkAndOpen();

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [location.search, currentUser]);



  // Helper function to calculate product status (extracted to avoid duplication)

  const calculateProductStatus = useCallback((product, now = new Date()) => {

    // If status is already "completed" in database, respect it (set by admin)

    if (product.status === "completed") {

      return "completed";

    }



    const startDate = new Date(product.bid_start_date);

    const endDate = new Date(product.bid_end_date);



    if (now < startDate) {

      return "upcoming";

    } else if (now >= startDate && now <= endDate) {

      return "active";

    } else {

      return "ended";

    }

  }, []);



  const loadBiddingProducts = useCallback(async () => {

    // Prevent concurrent calls

    if (loadingRef.current) return;



    try {

      loadingRef.current = true;

      setLoading(true);



      // Load only active and upcoming bidding products (like BiddingGallery)

      const { data, error } = await supabase

        .from("bidding_products")

        .select("*")

        .in('status', ['active', 'upcoming'])

        .order("bid_start_date", { ascending: true });



      if (error) throw error;



      // Update status based on current time

      const now = new Date();



      const updated = (data || []).map((product) => {

        // Calculate status based on dates

        let status = calculateProductStatus(product, now);



        // Only keep active/upcoming products

        if (status !== 'active' && status !== 'upcoming') {

          return null;

        }



        return { ...product, status };

      }).filter(Boolean); // Remove null values



      setBiddingProducts(updated);



    } catch (error) {

      console.error("Error loading bidding products:", error);

      if (error.name !== "AbortError") {

        const errorMessage = getErrorMessage(error);

        setError(errorMessage);

        setFeedback({

          type: "error",

          message: errorMessage

        });

      }

    } finally {

      loadingRef.current = false;

      setLoading(false);

    }

  }, [calculateProductStatus]);



  const handleRetry = useCallback(() => {

    setError(null);

    setRetryCount(prev => prev + 1);

    setTimeout(() => {

      loadBiddingProducts();

    }, getRetryDelay(retryCount));

  }, [retryCount, loadBiddingProducts]);





  // Filter and sort products based on search, filters, and sort options

  useEffect(() => {

    let filtered = [...biddingProducts];



    // Filter by search term

    if (searchTerm.trim()) {

      const search = searchTerm.toLowerCase();

      filtered = filtered.filter((product) => {

        return (

          (product.product_name && product.product_name.toLowerCase().includes(search)) ||

          (product.product_description && product.product_description.toLowerCase().includes(search)) ||

          (product.product_category && product.product_category.toLowerCase().includes(search)) ||

          (product.highest_bidder_name && product.highest_bidder_name.toLowerCase().includes(search))

        );

      });

    }



    // Filter by status (only active/upcoming available)

    if (statusFilter !== "all") {

      filtered = filtered.filter((product) => product.status === statusFilter);

    }

    // Note: All products are already active/upcoming, so no need for additional filtering



    // Filter by category

    if (categoryFilter !== "all") {

      filtered = filtered.filter((product) => product.product_category === categoryFilter);

    }



    // Sort products

    if (sortBy === "oldest") {

      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    } else if (sortBy === "ending-soon") {

      filtered.sort((a, b) => new Date(a.bid_end_date) - new Date(b.bid_end_date));

    } else if (sortBy === "price-low") {

      filtered.sort((a, b) => (a.current_highest_bid || a.starting_price) - (b.current_highest_bid || b.starting_price));

    } else if (sortBy === "price-high") {

      filtered.sort((a, b) => (b.current_highest_bid || b.starting_price) - (a.current_highest_bid || a.starting_price));

    } else {

      // Default: newest first

      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    }



    setFilteredProducts(filtered);

  }, [biddingProducts, searchTerm, statusFilter, categoryFilter, sortBy]);



  const getSignedUrl = async (filePath) => {

    if (!filePath) return null;

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



  // Check and set winner for a product that just ended

  const checkAndSetWinnerForProduct = async (product) => {

    try {

      // Only check if bid has ended and has a highest bidder but no winner yet

      if (!product.highest_bidder_id) return;



      const { error: updateError } = await supabase

        .from("bidding_products")

        .update({

          status: "ended",

          winner_id: product.highest_bidder_id,

          winner_name: product.highest_bidder_name,

          winner_email: product.highest_bidder_email,

        })

        .eq("id", product.id);



      if (updateError) {

        console.error(`Error setting winner for product ${product.id}:`, updateError);

        return false;

      }



      console.log(`✅ Winner set for product ${product.id}: ${product.highest_bidder_name}`);

      return true; // Success

    } catch (error) {

      console.error("Error checking winner:", error);

      return false;

    }

  };



  const handleViewProduct = useCallback(async (product) => {

    setSelectedProduct(product);

    setProductImageUrl(null);



    // Load image and bid history in parallel

    const [imageUrl, bidHistoryData] = await Promise.allSettled([

      product.product_image_url ? getSignedUrl(product.product_image_url) : Promise.resolve(null),

      loadBidHistory(product.id)

    ]);



    if (imageUrl.status === "fulfilled" && imageUrl.value) {

      setProductImageUrl(imageUrl.value);

    }



    // Check if this product just ended and needs winner set (immediate check)

    const now = new Date();

    const endDate = new Date(product.bid_end_date);

    if (now > endDate && !product.winner_id && product.highest_bidder_id) {

      const winnerSet = await checkAndSetWinnerForProduct(product);

      if (winnerSet) {

        // Reload this specific product to show updated winner

        const { data: updatedProduct, error } = await supabase

          .from("bidding_products")

          .select("*")

          .eq("id", product.id)

          .single();



        if (!error && updatedProduct) {

          const status = calculateProductStatus(updatedProduct);

          const productWithStatus = { ...updatedProduct, status };

          setSelectedProduct(productWithStatus);

          // Also update in the list

          setBiddingProducts(prev => prev.map(p =>

            p.id === product.id ? productWithStatus : p

          ));

        }

      }

    }

  }, [calculateProductStatus]);



  const loadBidHistory = useCallback(async (biddingProductId) => {

    try {

      const { data, error } = await supabase

        .from("bids")

        .select("*")

        .eq("bidding_product_id", biddingProductId)

        .order("created_at", { ascending: false })

        .limit(10);



      if (error) throw error;

      setBidHistory(data || []);

    } catch (error) {

      console.error("Error loading bid history:", error);

      setBidHistory([]);

    }

  }, []);



  const closeProductDetail = () => {

    setSelectedProduct(null);

    setProductImageUrl(null);

    setBidHistory([]);

    setShowBidHistory(false);

    setShowBidModal(false);

    setBidAmount("");

  };



  const openBidModal = () => {

    const user = localStorage.getItem("currentUser");

    if (!user) {

      setFeedback({ type: "error", message: "Please login to place a bid." });

      setTimeout(() => {

        // Store return URL with product ID so user comes back and modal opens

        const productId = selectedProduct?.id;

        if (productId) {

          navigate(`/login?returnUrl=/bidding&productId=${productId}&openBid=true`);

        } else {

          navigate("/login?returnUrl=/bidding");

        }

      }, 1500);

      return;

    }



    // Check if bidding is still active

    if (selectedProduct.status !== "active") {

      setFeedback({ type: "error", message: "Bidding is not active for this product." });

      return;

    }



    setShowBidModal(true);

    setBidAmount("");

    setFeedback(null);

  };



  const closeBidModal = useCallback(() => {

    setShowBidModal(false);

    setBidAmount("");

    setFeedback(null);

  }, []);



  const handlePlaceBid = useCallback(async (e) => {

    e.preventDefault();

    if (!selectedProduct || bidLoading) return;



    if (!currentUser) {

      setFeedback({ type: "error", message: "Please login to place a bid." });

      // Store return URL with product ID so user comes back and modal opens

      const productId = selectedProduct?.id;

      if (productId) {

        navigate(`/login?returnUrl=/bidding&productId=${productId}&openBid=true`);

      } else {

        navigate("/login?returnUrl=/bidding");

      }

      return;

    }



    // Validate bid amount

    const bidAmountNum = parseFloat(bidAmount);

    if (!bidAmount || isNaN(bidAmountNum) || bidAmountNum <= 0) {

      setFeedback({ type: "error", message: "Please enter a valid bid amount." });

      return;

    }



    // Get current highest bid

    const currentHighestBid = parseFloat(selectedProduct.current_highest_bid || selectedProduct.starting_price);



    // Validate bid is higher than current

    if (bidAmountNum <= currentHighestBid) {

      setFeedback({

        type: "error",

        message: `Your bid must be higher than the current highest bid of PKR ${currentHighestBid.toLocaleString()}.`

      });

      return;

    }



    // Check if bidding is still active

    const now = new Date();

    const endDate = new Date(selectedProduct.bid_end_date);

    if (now > endDate) {

      setFeedback({ type: "error", message: "Bidding has ended for this product." });

      return;

    }



    // Check if user is trying to bid on their own product (if they donated it)

    // This would require checking the product_donation_id's user_id

    // For now, we'll allow it but could add this check later



    setBidLoading(true);

    setFeedback(null);



    try {

      // Insert bid

      const { data: bidData, error: bidError } = await supabase

        .from("bids")

        .insert([

          {

            bidding_product_id: selectedProduct.id,

            user_id: currentUser.id,

            user_name: currentUser.name,

            user_email: currentUser.email,

            bid_amount: bidAmountNum,

          },

        ])

        .select()

        .single();



      if (bidError) throw bidError;



      // The database trigger will automatically update the highest bid

      // Reload the selected product and bid history in parallel

      const [updatedProductResult, bidHistoryResult] = await Promise.allSettled([

        supabase

          .from("bidding_products")

          .select("*")

          .eq("id", selectedProduct.id)

          .single(),

        loadBidHistory(selectedProduct.id)

      ]);



      if (updatedProductResult.status === "fulfilled" && updatedProductResult.value.data) {

        const updatedProduct = updatedProductResult.value.data;

        const status = calculateProductStatus(updatedProduct);

        setSelectedProduct({ ...updatedProduct, status });

        // Also update in the list

        setBiddingProducts(prev => prev.map(p =>

          p.id === selectedProduct.id ? { ...updatedProduct, status } : p

        ));

      }



      setFeedback({

        type: "success",

        message: `Successfully placed bid of PKR ${bidAmountNum.toLocaleString()}!`

      });



      // Close modal after 2 seconds

      const timeoutId = setTimeout(() => {

        closeBidModal();

        setFeedback(null);

      }, 2000);



      return () => clearTimeout(timeoutId);



    } catch (error) {

      console.error("Error placing bid:", error);

      let errorMessage = getErrorMessage(error);

      if (error.message?.includes("duplicate")) {

        errorMessage = "A bid with this amount may already exist. Please try a different amount.";

      }

      setFeedback({

        type: "error",

        message: errorMessage

      });

    } finally {

      setBidLoading(false);

    }

  }, [selectedProduct, bidAmount, currentUser, bidLoading, calculateProductStatus, loadBidHistory, navigate]);



  // Memoize expensive calculations

  const calculateTimeRemaining = useMemo(() => {

    return (endDate) => {

      const now = new Date();

      const end = new Date(endDate);

      const diff = end - now;



      if (diff <= 0) {

        return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };

      }



      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      const seconds = Math.floor((diff % (1000 * 60)) / 1000);



      return { days, hours, minutes, seconds, ended: false };

    };

  }, []);



  const CountdownTimer = ({ endDate }) => {

    const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(endDate));



    useEffect(() => {

      const interval = setInterval(() => {

        setTimeRemaining(calculateTimeRemaining(endDate));

      }, 1000);



      return () => clearInterval(interval);

    }, [endDate]);



    if (timeRemaining.ended) {

      return <div className="text-red-600 font-semibold">Bidding Ended</div>;

    }



    return (

      <div className="flex items-center gap-3">

        {timeRemaining.days > 0 && (

          <div className="flex flex-col items-center">

            <span className="text-2xl font-bold text-accent-600 font-outfit">{timeRemaining.days}</span>

            <span className="text-xs text-gray-500 font-medium">Days</span>

          </div>

        )}

        <div className="flex flex-col items-center">

          <span className="text-2xl font-bold text-accent-600 font-outfit">{String(timeRemaining.hours).padStart(2, '0')}</span>

          <span className="text-xs text-gray-500 font-medium">Hours</span>

        </div>

        <span className="text-accent-600 font-bold">:</span>

        <div className="flex flex-col items-center">

          <span className="text-2xl font-bold text-accent-600 font-outfit">{String(timeRemaining.minutes).padStart(2, '0')}</span>

          <span className="text-xs text-gray-500 font-medium">Minutes</span>

        </div>

        <span className="text-accent-600 font-bold">:</span>

        <div className="flex flex-col items-center">

          <span className="text-2xl font-bold text-accent-600 font-outfit">{String(timeRemaining.seconds).padStart(2, '0')}</span>

          <span className="text-xs text-gray-500 font-medium">Seconds</span>

        </div>

      </div>

    );

  };



  const ProductImageThumbnail = ({ filePath }) => {

    const [imageUrl, setImageUrl] = useState(null);

    const [imageLoading, setImageLoading] = useState(true);



    useEffect(() => {

      loadImage();

    }, [filePath]);



    const loadImage = async () => {

      if (!filePath) {

        setImageLoading(false);

        return;

      }

      try {

        const url = await getSignedUrl(filePath);

        setImageUrl(url);

      } catch (error) {

        console.error("Error loading image:", error);

      } finally {

        setImageLoading(false);

      }

    };



    if (imageLoading) {

      return (

        <div className="w-full h-full bg-gray-200 flex items-center justify-center">

          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>

        </div>

      );

    }



    if (!imageUrl) {

      return (

        <div className="w-full h-full bg-gray-200 flex items-center justify-center">

          <Gavel className="w-12 h-12 text-gray-400" />

        </div>

      );

    }



    return (

      <img

        src={imageUrl}

        alt="Product"

        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"

        onError={() => setImageUrl(null)}

      />

    );

  };



  const formatCurrency = (amount) => {

    if (amount >= 1000000) {

      return 'Rs. ' + (amount / 1000000).toFixed(1) + 'M';

    } else if (amount >= 1000) {

      return 'Rs. ' + (amount / 1000).toFixed(1) + 'K';

    }

    return 'Rs. ' + amount.toLocaleString();

  };



  return (

    <div className="animate-fade-in">

      {/* Back to Dashboard button (only if logged in) */}

      {currentUser && (

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

          <button

            type="button"

            onClick={() => navigate("/request-donation")}

            className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all mb-4"

          >

            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />

          </button>

        </div>

      )}



      {error && (

        <div className="max-w-7xl mx-auto px-4 mb-4">

          <ErrorMessage

            message={error}

            onRetry={shouldRetry({ message: error }, retryCount) ? handleRetry : null}

            dismissible={true}

            onDismiss={() => setError(null)}

          />

        </div>

      )}



      {feedback && feedback.type === "success" && (

        <div className="max-w-7xl mx-auto px-4 mb-4">

          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">

            <span>✅</span>

            <span>{feedback.message}</span>

          </div>

        </div>

      )}



      {/* Hero */}

      <section className="py-16 bg-gradient-to-br from-accent-50 via-white to-primary-50">

        <div className="max-w-7xl mx-auto px-4 text-center">

          <div className="inline-flex items-center gap-2 bg-accent-100 text-accent-700 px-4 py-2 rounded-full text-sm font-medium mb-6">

            <Gavel className="w-4 h-4" /><span>Live Bidding</span>

          </div>

          <h1 className="text-4xl md:text-5xl font-bold font-outfit text-gray-900 mb-4">Live <span className="gradient-text">Bidding</span></h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Bid on unique and antique items. All proceeds support our charitable causes.</p>

        </div>

      </section>

      {/* Filters */}
      <section className="py-12 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#124074] shadow-sm">
                  <Filter className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Filter & Sort</h3>
                  <p className="text-sm text-slate-400 font-medium">Refine your search</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 rounded-full border border-slate-100">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Showing <span className="text-[#124074]">{filteredProducts.length}</span> of <span className="text-slate-900">{biddingProducts.length}</span> auctions
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Status Filter */}
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <Clock className="w-3.5 h-3.5" />
                  Status
                </label>
                <CustomDropdown
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "active", label: "Active" },
                    { value: "upcoming", label: "Upcoming" }
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Select Status"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <Gavel className="w-3.5 h-3.5" />
                  Category
                </label>
                <CustomDropdown
                  options={[
                    { value: "all", label: "All Categories" },
                    { value: "Electronics", label: "Electronics" },
                    { value: "Clothes", label: "Clothes" },
                    { value: "Furniture", label: "Furniture" },
                    { value: "Toys", label: "Toys" },
                    { value: "Educational Material", label: "Educational Material" },
                    { value: "Other", label: "Other" }
                  ]}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  placeholder="Select Category"
                />
              </div>

              {/* Sort By */}
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Sort By
                </label>
                <CustomDropdown
                  options={[
                    { value: "newest", label: "Newest First" },
                    { value: "oldest", label: "Oldest First" },
                    { value: "ending-soon", label: "Ending Soon" },
                    { value: "price-low", label: "Price: Low to High" },
                    { value: "price-high", label: "Price: High to Low" }
                  ]}
                  value={sortBy}
                  onChange={setSortBy}
                  placeholder="Sort By"
                />
              </div>
            </div>

            {/* Search Box & Clear */}
            <div className="mt-10 pt-10 border-t border-slate-50 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by product name, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-6 py-4 pl-14 rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#124074]/10 focus:border-[#124074]/20 transition-all placeholder:text-slate-300"
                />
                <Eye className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              </div>

              {(searchTerm || statusFilter !== "all" || categoryFilter !== "all" || sortBy !== "newest") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                    setSortBy("newest");
                  }}
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all font-bold text-xs uppercase tracking-widest"
                >
                  <X className="w-4 h-4" />
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </section>



      {/* Auctions Grid */}

      <section className="py-12 bg-gray-50">

        <div className="max-w-7xl mx-auto px-4">

          {loading ? (

            biddingProducts.length === 0 ? (

              <div className="text-center py-12">

                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto"></div>

                <p className="mt-4 text-gray-600">Loading auctions...</p>

              </div>

            ) : (

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

                {[...Array(6)].map((_, i) => (

                  <div key={i} className="card animate-pulse">

                    <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>

                    <div className="h-4 bg-gray-200 rounded mb-2"></div>

                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>

                  </div>

                ))}

              </div>

            )

          ) : biddingProducts.length === 0 ? (

            <div className="card text-center py-12">

              <Gavel className="w-16 h-16 mx-auto text-gray-300 mb-4" />

              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Bidding</h3>

              <p className="text-gray-500">There are no products currently up for bidding. Check back later!</p>

            </div>

          ) : filteredProducts.length === 0 ? (

            <div className="card text-center py-12">

              <Eye className="w-16 h-16 mx-auto text-gray-300 mb-4" />

              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Products Found</h3>

              <p className="text-gray-500">

                {searchTerm || statusFilter !== "all" || categoryFilter !== "all"

                  ? "Try adjusting your search or filter criteria"

                  : "No products match your criteria"}

              </p>

            </div>

          ) : (

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

              {filteredProducts.map((product) => {

                const timeRemaining = calculateTimeRemaining(product.bid_end_date);

                const isActive = product.status === "active";

                const currentHighestBid = parseFloat(product.current_highest_bid || product.starting_price);

                const startingPrice = parseFloat(product.starting_price);



                // Calculate time remaining for display

                const endDate = new Date(product.bid_end_date);

                const now = new Date();

                const timeRemainingMs = endDate - now;

                const days = Math.floor(timeRemainingMs / (1000 * 60 * 60 * 24));

                const hours = Math.floor((timeRemainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                const minutes = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));



                let endsIn = '';

                if (days > 0) {

                  endsIn = `${days}d ${hours}h`;

                } else if (hours > 0) {

                  endsIn = `${hours}h ${minutes}m`;

                } else if (minutes > 0) {

                  endsIn = `${minutes}m`;

                } else {

                  endsIn = 'Ended';

                }



                return (

                  <div key={product.id} className="card-hover overflow-hidden group">

                    <div className="relative h-48 -mx-6 -mt-6 mb-4 overflow-hidden">

                      <ProductImageThumbnail filePath={product.product_image_url} />

                      {product.status === "active" && (

                        <div className="absolute top-3 left-3 bg-accent-500 text-white px-3 py-1 rounded-full text-xs font-medium">

                          Active

                        </div>

                      )}

                      {product.status === "upcoming" && (

                        <div className="absolute top-3 left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">

                          Coming Soon

                        </div>

                      )}

                      {isActive && endsIn !== 'Ended' && (

                        <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">

                          <Timer className="w-3 h-3" /> {endsIn}

                        </div>

                      )}

                      {product.status === "upcoming" && (

                        <div className="absolute top-3 right-3 bg-blue-500/80 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">

                          <Clock className="w-3 h-3" /> Starts {new Date(product.bid_start_date).toLocaleDateString()}

                        </div>

                      )}

                    </div>



                    <h3 className="text-lg font-semibold text-gray-800 mb-3">

                      {product.product_name || "Unnamed Product"}

                    </h3>



                    <div className="flex justify-between items-center mb-4">

                      <div>

                        <p className="text-xs text-gray-500">Current Bid</p>

                        <p className="text-xl font-bold text-primary-600">

                          {formatCurrency(currentHighestBid)}

                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-xs text-gray-500">Starting Price</p>

                        <p className="text-sm text-gray-600">{formatCurrency(startingPrice)}</p>

                      </div>

                    </div>



                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">

                      <span className="text-sm text-gray-500">

                        {product.product_category}

                      </span>

                      <button

                        onClick={() => handleViewProduct(product)}

                        className={`!py-2 !px-4 flex items-center gap-1 text-sm ${product.status === "active"

                          ? "btn-accent"

                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"

                          }`}

                      >

                        {product.status === "active" ? (

                          <>Place Bid <Gavel className="w-4 h-4" /></>

                        ) : product.status === "upcoming" ? (

                          <>View Details <Eye className="w-4 h-4" /></>

                        ) : (

                          <>View Results <Gavel className="w-4 h-4" /></>

                        )}

                      </button>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>

      </section>



      {/* Product Detail Modal */}

      {selectedProduct && (

        <div

          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"

          onClick={closeProductDetail}

        >

          <div

            className="bg-white rounded-2xl shadow-card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"

            onClick={(e) => e.stopPropagation()}

          >

            {/* Header */}

            <div className="flex items-center justify-between p-6 border-b border-gray-200">

              <h2 className="text-2xl font-bold font-outfit text-gray-900">Product Details</h2>

              <button

                onClick={closeProductDetail}

                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Content */}

            <div className="overflow-y-auto flex-1 p-6">

              <div className="grid md:grid-cols-2 gap-6">

                {/* Image */}

                {productImageUrl && (

                  <div className="rounded-2xl overflow-hidden bg-gray-100">

                    <img

                      src={productImageUrl}

                      alt={selectedProduct.product_name}

                      className="w-full h-full object-cover"

                    />

                  </div>

                )}



                {/* Info */}

                <div className="space-y-6">

                  {/* Category & Name */}

                  <div>

                    <span className="inline-block px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-sm font-semibold mb-3">

                      {selectedProduct.product_category}

                    </span>

                    <h3 className="text-2xl font-bold font-outfit text-gray-900 mb-4">

                      {selectedProduct.product_name || "Unnamed Product"}

                    </h3>

                    {selectedProduct.product_description && (

                      <p className="text-gray-600 leading-relaxed">

                        {selectedProduct.product_description}

                      </p>

                    )}

                  </div>



                  {/* Price Info Card */}

                  <div className="card bg-gradient-to-br from-primary-50 to-accent-50 border-2 border-primary-200">

                    <div className="space-y-4">

                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-2 text-gray-600">

                          <Tag className="w-5 h-5" />

                          <span className="font-medium">Starting Price</span>

                        </div>

                        <span className="text-lg font-bold text-gray-900">

                          {formatCurrency(parseFloat(selectedProduct.starting_price))}

                        </span>

                      </div>

                      <div className="border-t border-primary-200 pt-4">

                        <div className="flex items-center justify-between">

                          <div className="flex items-center gap-2 text-gray-600">

                            <TrendingUp className="w-5 h-5" />

                            <span className="font-medium">Current Highest Bid</span>

                          </div>

                          <span className="text-2xl font-bold text-primary-600">

                            {formatCurrency(parseFloat(selectedProduct.current_highest_bid || selectedProduct.starting_price))}

                          </span>

                        </div>

                      </div>



                    </div>

                  </div>



                  {/* Date & Time Info */}

                  <div className="grid grid-cols-2 gap-4">

                    <div className="card bg-gray-50">

                      <div className="flex items-center gap-2 text-gray-600 mb-2">

                        <Calendar className="w-4 h-4" />

                        <span className="text-sm font-medium">Bid Start</span>

                      </div>

                      <p className="text-sm text-gray-900 font-medium">

                        {new Date(selectedProduct.bid_start_date).toLocaleDateString()}

                      </p>

                      <p className="text-xs text-gray-500">

                        {new Date(selectedProduct.bid_start_date).toLocaleTimeString()}

                      </p>

                    </div>

                    <div className="card bg-gray-50">

                      <div className="flex items-center gap-2 text-gray-600 mb-2">

                        <Clock className="w-4 h-4" />

                        <span className="text-sm font-medium">Bid End</span>

                      </div>

                      <p className="text-sm text-gray-900 font-medium">

                        {new Date(selectedProduct.bid_end_date).toLocaleDateString()}

                      </p>

                      <p className="text-xs text-gray-500">

                        {new Date(selectedProduct.bid_end_date).toLocaleTimeString()}

                      </p>

                    </div>

                  </div>



                  {/* Time Remaining (Active only) */}

                  {selectedProduct.status === "active" && (

                    <div className="card bg-accent-50 border-2 border-accent-200">

                      <div className="flex items-center gap-2 text-accent-700 mb-2">

                        <Timer className="w-5 h-5" />

                        <span className="font-semibold">Time Remaining</span>

                      </div>

                      <CountdownTimer endDate={selectedProduct.bid_end_date} />

                    </div>

                  )}



                  {/* Bid History Toggle */}

                  <button

                    onClick={() => setShowBidHistory(!showBidHistory)}

                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"

                  >

                    <Eye className="w-4 h-4" />

                    {showBidHistory ? "Hide" : "View"} Bid History

                  </button>



                  {/* Bid History */}

                  {showBidHistory && (

                    <div className="card bg-gray-50">

                      <h4 className="font-semibold font-outfit text-gray-900 mb-4">Recent Bids</h4>

                      {bidHistory.length === 0 ? (

                        <p className="text-gray-500 text-center py-4">No bids yet. Be the first to bid!</p>

                      ) : (

                        <div className="space-y-3">

                          {bidHistory.map((bid) => (

                            <div key={bid.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">

                              <div>

                                <p className="text-sm font-medium text-gray-600">{new Date(bid.created_at).toLocaleString()}</p>

                              </div>

                              <span className="text-lg font-bold text-primary-600">

                                {formatCurrency(parseFloat(bid.bid_amount))}

                              </span>

                            </div>

                          ))}

                        </div>

                      )}

                    </div>

                  )}

                </div>

              </div>

            </div>



            {/* Actions */}

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-4">

              <button

                onClick={closeProductDetail}

                className="btn-secondary flex-1"

              >

                Close

              </button>

              <button

                onClick={openBidModal}

                disabled={selectedProduct.status !== "active"}

                className={`flex-1 ${selectedProduct.status === "active"

                  ? "btn-accent"

                  : "bg-gray-300 text-gray-500 cursor-not-allowed"

                  }`}

              >

                {selectedProduct.status === "active"

                  ? "Place Bid"

                  : selectedProduct.status === "upcoming"

                    ? "Bidding Starts Soon"

                    : "Bidding Not Active"}

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Bid Modal */}

      {showBidModal && selectedProduct && (

        <div

          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"

          onClick={closeBidModal}

        >

          <div
            className="bg-white rounded-2xl shadow-card max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header */}

            <div className="flex items-center justify-between p-6 border-b border-gray-200">

              <div className="flex items-center gap-3">

                <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">

                  <Gavel className="w-6 h-6 text-accent-600" />

                </div>

                <div>

                  <h2 className="text-2xl font-bold font-outfit text-gray-900">Place Your Bid</h2>

                  <p className="text-sm text-gray-500">{selectedProduct.product_name || "Unnamed Product"}</p>

                </div>

              </div>

              <button

                onClick={closeBidModal}

                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Content */}

            <div className="p-6">

              {/* Bid History Toggle */}

              <button

                type="button"

                onClick={() => setShowBidHistory(!showBidHistory)}

                className="w-full btn-secondary flex items-center justify-center gap-2 mb-4"

              >

                <Eye className="w-5 h-5" />

                {showBidHistory ? "Hide" : "View"} Bid History

              </button>



              {/* Bid History */}

              {showBidHistory && (

                <div className="card bg-gray-50 mb-6">

                  <h4 className="font-semibold font-outfit text-gray-900 mb-4">Recent Bids</h4>

                  {bidHistory.length === 0 ? (

                    <p className="text-gray-500 text-center py-4">No bids yet. Be the first to bid!</p>

                  ) : (

                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">

                      {bidHistory.map((bid) => (

                        <div key={bid.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">

                          <div>

                            <p className="text-sm font-medium text-gray-600">{new Date(bid.created_at).toLocaleString()}</p>

                          </div>

                          <span className="text-lg font-bold text-primary-600">

                            {formatCurrency(parseFloat(bid.bid_amount))}

                          </span>

                        </div>

                      ))}

                    </div>

                  )}

                </div>

              )}



              {/* Current Bid Info */}

              <div className="card bg-gradient-to-br from-primary-50 to-accent-50 border-2 border-primary-200 mb-6">

                <div className="space-y-3">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2 text-gray-600">

                      <Tag className="w-5 h-5" />

                      <span className="font-medium">Starting Price</span>

                    </div>

                    <span className="text-lg font-bold text-gray-900">

                      {formatCurrency(parseFloat(selectedProduct.starting_price))}

                    </span>

                  </div>

                  <div className="border-t border-primary-200 pt-3">

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-2 text-gray-600">

                        <TrendingUp className="w-5 h-5" />

                        <span className="font-medium">Current Highest Bid</span>

                      </div>

                      <span className="text-2xl font-bold text-primary-600">

                        {formatCurrency(parseFloat(selectedProduct.current_highest_bid || selectedProduct.starting_price))}

                      </span>

                    </div>

                  </div>

                </div>

              </div>



              <form onSubmit={handlePlaceBid} className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-1 space-y-6 mb-6">
                  <div>
                    <label htmlFor="bid-amount" className="label flex items-center gap-2">
                      Your Bid Amount (PKR) <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="number"
                      id="bid-amount"
                      min={parseFloat(selectedProduct.current_highest_bid || selectedProduct.starting_price) + 1}
                      step="0.01"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={`Enter amount higher than ${formatCurrency(parseFloat(selectedProduct.current_highest_bid || selectedProduct.starting_price))}`}
                      required
                      className="input-field"
                    />

                    <small className="text-gray-500 text-sm mt-2 block">
                      Your bid must be higher than the current highest bid.
                    </small>
                  </div>

                  {feedback && (
                    <div
                      className={`p-4 rounded-xl flex items-center gap-3 ${feedback.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                    >
                      <span className="text-xl">
                        {feedback.type === "success" ? "✅" : "❌"}
                      </span>
                      <span className="font-medium">{feedback.message}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100 bg-white mt-auto">
                  <button
                    type="button"
                    onClick={closeBidModal}
                    disabled={bidLoading || feedback?.type === "success"}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={bidLoading || !bidAmount.trim() || feedback?.type === "success"}
                    className={`btn-accent flex-1 ${bidLoading ? 'btn-loading' : ''}`}
                  >
                    {bidLoading ? "Placing Bid..." : (
                      <span className="flex items-center justify-center gap-2">
                        <Gavel className="w-5 h-5" />
                        Place Bid
                      </span>
                    )}
                  </button>
                </div>
              </form>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}



export default BiddingPage;




import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import { supabase } from "../supabaseClient";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import SkeletonLoader from "../components/SkeletonLoader";
import CustomDropdown from "../components/CustomDropdown";
import VerificationFormModal from "../components/VerificationFormModal";
import { getErrorMessage } from "../utils/errorHandler";
import "../styles/ProductBrowse.css";

function ProductBrowse() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, name-asc, name-desc
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productImageUrl, setProductImageUrl] = useState(null);
  const [requestReason, setRequestReason] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestingProduct, setRequestingProduct] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory, sortBy, dateFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("product_donations")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch product requests: hide products that are requested (status !== rejected)
      const { data: requested, error: requestError } = await supabase
        .from("product_requests")
        .select("product_donation_id, status")
        .order("created_at", { ascending: false });

      if (requestError) throw requestError;

      const requestedIds = new Set(
        (requested || [])
          .filter((r) => r.status !== "rejected")
          .map((r) => r.product_donation_id)
      );

      // Fetch bidding products: hide products that are in active/upcoming bidding 
      // or ended auctions that have a winner
      const { data: inBidding, error: biddingError } = await supabase
        .from("bidding_products")
        .select("product_donation_id, status, winner_id");

      if (biddingError) console.error("Error loading bidding products:", biddingError);

      const biddingIds = new Set(
        (inBidding || [])
          .filter(bp => bp.status !== 'ended' || bp.winner_id)
          .map((bp) => bp.product_donation_id)
      );

      // Request list = approved, not requested, not in bidding
      const availableProducts = (data || []).filter(
        (product) => !requestedIds.has(product.id) && !biddingIds.has(product.id)
      );

      setProducts(availableProducts);

      // Standard categories as requested
      const standardCategories = ["Electronics", "Clothes", "Furniture", "Toys", "Educational Material", "Other"];
      const categoryCounts = {};
      standardCategories.forEach(cat => categoryCounts[cat] = 0);

      availableProducts.forEach(product => {
        const cat = (product.category || 'Other').trim();
        // Map old categories to new ones if necessary, or just count
        if (categoryCounts.hasOwnProperty(cat)) {
          categoryCounts[cat]++;
        } else {
          categoryCounts['Other']++;
        }
      });

      const dynamicCategories = standardCategories.map(name => ({
        id: name.toLowerCase().trim(),
        name: name,
        count: categoryCounts[name]
      }));

      setCategories([
        { id: 'all', name: 'All Items', count: availableProducts.length },
        ...dynamicCategories
      ]);

    } catch (error) {
      console.error("Error loading products:", error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== "all") {
      const standardCatsLower = ["electronics", "clothes", "furniture", "toys", "educational material", "other"];
      filtered = filtered.filter((product) => {
        const cat = (product.category || "Other").toLowerCase().trim();
        if (selectedCategory === "other") {
          // Include if category is "Other" OR if it's not in the standard list
          return !standardCatsLower.includes(cat) || cat === "other";
        }
        return cat === selectedCategory;
      });
    }

    // Filter by search term (enhanced - searches in multiple fields)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          (product.product_name &&
            product.product_name.toLowerCase().includes(search)) ||
          (product.description &&
            product.description.toLowerCase().includes(search)) ||
          (product.category && product.category.toLowerCase().includes(search)) ||
          (product.user_name && product.user_name.toLowerCase().includes(search))
      );
    }

    // Filter by date
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      filtered = filtered.filter((product) => {
        const productDate = new Date(product.created_at);
        switch (dateFilter) {
          case "today":
            return productDate >= today;
          case "week":
            return productDate >= weekAgo;
          case "month":
            return productDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "name-asc":
          return (a.product_name || "").localeCompare(b.product_name || "");
        case "name-desc":
          return (b.product_name || "").localeCompare(a.product_name || "");
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
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

  const handleViewProduct = async (product) => {
    setSelectedProduct(product);
    if (product.image_url) {
      const url = await getSignedUrl(product.image_url);
      setProductImageUrl(url);
    }
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
    setProductImageUrl(null);
  };

  const handleRequestProduct = (product) => {
    // Check if user is logged in and verified
    const user = localStorage.getItem("currentUser");
    if (!user) {
      setFeedback({ type: "error", message: "Please login first to request a product." });
      setTimeout(() => {
        navigate("/login");
      }, 1500);
      return;
    }

    const userData = JSON.parse(user);
    if (!userData.is_verified) {
      setShowVerificationModal(true);
      return;
    }

    // Navigate to product request form with productId
    navigate(`/product-request?productId=${product.id}`);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestingProduct(null);
    setRequestReason("");
  };

  const submitProductRequest = async () => {
    if (!requestReason.trim()) {
      setFeedback({ type: "error", message: "Please provide a reason for requesting this product." });
      return;
    }

    const user = localStorage.getItem("currentUser");
    if (!user) {
      setFeedback({ type: "error", message: "Please login first." });
      navigate("/login");
      return;
    }

    const userData = JSON.parse(user);

    try {
      setRequestLoading(true);

      // Check for pending product requests
      const { data: pending } = await supabase
        .from("product_requests")
        .select("status")
        .eq("user_id", userData.id)
        .eq("status", "pending");

      if (pending && pending.length > 0) {
        setFeedback({ type: "warning", message: "You already have a pending product request. Please wait for admin approval before requesting another." });
        setRequestLoading(false);
        return;
      }

      // Check if this product was already requested by this user
      const { data: existing } = await supabase
        .from("product_requests")
        .select("id, status")
        .eq("user_id", userData.id)
        .eq("product_donation_id", requestingProduct.id)
        .in("status", ["pending", "approved"]);

      if (existing && existing.length > 0) {
        setFeedback({ type: "warning", message: "You have already requested this product." });
        setRequestLoading(false);
        return;
      }

      // Insert product request
      const { error } = await supabase.from("product_requests").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          product_donation_id: requestingProduct.id,
          product_name: requestingProduct.product_name,
          product_category: requestingProduct.category,
          reason: requestReason.trim(),
        },
      ]);

      if (error) throw error;

      setFeedback({ type: "success", message: "Product request submitted successfully! Admin will review it soon." });
      closeRequestModal();
      closeProductDetail();

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error submitting product request:", error);
      const errorMessage = getErrorMessage(error);
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white animate-fade-in pt-20">
      <AuthenticatedNavbar />

      {/* Modern Fixed Sidebar */}
      <aside className="w-80 hidden lg:block shrink-0">
        <div className="fixed left-0 top-20 bottom-0 w-80 bg-white z-[60] flex flex-col border-r border-slate-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
          <div className="px-8 pt-8 pb-4 border-b border-slate-50 mb-2">
            <button
              onClick={() => navigate("/request-donation")}
              className="w-9 h-9 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 mb-6 transition-colors hover:bg-white hover:text-[#124074] hover:border-[#124074]/30"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-900 mb-1">Category</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              Select a category to find the products you need
            </p>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full group flex items-center justify-between px-6 py-4 rounded-xl transition-all duration-300 relative overflow-hidden ${selectedCategory === category.id
                  ? 'bg-slate-50 text-[#124074] font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                {/* Active Indicator */}
                {selectedCategory === category.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#124074] shadow-[0_0_20px_rgba(18,64,116,0.2)]"></div>
                )}

                <div className="flex items-center gap-4 relative z-10">
                  <span className={`text-[18px] tracking-wide transition-all duration-300 ${selectedCategory === category.id ? 'translate-x-1' : 'group-hover:translate-x-1'
                    }`}>
                    {category.name}
                  </span>
                </div>

                <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg transition-all duration-500 relative z-10 ${selectedCategory === category.id
                  ? 'bg-[#124074] text-white shadow-[0_10px_20px_rgba(18,64,116,0.1)]'
                  : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                  }`}>
                  {category.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content with Sidebar Offset */}
      <div className="lg:pl-80">
        {/* Hero Section */}
        <section className="relative pt-24 pb-2 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-[#124074] mb-4">
                Request <span className="font-black">Products</span>
              </h1>
              <p className="text-slate-500 font-light max-w-xl mx-auto">
                Find products donated by generous donors and request what you need
              </p>
            </div>

            {/* Search and Quick Filters */}
            <div className="relative group max-w-2xl mx-auto mb-12">
              <div className="relative bg-white p-2 rounded-2xl shadow-[0_20px_50px_rgba(18,64,116,0.08)] border border-slate-100 flex items-center transition-all duration-500 focus-within:shadow-[0_20px_50px_rgba(18,64,116,0.15)] focus-within:border-[#124074]/20">
                <div className="pl-6 pr-3">
                  <i className="ri-search-line text-2xl text-[#124074] opacity-30 group-focus-within:opacity-100 transition-all duration-500"></i>
                </div>
                <input
                  type="text"
                  placeholder="Search by name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-3.5 text-lg font-light text-slate-900 bg-transparent outline-none placeholder:text-slate-300"
                />
              </div>
            </div>

          </div>
        </section>

        {/* Content Area */}
        <main className="px-8 pb-24">
          <div className="max-w-7xl mx-auto">
            {/* Page Header Indicator */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10 mt-0">
              <div className="flex items-center gap-6">
                <div className="w-2 h-16 bg-[#103866] rounded-full shadow-lg shadow-blue-900/10"></div>
                <div>
                  <h2 className="text-3xl font-light text-slate-900 tracking-tight leading-tight capitalize">
                    {categories.find(c => c.id === selectedCategory)?.name || 'All Items'}
                  </h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'} Found
                  </p>
                </div>
              </div>

              {/* Filters Aligned with Header */}
              <div className="flex flex-wrap gap-6 items-end">
                <div className="w-48">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Date Added</p>
                  <CustomDropdown
                    options={[
                      { value: "all", label: "All Time" },
                      { value: "today", label: "Today" },
                      { value: "week", label: "This Week" },
                      { value: "month", label: "This Month" }
                    ]}
                    value={dateFilter}
                    onChange={setDateFilter}
                    placeholder="Date"
                  />
                </div>
                <div className="w-48">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Sort By</p>
                  <CustomDropdown
                    options={[
                      { value: "newest", label: "Newest First" },
                      { value: "oldest", label: "Oldest First" },
                      { value: "name-asc", label: "Name (A-Z)" },
                      { value: "name-desc", label: "Name (Z-A)" }
                    ]}
                    value={sortBy}
                    onChange={setSortBy}
                    placeholder="Sort By"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-8">
                <ErrorMessage message={error} onRetry={loadProducts} />
              </div>
            )}

            {feedback && (
              <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 font-bold ${feedback.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                {feedback.type === 'success' ? '✅' : '❌'} {feedback.message}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonLoader key={i} type="card" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                <div className="text-6xl mb-6 opacity-20">📦</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-400">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden group hover:shadow-2xl hover:shadow-[#124074]/10 transition-all duration-500 cursor-pointer"
                    onClick={() => handleViewProduct(product)}
                  >
                    <div className="h-56 bg-slate-50 relative overflow-hidden">
                      <ProductImageThumbnail filePath={product.image_url} />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-[#124074]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl scale-50 group-hover:scale-100 transition-all duration-500">
                          <i className="ri-arrow-right-line text-3xl text-[#124074]"></i>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-1 uppercase line-clamp-1 tracking-tight">
                        {product.product_name}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        Click To View Detail
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={closeProductDetail}></div>
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl animate-slide-up flex flex-col lg:flex-row overflow-hidden no-scrollbar">
            <button
              onClick={closeProductDetail}
              className="absolute top-6 right-6 lg:top-8 lg:right-8 z-50 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-400 hover:text-red-500 transition-all"
            >
              <i className="ri-close-line text-2xl"></i>
            </button>
            <div className="lg:w-1/2 bg-slate-50 flex items-center justify-center p-8 lg:p-12">
              {productImageUrl ? (
                <img src={productImageUrl} alt={selectedProduct.product_name} className="max-w-full max-h-full object-contain rounded-3xl" />
              ) : (
                <div className="text-8xl opacity-10">📦</div>
              )}
            </div>
            <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col h-full bg-white">
              <div className="bg-[#124074]/5 text-[#124074] self-start px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
                {selectedProduct.category}
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase tracking-tighter">{selectedProduct.product_name}</h2>
              <p className="text-lg text-slate-500 font-light leading-relaxed mb-10 line-clamp-4">{selectedProduct.description}</p>

              <div className="space-y-6 mb-12">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#124074] shadow-sm">
                    <i className="ri-user-line text-xl opacity-60"></i>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Donated by</p>
                    <p className="text-lg font-bold text-slate-800 tracking-tight">{selectedProduct.user_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#124074] shadow-sm">
                    <i className="ri-calendar-line text-xl opacity-60"></i>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Donated on</p>
                    <p className="text-lg font-bold text-slate-800 tracking-tight">{new Date(selectedProduct.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <button
                className="mt-auto w-full py-6 bg-[#124074] text-white rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl shadow-[#124074]/20 hover:scale-[1.02] active:scale-95 transition-all"
                onClick={() => handleRequestProduct(selectedProduct)}
              >
                REQUEST PRODUCT
              </button>
            </div>
          </div>
        </div>
      )}

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
              To ensure the safety and trust of our community, you must verify your identity by uploading documents before you can request products.
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

// Component for product image thumbnail
function ProductImageThumbnail({ filePath }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImage();
  }, [filePath]);

  const loadImage = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      setImageUrl(data.signedUrl);
    } catch (error) {
      console.error("Error loading image:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="product-image-placeholder">⏳</div>;
  }

  if (!imageUrl) {
    return <div className="product-image-placeholder">📦</div>;
  }

  return (
    <img
      src={imageUrl}
      alt="Product"
      className="product-thumbnail"
      onError={() => setImageUrl(null)}
    />
  );
}

export default ProductBrowse;


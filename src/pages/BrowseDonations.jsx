import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, Grid, List, Package, ArrowRight, Heart, ArrowLeft, Sparkles, X, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import VerificationFormModal from '../components/VerificationFormModal';
import Navbar from '../components/Navbar';
import AuthenticatedNavbar from '../components/AuthenticatedNavbar';

const BrowseDonations = () => {
    const navigate = useNavigate();
    const [viewType, setViewType] = useState('grid');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showVerificationForm, setShowVerificationForm] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            // Get all approved products
            const { data: allProducts, error: productsError } = await supabase
                .from('product_donations')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            if (productsError) throw productsError;

            // Get all products that are currently in bidding (upcoming, active, ended, or completed)
            const { data: biddingProducts, error: biddingError } = await supabase
                .from('bidding_products')
                .select('product_donation_id, status, highest_bidder_name')
                .in('status', ['upcoming', 'active', 'ended', 'completed']);

            if (biddingError) {
                console.error('Error loading bidding products:', biddingError);
            }

            // Get all product requests so we can hide already requested items
            const { data: productRequests, error: requestsError } = await supabase
                .from('product_requests')
                .select('product_donation_id, status');

            if (requestsError) {
                console.error('Error loading product requests:', requestsError);
            }

            // Product IDs hidden due to bidding status
            const biddingProductIds = new Set();
            (biddingProducts || []).forEach(bp => {
                // Hide if: upcoming, active, OR (ended/completed with bids)
                if (bp.status === 'upcoming' || bp.status === 'active' ||
                    ((bp.status === 'ended' || bp.status === 'completed') && bp.highest_bidder_name)) {
                    biddingProductIds.add(bp.product_donation_id);
                }
            });

            // Product IDs hidden because they have active (non-rejected) requests
            const requestedProductIds = new Set(
                (productRequests || [])
                    .filter(r => r.status !== 'rejected')
                    .map(r => r.product_donation_id)
            );

            // Filter out products that are in bidding OR already requested
            const availableProducts = (allProducts || []).filter(
                p => !biddingProductIds.has(p.id) && !requestedProductIds.has(p.id)
            );

            setProducts(availableProducts);

            // Standard categories as requested
            const standardCategories = ["Electronics", "Clothes", "Furniture", "Toys", "Educational Material", "Other"];
            const categoryCounts = {};
            standardCategories.forEach(cat => categoryCounts[cat] = 0);

            availableProducts.forEach(product => {
                const cat = (product.category || 'Other').trim();
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
            console.error('Error loading products:', error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const getSignedUrl = async (filePath) => {
        try {
            if (!filePath) return null;
            const { data, error } = await supabase.storage
                .from('verification-documents')
                .createSignedUrl(filePath, 3600);

            if (error) throw error;
            return data.signedUrl;
        } catch (error) {
            console.error('Error getting signed URL:', error);
            return null;
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'all' ||
            (p.category && p.category.toLowerCase() === selectedCategory);
        const matchesSearch = !searchQuery ||
            (p.product_name && p.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const isLoggedIn = !!localStorage.getItem('currentUser');

    const closeProductModal = () => setSelectedProduct(null);

    return (
        <div className="min-h-screen bg-slate-50 animate-fade-in">
            {isLoggedIn ? <AuthenticatedNavbar /> : <Navbar />}

            {/* Hero Section */}
            <section className="relative pt-8 pb-0 lg:pl-80">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#124074]/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col items-center text-center">
                        <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-[#124074] mb-3">
                            Browse <span className="font-black">Products</span>
                        </h1>
                        <p className="text-sm text-slate-500 font-light max-w-xl leading-relaxed mb-4">
                            Find pre-loved items shared by our community. Browse through approved donations and request what you need to make a difference in your life.
                        </p>

                        {/* Compact Search Bar */}
                        <div className="w-full max-w-2xl relative group px-4">
                            <div className="relative bg-white p-1 rounded-full shadow-[0_20px_50px_rgba(18,64,116,0.05)] border border-slate-100 flex items-center transition-all duration-500 focus-within:shadow-[0_20px_50px_rgba(18,64,116,0.1)] focus-within:border-[#124074]/20">
                                <div className="pl-6 pr-3">
                                    <Search className="w-5 h-5 text-[#124074] opacity-30 group-focus-within:opacity-100 transition-all duration-500" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name"
                                    className="w-full py-3.5 text-base font-light text-slate-900 bg-transparent outline-none placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="flex min-h-screen pt-0">
                {/* Modern White Sidebar */}
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

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 pb-24">
                    <div className="max-w-7xl px-6 lg:px-12">
                        {/* Results Header */}
                        <div className="flex flex-col mb-10 mt-6">
                            <div className="flex items-center gap-6">
                                <div className="w-2 h-16 bg-[#103866] rounded-full shadow-lg shadow-blue-900/10"></div>
                                <div>
                                    <h2 className="text-3xl font-light text-slate-900 tracking-tight leading-tight">
                                        {categories.find(c => c.id === selectedCategory)?.name || 'Marketplace'}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                            {filteredProducts.length} {filteredProducts.length === 1 ? 'Item' : 'Items'} Available
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="bg-white rounded-[2rem] h-[400px] animate-pulse border border-slate-100"></div>
                                ))}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="bg-white rounded-[3rem] border border-slate-200 border-dashed py-24 text-center">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Package className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">No Items Found</h3>
                                <p className="text-slate-400 font-light max-w-sm mx-auto">
                                    Try adjusting your search or filters to find what you're looking for.
                                </p>
                            </div>
                        ) : (
                            <div className={viewType === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-8' : 'space-y-6'}>
                                {filteredProducts.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        viewType={viewType}
                                        onViewDetails={() => setSelectedProduct(product)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {selectedProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                        onClick={closeProductModal}
                    ></div>

                    <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl animate-slide-up flex flex-col lg:flex-row overflow-hidden no-scrollbar">
                        {/* Close Button */}
                        <button
                            onClick={closeProductModal}
                            className="absolute top-6 right-6 lg:top-8 lg:right-8 z-50 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-400 hover:text-red-500 hover:scale-110 transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Image Section */}
                        <div className="lg:w-1/2 h-[400px] lg:h-auto bg-slate-50 flex items-center justify-center p-8 lg:p-12">
                            <ProductImage product={selectedProduct} modal />
                        </div>

                        {/* Details Section */}
                        <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col h-full bg-white">
                            <div className="bg-[#124074]/5 text-[#124074] self-start px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
                                {selectedProduct.category || 'Other'}
                            </div>

                            <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase tracking-tighter">
                                {selectedProduct.product_name}
                            </h2>
                            
                            <p className="text-lg text-slate-500 font-light leading-relaxed mb-10 line-clamp-4">
                                {selectedProduct.description || 'No description provided by the donor.'}
                            </p>

                            <div className="space-y-6 mb-12">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#124074] shadow-sm">
                                        <Heart className="w-5 h-5 opacity-60" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Donated By</p>
                                        <p className="text-lg font-bold text-slate-800 tracking-tight">{selectedProduct.user_name || 'Anonymous Donor'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#124074] shadow-sm">
                                        <Info className="w-5 h-5 opacity-60" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Donated On</p>
                                        <p className="text-lg font-bold text-slate-800 tracking-tight">{new Date(selectedProduct.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    const user = localStorage.getItem('currentUser');
                                    if (user) {
                                        const userData = JSON.parse(user);
                                        if (userData.is_verified) {
                                            navigate(`/product-request?productId=${selectedProduct.id}`);
                                        } else {
                                            setShowVerificationForm(true);
                                        }
                                    } else {
                                        navigate(`/login?returnUrl=/product-request&productId=${selectedProduct.id}`);
                                    }
                                }}
                                className="w-full bg-[#124074] text-white py-6 rounded-2xl text-base font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] hover:-translate-y-1 transition-all mt-auto"
                            >
                                REQUEST PRODUCT
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
                    window.location.reload();
                }}
            />
        </div>
    );
};

const ProductImage = ({ product, modal }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchUrl = async () => {
            try {
                if (!product.image_url) {
                    if (isMounted) setLoading(false);
                    return;
                }

                const { data } = await supabase.storage
                    .from('verification-documents')
                    .createSignedUrl(product.image_url, 3600);

                if (isMounted) {
                    if (data?.signedUrl) {
                        setImageUrl(data.signedUrl);
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) setLoading(false);
            }
        };
        fetchUrl();
        return () => { isMounted = false; };
    }, [product.id, product.image_url]);

    if (loading) {
        return (
            <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#124074]"></div>
            </div>
        );
    }

    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={product.product_name}
                className={modal ? "max-w-full max-h-full object-contain rounded-3xl transition-all duration-500" : "w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"}
                onError={() => setImageUrl(null)}
            />
        );
    }
    

    return (
        <div className="w-full h-full bg-slate-100/50 flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-300" />
        </div>
    );
};

const ProductCard = ({ product, viewType, onViewDetails }) => {
    return (
        <div
            onClick={onViewDetails}
            className={`bg-white rounded-[2rem] border border-slate-100 overflow-hidden group hover:shadow-2xl hover:shadow-[#124074]/10 transition-all duration-500 cursor-pointer ${viewType === 'list' ? 'flex gap-8 p-4' : ''}`}
        >
            <div className={`relative overflow-hidden ${viewType === 'list' ? 'w-56 h-40 rounded-[1.5rem]' : 'h-52'}`}>
                <ProductImage product={product} />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-[#124074]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl scale-50 group-hover:scale-100 transition-all duration-500">
                        <ArrowRight className="w-8 h-8 text-[#124074]" />
                    </div>
                </div>
            </div>

            <div className={`p-6 ${viewType === 'list' ? 'flex-1 flex flex-col justify-center' : ''}`}>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight line-clamp-1 mb-1 uppercase">
                    {product.product_name || 'Unnamed Product'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Click To View Detail</p>
            </div>
        </div>
    );
};

export default BrowseDonations;

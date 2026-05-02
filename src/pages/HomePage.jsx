import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Heart,
    HandHeart,
    Gavel,
    Users,
    Package,
    TrendingUp,
    Shield,
    CheckCircle,
    ArrowRight,
    Star,
    Gift,
    Clock,
    X,
    Info
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import VerificationFormModal from '../components/VerificationFormModal';


const HomePage = () => {
    const navigate = useNavigate();
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showVerificationForm, setShowVerificationForm] = useState(false);

    useEffect(() => {
        loadHomePageData();
    }, []);



    const loadHomePageData = async () => {
        try {

            // Fetch real available products from the database
            const { data: allProducts, error: productsError } = await supabase
                .from('product_donations')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            if (productsError) throw productsError;

            // Fetch bidding items to exclude
            const { data: biddingProducts } = await supabase
                .from('bidding_products')
                .select('product_donation_id, status, highest_bidder_name')
                .in('status', ['upcoming', 'active', 'ended', 'completed']);

            // Fetch requests to exclude
            const { data: productRequests } = await supabase
                .from('product_requests')
                .select('product_donation_id, status')
                .neq('status', 'rejected');

            const hiddenIds = new Set();
            if (biddingProducts) {
                biddingProducts.forEach(bp => {
                    if (bp.status === 'upcoming' || bp.status === 'active' ||
                        ((bp.status === 'ended' || bp.status === 'completed') && bp.highest_bidder_name)) {
                        hiddenIds.add(bp.product_donation_id);
                    }
                });
            }
            if (productRequests) {
                productRequests.forEach(r => hiddenIds.add(r.product_donation_id));
            }

            const availableProducts = (allProducts || []).filter(p => !hiddenIds.has(p.id)).slice(0, 3);

            // Get signed URLs for images
            const featuredWithUrls = await Promise.all(availableProducts.map(async (p) => {
                let imageUrl = 'https://via.placeholder.com/500x400?text=No+Image';
                if (p.image_url) {
                    try {
                        const { data } = await supabase.storage
                            .from('verification-documents')
                            .createSignedUrl(p.image_url, 3600);
                        if (data?.signedUrl) imageUrl = data.signedUrl;
                    } catch (e) {
                        console.error("Error getting signed URL:", e);
                    }
                }
                return {
                    id: p.id,
                    name: p.product_name || 'Unnamed Item',
                    category: p.category || 'Other',
                    image: imageUrl,
                    placeholder: 'https://via.placeholder.com/500x400?text=Donation',
                    description: p.description,
                    user_name: p.user_name,
                    created_at: p.created_at
                };
            }));

            setFeaturedProducts(featuredWithUrls);
            setLoading(false);
        } catch (error) {
            console.error('Error loading home page data:', error);
            setLoading(false);
        }
    };

    const features = [
        {
            icon: Shield,
            title: 'Verified Recipients',
            description: 'Every recipient is thoroughly verified to ensure your donations reach those truly in need.',
        },
        {
            icon: TrendingUp,
            title: 'Transparent Tracking',
            description: 'Track your donations from submission to delivery with complete transparency.',
        },
        {
            icon: Gavel,
            title: 'Unique Bidding',
            description: 'Bid on antique and unique items. All proceeds go to those in need.',
        },
        {
            icon: CheckCircle,
            title: 'AI-Powered Safety',
            description: 'Advanced AI ensures only safe, legal items are accepted for donation.',
        },
    ];

    const howItWorks = [
        { step: 1, title: 'Sign Up', description: 'Create your account as a donor or recipient', icon: Users },
        { step: 2, title: 'Get Verified', description: 'Recipients upload documents for verification', icon: Shield },
        { step: 3, title: 'Donate or Request', description: 'Donors give, recipients request help', icon: Gift },
        { step: 4, title: 'Transform Lives', description: 'Your generosity creates lasting impact', icon: HandHeart },
    ];

    const testimonials = [
        {
            name: 'Ahmed Khan',
            role: 'Donor',
            image: '/assets/images/ahmed_khan.png',
            quote: 'Share4Good made it so easy to donate. I love seeing exactly how my contributions help others.',
            rating: 5,
        },
        {
            name: 'Fatima Ali',
            role: 'Recipient',
            image: '/assets/images/fatima_ali.png',
            quote: 'Thanks to Share4Good, I received the medical help I desperately needed. Forever grateful!',
            rating: 5,
        },
        {
            name: 'Hassan Raza',
            role: 'Donor',
            image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
            quote: 'The transparency here is unmatched. I know exactly where my donations go.',
            rating: 5,
        },
    ];


    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="relative overflow-hidden min-h-[600px] flex items-center">
                {/* Background Image & Overlay */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('/assets/images/charity_heart_hands.png')" }}
                ></div>
                {/* Primary theme color overlay */}
                <div className="absolute inset-0 bg-primary-900/40"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-800/60 to-transparent"></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full z-10">
                    <div className="max-w-3xl">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full border border-white/20 text-sm font-medium mb-6 backdrop-blur-md">
                            <HandHeart className="w-4 h-4 text-[#1db5f4]" />
                            <span>Making a difference together</span>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-outfit tracking-tight">
                            Share4Good
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg md:text-xl text-white/90 max-w-2xl mb-10 leading-relaxed font-outfit">
                            Connect with your community. Donate products, contribute cash,
                            or bid on items to support those in need.
                        </p>

                        {/* Custom Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/?signup=true"
                                className="bg-[#1db5f4] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#159bd4] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-cyan-500/25"
                            >
                                Get Started
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/how-it-works"
                                className="border border-white/30 bg-white/10 backdrop-blur-sm text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center shadow-lg"
                            >
                                Learn More
                            </Link>
                        </div>
                    </div>
                </div>
            </section>





            {/* Features Section */}
            <section className="py-20 bg-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Why Choose <span className="gradient-text">Share4Good</span></h2>
                        <p className="section-subtitle mt-4">
                            We've built trust through transparency, verification, and genuine impact
                        </p>
                    </div>



                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="card-hover group"
                            >
                                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3 font-outfit">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">How <span className="gradient-text">It Works</span></h2>
                        <p className="section-subtitle mt-4">
                            Simple steps to start making a difference today
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {howItWorks.map((item, index) => (
                            <div key={index} className="relative">
                                <div className="text-center">
                                    <div className="relative inline-block">
                                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-lg">
                                            <item.icon className="w-10 h-10 text-white" />
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                                            {item.step}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2 font-outfit">
                                        {item.title}
                                    </h3>
                                    <p className="text-gray-600">{item.description}</p>
                                </div>

                                {index < howItWorks.length - 1 && (
                                    <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-300 to-transparent"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Donations */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-12">
                        <div>
                            <h2 className="section-title">Featured <span className="gradient-text">Donations</span></h2>
                            <p className="text-gray-600 mt-2">Browse available items ready for those in need</p>
                        </div>
                        <Link to="/browse" className="mt-4 md:mt-0 text-primary-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                            View All Donations
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>

                    {featuredProducts.length > 0 ? (
                        <div className="grid md:grid-cols-3 gap-8">
                            {featuredProducts.map((product) => (
                                <div key={product.id} className="card-hover overflow-hidden group">
                                    <div className="relative h-48 -mx-6 -mt-6 mb-4 overflow-hidden">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => {
                                                e.target.src = product.placeholder;
                                            }}
                                        />
                                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-primary-600">
                                            {product.category}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800">{product.name}</h3>
                                    <button
                                        onClick={() => setSelectedProduct(product)}
                                        className="mt-4 inline-flex items-center text-primary-600 font-medium hover:gap-2 transition-all"
                                    >
                                        View Details <ArrowRight className="w-4 h-4 ml-1" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p>No featured products available at the moment.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">What Our <span className="gradient-text">Community</span> Says</h2>
                        <p className="section-subtitle mt-4">
                            Real stories from real people making a real difference
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <div key={index} className="card flex flex-col">
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 text-accent-500" fill="currentColor" />
                                    ))}
                                </div>
                                <p className="text-gray-600 italic mb-6">"{testimonial.quote}"</p>
                                <div className="flex items-center gap-4 mt-auto">
                                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary-50">
                                        <img
                                            src={testimonial.image}
                                            alt={testimonial.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = 'https://via.placeholder.com/150?text=User';
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{testimonial.name}</p>
                                        <p className="text-sm text-primary-600">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-20 overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: "url('/assets/images/charity_donation_jar.png')",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-800/88 to-primary-700/85" />
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-white font-outfit mb-6">
                        Ready to Make a Difference?
                    </h2>
                    <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                        Join thousands of generous hearts already transforming lives.
                        Your contribution, big or small, creates lasting impact.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/?signup=true"
                            className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <HandHeart className="w-5 h-5" />
                            Donate Now
                        </Link>
                        <Link
                            to="/?signup=true"
                            className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            Request Help
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>
            {/* Product Detail Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setSelectedProduct(null)}
                    ></div>

                    <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl animate-slide-up flex flex-col lg:flex-row overflow-hidden no-scrollbar">
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedProduct(null)}
                            className="absolute top-6 right-6 lg:top-8 lg:right-8 z-50 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-400 hover:text-red-500 hover:scale-110 transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Image Section */}
                        <div className="lg:w-1/2 h-[400px] lg:h-auto bg-slate-50 flex items-center justify-center p-8 lg:p-12">
                            <img
                                src={selectedProduct.image}
                                alt={selectedProduct.name}
                                className="max-w-full max-h-full object-contain rounded-3xl"
                                onError={(e) => e.target.src = selectedProduct.placeholder}
                            />
                        </div>

                        {/* Details Section */}
                        <div className="lg:w-1/2 p-8 lg:p-14 flex flex-col h-full bg-white text-left">
                            <div className="bg-[#124074]/5 text-[#124074] self-start px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
                                {selectedProduct.category || 'Other'}
                            </div>

                            <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase tracking-tighter">
                                {selectedProduct.name}
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

export default HomePage;


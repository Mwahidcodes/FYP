import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Gavel, Clock, TrendingUp, Eye, Heart, ArrowRight, Timer, Filter, X, ArrowLeft, Sparkles, Calendar, User, History, ChevronRight, Package, Tag, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { createNotification } from '../utils/notifications';
import Navbar from '../components/Navbar';
import AuthenticatedNavbar from '../components/AuthenticatedNavbar';
import CustomDropdown from '../components/CustomDropdown';

const BiddingGallery = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, upcoming
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, ending-soon, price-low, price-high
    const [searchQuery, setSearchQuery] = useState('');
    const [auctions, setAuctions] = useState([]);
    const [filteredAuctions, setFilteredAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeAuctions: 0,
        totalRaised: 0,
        activeBidders: 0
    });

    // Bid modal states
    const [showBidModal, setShowBidModal] = useState(false);
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [bidAmount, setBidAmount] = useState('');
    const [bidLoading, setBidLoading] = useState(false);
    const [bidFeedback, setBidFeedback] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // Product detail modal states
    const [showProductDetail, setShowProductDetail] = useState(false);
    const [selectedProductForView, setSelectedProductForView] = useState(null);
    const [productImageUrl, setProductImageUrl] = useState(null);
    const [bidHistory, setBidHistory] = useState([]);
    const [showBidHistory, setShowBidHistory] = useState(false);
    const [bidModalImageUrl, setBidModalImageUrl] = useState(null);

    // Image cache to prevent repeated API calls
    const imageCache = useRef(new Map());

    // My Bids drawer states
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerTab, setDrawerTab] = useState('active');
    const [myBids, setMyBids] = useState({ active: [], history: [] });

    // All categories as requested
    const allCategories = [
        'Electronics',
        'Clothes',
        'Furniture',
        'Toys',
        'Educational Material',
        'Other'
    ];

    useEffect(() => {
        // Initial load
        loadBiddingData();

        // Auto-refresh every 2 minutes to update statuses (upcoming -> active, active -> ended)
        // Reduced frequency to improve performance
        const interval = setInterval(() => {
            loadBiddingData();
        }, 120000); // 2 minutes instead of 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Filter and sort auctions
    useEffect(() => {
        let filtered = [...auctions];

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(auction => auction.status === statusFilter);
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(auction =>
                auction.product_category?.toLowerCase() === selectedCategory.toLowerCase()
            );
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(auction =>
                auction.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Sort products
        if (sortBy === 'oldest') {
            filtered.sort((a, b) => new Date(a.created_at || a.bid_start_date) - new Date(b.created_at || b.bid_start_date));
        } else if (sortBy === 'ending-soon') {
            filtered.sort((a, b) => new Date(a.bid_end_date) - new Date(b.bid_end_date));
        } else if (sortBy === 'price-low') {
            filtered.sort((a, b) => (a.current_highest_bid || a.starting_price) - (b.current_highest_bid || b.starting_price));
        } else if (sortBy === 'price-high') {
            filtered.sort((a, b) => (b.current_highest_bid || b.starting_price) - (a.current_highest_bid || a.starting_price));
        } else {
            // Default: newest first
            filtered.sort((a, b) => new Date(b.created_at || b.bid_start_date) - new Date(a.created_at || a.bid_start_date));
        }

        setFilteredAuctions(filtered);
    }, [auctions, statusFilter, selectedCategory, sortBy, searchQuery]);

    // Calculate category counts
    const categoryCounts = auctions.reduce((acc, auction) => {
        const cat = auction.product_category;
        if (cat) {
            acc[cat] = (acc[cat] || 0) + 1;
        }
        return acc;
    }, {});
    const totalCount = auctions.length;

    const loadBiddingData = async () => {
        try {
            setLoading(true);

            // Load active and upcoming bidding products
            const { data: productsData, error: productsError } = await supabase
                .from('bidding_products')
                .select('*, product_donations(user_name, created_at, image_url)')
                .in('status', ['active', 'upcoming'])
                .order('bid_start_date', { ascending: true });

            if (productsError) throw productsError;

            const now = new Date();
            const statusUpdates = []; // Track products that need status updates in database

            const processedProducts = (productsData || []).map(product => {
                const startDate = new Date(product.bid_start_date);
                const endDate = new Date(product.bid_end_date);

                let status = product.status;
                if (now < startDate) {
                    status = 'upcoming';
                } else if (now >= startDate && now <= endDate) {
                    status = 'active';
                } else {
                    status = 'ended';
                }

                // If calculated status differs from database status, mark for update
                if (product.status !== status && product.status !== 'completed' && product.status !== 'cancelled') {
                    statusUpdates.push({ id: product.id, newStatus: status });
                }

                // Calculate time remaining
                const timeRemaining = endDate - now;
                const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

                let endsIn = '';
                if (days > 0) {
                    endsIn = `${days}d ${hours}h`;
                } else if (hours > 0) {
                    endsIn = `${hours}h ${minutes}m`;
                } else {
                    endsIn = `${minutes}m`;
                }

                return {
                    ...product,
                    status,
                    endsIn: status === 'active' ? endsIn : null,
                    featured: product.status === 'active' && product.current_highest_bid > product.starting_price * 2
                };
            }).filter(p => p.status === 'active' || p.status === 'upcoming');

            // Update database statuses for products that changed
            if (statusUpdates.length > 0) {
                for (const update of statusUpdates) {
                    // Find the product data before update
                    const productBeforeUpdate = productsData.find(p => p.id === update.id);

                    // Check if bid ended with no bids
                    const hasBids = productBeforeUpdate.current_highest_bid && productBeforeUpdate.current_highest_bid > productBeforeUpdate.starting_price;

                    // If bid ended with no bids, delete from bidding_products so it can appear in browse products again
                    if (update.newStatus === 'ended' && !hasBids && !productBeforeUpdate.highest_bidder_name) {
                        // Delete the bidding product so it becomes available in browse products again
                        await supabase
                            .from('bidding_products')
                            .delete()
                            .eq('id', update.id);
                        console.log(`Bidding product ${update.id} deleted (no bids placed), product available in browse again`);
                        continue; // Skip status update for this product
                    }

                    // If bid ended and has a winner, set winner and send notifications
                    if (update.newStatus === 'ended' && productBeforeUpdate.highest_bidder_id && !productBeforeUpdate.winner_id) {
                        // Set winner in database
                        await supabase
                            .from('bidding_products')
                            .update({
                                status: update.newStatus,
                                winner_id: productBeforeUpdate.highest_bidder_id,
                                winner_name: productBeforeUpdate.highest_bidder_name,
                                winner_email: productBeforeUpdate.highest_bidder_email,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', update.id);

                        // Send detailed notification to winner
                        await createNotification(
                            productBeforeUpdate.highest_bidder_id,
                            'bid_won',
                            `🎉 Congratulations! You Won the Bid`,
                            `Congratulations! You won the bid for "${productBeforeUpdate.product_name}" with a bid of ${formatCurrency(parseFloat(productBeforeUpdate.current_highest_bid))}.\n\n📋 Next Steps:\n1. Please transfer your payments at Meezan Bank\nAccount Number: 01234567890123\nAccount Title: Share For Good\n2. Admin will arrange delivery after payment verification\n3. You will receive updates via notifications\n\nThankyou for visiting share for good!`,
                            update.id
                        );

                        // Get all unique users who participated in this bid (excluding winner)
                        const { data: allBids, error: bidsError } = await supabase
                            .from('bids')
                            .select('user_id, user_name, user_email')
                            .eq('bidding_product_id', update.id)
                            .neq('user_id', productBeforeUpdate.highest_bidder_id);

                        if (!bidsError && allBids && allBids.length > 0) {
                            // Get unique participants
                            const uniqueParticipants = allBids.reduce((acc, bid) => {
                                if (!acc.find(u => u.user_id === bid.user_id)) {
                                    acc.push({
                                        user_id: bid.user_id,
                                        user_name: bid.user_name,
                                        user_email: bid.user_email
                                    });
                                }
                                return acc;
                            }, []);

                            // Send general notification to all participants
                            const participantNotifications = uniqueParticipants.map(participant =>
                                createNotification(
                                    participant.user_id,
                                    'bid_ended',
                                    `⏰ Bid Ended: "${productBeforeUpdate.product_name}"`,
                                    `The bid for "${productBeforeUpdate.product_name}" has ended.\n\n🏆 Winner: ${productBeforeUpdate.highest_bidder_name}\n💰 Winning Bid: ${formatCurrency(parseFloat(productBeforeUpdate.current_highest_bid))}\n\nThankyou for visiting share for good! Keep bidding on other items.`,
                                    update.id
                                )
                            );

                            // Send all notifications in parallel
                            Promise.all(participantNotifications).catch(error => {
                                console.error('Error sending notifications to participants:', error);
                            });
                        }

                        continue; // Skip the regular status update below
                    }

                    // Update status in database
                    await supabase
                        .from('bidding_products')
                        .update({ status: update.newStatus, updated_at: new Date().toISOString() })
                        .eq('id', update.id);
                }
            }

            // Filter to only show active and upcoming items for the user
            const finalAuctions = processedProducts.filter(p => p.status === 'active' || p.status === 'upcoming');
            setAuctions(finalAuctions);

            // Calculate stats
            const activeCount = processedProducts.filter(p => p.status === 'active').length;

            // Calculate total raised from completed auctions with verified payments only
            const { data: completedProducts } = await supabase
                .from('bidding_products')
                .select('current_highest_bid, payment_verified, status')
                .eq('status', 'completed')
                .eq('payment_verified', true);

            const totalRaised = (completedProducts || [])
                .reduce((sum, p) => sum + Number(p.current_highest_bid || 0), 0);

            // Count unique bidders
            const { data: bidsData } = await supabase
                .from('bids')
                .select('user_id')
                .in('bidding_product_id', processedProducts.map(p => p.id));

            const uniqueBidders = new Set((bidsData || []).map(b => b.user_id));

            setStats({
                activeAuctions: activeCount,
                totalRaised: totalRaised,
                activeBidders: uniqueBidders.size
            });

        } catch (error) {
            console.error('Error loading bidding data:', error);
            setAuctions([]);
        } finally {
            setLoading(false);
        }
    };

    const getSignedUrl = async (filePath) => {
        try {
            if (!filePath) return null;

            // Check cache first
            if (imageCache.current.has(filePath)) {
                const cached = imageCache.current.get(filePath);
                // Check if cache is still valid (signed URLs expire after 1 hour, refresh after 50 minutes)
                if (Date.now() - cached.timestamp < 50 * 60 * 1000) {
                    return cached.url;
                }
            }

            const { data, error } = await supabase.storage
                .from('verification-documents')
                .createSignedUrl(filePath, 3600);

            if (error) throw error;

            // Cache the URL
            imageCache.current.set(filePath, {
                url: data.signedUrl,
                timestamp: Date.now()
            });

            return data.signedUrl;
        } catch (error) {
            console.error('Error getting signed URL:', error);
            return null;
        }
    };

    const formatCurrency = (amount) => {
        if (amount >= 1000000) {
            return 'Rs. ' + (amount / 1000000).toFixed(1) + 'M';
        } else if (amount >= 1000) {
            return 'Rs. ' + (amount / 1000).toFixed(1) + 'K';
        }
        return 'Rs. ' + amount.toLocaleString();
    };

    // Load current user
    useEffect(() => {
        const user = localStorage.getItem('currentUser');
        setCurrentUser(user ? JSON.parse(user) : null);
    }, []);

    // Load user's bids
    const loadMyBids = useCallback(async () => {
        if (!currentUser) {
            setMyBids({ active: [], history: [] });
            return;
        }

        try {
            // Get all bids by current user
            const { data: userBids, error: bidsError } = await supabase
                .from('bids')
                .select('*, bidding_products(*)')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (bidsError) throw bidsError;

            if (!userBids || userBids.length === 0) {
                setMyBids({ active: [], history: [] });
                return;
            }

            // Get all bidding products to check status
            const productIds = [...new Set(userBids.map(b => b.bidding_product_id))];
            const { data: products, error: productsError } = await supabase
                .from('bidding_products')
                .select('*')
                .in('id', productIds);

            if (productsError) throw productsError;

            const productsMap = {};
            (products || []).forEach(p => {
                productsMap[p.id] = p;
            });

            const now = new Date();
            const activeBids = [];
            const historyBids = [];

            // Group bids by product and get highest bid per product
            const bidsByProduct = {};
            userBids.forEach(bid => {
                const productId = bid.bidding_product_id;
                if (!bidsByProduct[productId]) {
                    bidsByProduct[productId] = [];
                }
                bidsByProduct[productId].push(bid);
            });

            // Process each product
            const imagePromises = [];

            Object.keys(bidsByProduct).forEach(productId => {
                const product = productsMap[productId];
                if (!product) return;

                const userBidsForProduct = bidsByProduct[productId];
                const highestUserBid = userBidsForProduct.reduce((max, bid) =>
                    parseFloat(bid.bid_amount) > parseFloat(max.bid_amount) ? bid : max
                );

                const startDate = new Date(product.bid_start_date);
                const endDate = new Date(product.bid_end_date);
                const isActive = now >= startDate && now <= endDate;
                const isEnded = now > endDate;

                const currentHighestBid = parseFloat(product.current_highest_bid || product.starting_price);
                const userBidAmount = parseFloat(highestUserBid.bid_amount);
                const isWinning = product.highest_bidder_id === currentUser.id;
                const isOutbid = !isWinning && currentHighestBid > userBidAmount;

                // Calculate time remaining
                let endsIn = '';
                if (isActive) {
                    const timeRemaining = endDate - now;
                    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

                    if (days > 0) {
                        endsIn = `${days}d ${hours}h`;
                    } else if (hours > 0) {
                        endsIn = `${hours}h ${minutes}m`;
                    } else {
                        endsIn = `${minutes}m`;
                    }
                }

                const bidData = {
                    id: product.id,
                    name: product.product_name,
                    myBid: userBidAmount,
                    currentBid: currentHighestBid,
                    image: '/assets/images/hero_school_supplies.png',
                    product: product
                };

                // Load image asynchronously
                if (product.product_image_url) {
                    imagePromises.push(
                        getSignedUrl(product.product_image_url)
                            .then(url => {
                                bidData.image = url;
                            })
                            .catch(() => {
                                bidData.image = '/assets/images/hero_school_supplies.png';
                            })
                    );
                } else {
                    bidData.image = '/assets/images/hero_school_supplies.png';
                }

                if (isActive) {
                    bidData.status = isWinning ? 'Winning' : 'Outbid';
                    bidData.endsIn = endsIn;
                    activeBids.push(bidData);
                } else if (isEnded) {
                    const won = product.winner_id === currentUser.id;
                    bidData.status = won ? 'Won' : 'Lost';
                    bidData.finalPrice = currentHighestBid;
                    bidData.date = new Date(product.bid_end_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                    historyBids.push(bidData);
                }
            });

            // Set bids first, then update images as they load
            setMyBids({
                active: activeBids,
                history: historyBids
            });

            // Update images after they load
            Promise.all(imagePromises).then(() => {
                setMyBids(prev => ({
                    active: prev.active.map(b => {
                        const updated = activeBids.find(ab => ab.id === b.id);
                        return updated ? { ...b, image: updated.image } : b;
                    }),
                    history: prev.history.map(b => {
                        const updated = historyBids.find(hb => hb.id === b.id);
                        return updated ? { ...b, image: updated.image } : b;
                    })
                }));
            });
        } catch (error) {
            console.error('Error loading my bids:', error);
            setMyBids({ active: [], history: [] });
        }
    }, [currentUser, getSignedUrl]);

    // Load my bids when user changes or auctions update
    useEffect(() => {
        if (currentUser) {
            loadMyBids();
        }
    }, [currentUser, auctions, loadMyBids]);

    // Handle place bid
    const handlePlaceBid = useCallback(async (auction) => {
        if (!currentUser) {
            navigate(`/login?returnUrl=${encodeURIComponent('/bidding-gallery')}&productId=${auction.id}&openBid=true`);
            return;
        }
        setSelectedAuction(auction);
        setShowBidModal(true);
        setBidAmount('');
        setBidFeedback(null);
        setBidModalImageUrl(null);
        setBidHistory([]);
        setShowBidHistory(false);

        // Load image and bid history for bid modal
        const imgPath = auction.product_image_url || auction.product_donations?.image_url;
        if (imgPath) {
            const url = await getSignedUrl(imgPath);
            setBidModalImageUrl(url);
        }
        await loadBidHistory(auction.id);
    }, [currentUser, navigate, getSignedUrl]);

    // Load bid history
    const loadBidHistory = async (productId) => {
        try {
            const { data, error } = await supabase
                .from('bids')
                .select('*')
                .eq('bidding_product_id', productId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setBidHistory(data || []);
        } catch (error) {
            console.error('Error loading bid history:', error);
            setBidHistory([]);
        }
    };

    // View product details
    const handleViewDetails = async (auction) => {
        setSelectedProductForView(auction);
        setShowProductDetail(true);
        setProductImageUrl(null);
        setBidHistory([]);
        setShowBidHistory(false);

        // Load image and bid history
        const imgPath = auction.product_image_url || auction.product_donations?.image_url;
        if (imgPath) {
            const url = await getSignedUrl(imgPath);
            setProductImageUrl(url);
        }
        await loadBidHistory(auction.id);
    };

    // Close product detail modal
    const closeProductDetail = () => {
        setShowProductDetail(false);
        setSelectedProductForView(null);
        setProductImageUrl(null);
        setBidHistory([]);
        setShowBidHistory(false);
    };

    // Close bid modal
    const closeBidModal = () => {
        setShowBidModal(false);
        setSelectedAuction(null);
        setBidAmount('');
        setBidFeedback(null);
        setBidModalImageUrl(null);
        setBidHistory([]);
        setShowBidHistory(false);
    };

    // Submit bid
    const handleSubmitBid = async () => {
        if (!selectedAuction || !currentUser) return;

        const bidAmountNum = parseFloat(bidAmount);
        if (!bidAmount || isNaN(bidAmountNum) || bidAmountNum <= 0) {
            setBidFeedback({ type: 'error', message: 'Please enter a valid bid amount.' });
            return;
        }

        const currentHighestBid = parseFloat(selectedAuction.current_highest_bid || selectedAuction.starting_price);
        if (bidAmountNum <= currentHighestBid) {
            setBidFeedback({
                type: 'error',
                message: `Your bid must be higher than the current highest bid of ${formatCurrency(currentHighestBid)}.`
            });
            return;
        }

        const now = new Date();
        const endDate = new Date(selectedAuction.bid_end_date);
        if (now > endDate) {
            setBidFeedback({ type: 'error', message: 'Bidding has ended for this product.' });
            return;
        }

        setBidLoading(true);
        setBidFeedback(null);

        try {
            const { error: bidError } = await supabase
                .from('bids')
                .insert([{
                    bidding_product_id: selectedAuction.id,
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    user_email: currentUser.email,
                    bid_amount: bidAmountNum,
                }]);

            if (bidError) throw bidError;

            // Get all unique users who have bid on this product (excluding the current bidder)
            const { data: previousBids, error: bidsError } = await supabase
                .from('bids')
                .select('user_id, user_name, user_email')
                .eq('bidding_product_id', selectedAuction.id)
                .neq('user_id', currentUser.id); // Exclude current bidder

            if (!bidsError && previousBids && previousBids.length > 0) {
                // Get unique users (in case same user bid multiple times)
                const uniqueUsers = previousBids.reduce((acc, bid) => {
                    if (!acc.find(u => u.user_id === bid.user_id)) {
                        acc.push({
                            user_id: bid.user_id,
                            user_name: bid.user_name,
                            user_email: bid.user_email
                        });
                    }
                    return acc;
                }, []);

                // Send notifications to all previous bidders
                const notificationPromises = uniqueUsers.map(user =>
                    createNotification(
                        user.user_id,
                        'bid_outbid',
                        `💰 New Higher Bid on "${selectedAuction.product_name}"`,
                        `Someone placed a higher bid of ${formatCurrency(bidAmountNum)} on "${selectedAuction.product_name}".\n\nCurrent highest bid: ${formatCurrency(bidAmountNum)}\n\nPlace a new bid to stay in the competition!`,
                        selectedAuction.id
                    )
                );

                // Send all notifications in parallel (don't wait for them to complete)
                Promise.all(notificationPromises).catch(error => {
                    console.error('Error sending notifications to previous bidders:', error);
                });
            }

            setBidFeedback({
                type: 'success',
                message: `Successfully placed bid of ${formatCurrency(bidAmountNum)}!`
            });

            // Reload auctions to update bid counts (only if needed)
            // Don't reload immediately, let the auto-refresh handle it
            // Or reload after a short delay to avoid blocking UI
            setTimeout(() => {
                loadBiddingData();
            }, 1000);

            // Reload bid history if viewing product details or bid modal
            if (selectedProductForView && selectedProductForView.id === selectedAuction.id) {
                await loadBidHistory(selectedAuction.id);
            }
            // Reload bid history in bid modal
            if (showBidModal) {
                await loadBidHistory(selectedAuction.id);
            }

            // Close modal after 2 seconds
            setTimeout(() => {
                closeBidModal();
            }, 2000);

        } catch (error) {
            console.error('Error placing bid:', error);
            setBidFeedback({
                type: 'error',
                message: error.message || 'Failed to place bid. Please try again.'
            });
        } finally {
            setBidLoading(false);
        }
    };

    // Auto-open bid modal after login
    useEffect(() => {
        if (!currentUser || !auctions.length || showBidModal) return;

        const searchParams = new URLSearchParams(location.search);
        const productId = searchParams.get('productId');
        const openBid = searchParams.get('openBid') === 'true';

        if (productId && openBid) {
            const auction = auctions.find(a => a.id === parseInt(productId));
            if (auction && auction.status === 'active') {
                setSelectedAuction(auction);
                setShowBidModal(true);
                setBidAmount('');
                setBidFeedback(null);
                // Clean URL
                navigate('/bidding-gallery', { replace: true });
            }
        }
    }, [currentUser, auctions, location.search, showBidModal, navigate]);

    const isLoggedIn = !!currentUser;

    return (
        <div className="min-h-screen bg-white animate-fade-in">
            {isLoggedIn ? <AuthenticatedNavbar /> : <Navbar />}

            {/* Drawer Overlay */}
            {isDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] transition-opacity animate-fade-in"
                    onClick={() => setIsDrawerOpen(false)}
                />
            )}

            {/* My Bids Drawer */}
            {isLoggedIn && (
                <aside className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-[100] shadow-2xl transform transition-transform duration-500 ease-out p-0 flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 font-outfit">My Biddings</h2>
                            <p className="text-xs text-gray-500">Track your participation activity</p>
                        </div>
                        <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-6 h-6 text-gray-400" />
                        </button>
                    </div>

                    <div className="flex p-2 bg-gray-50 m-6 rounded-xl">
                        <button
                            onClick={() => setDrawerTab('active')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${drawerTab === 'active' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Gavel className="w-4 h-4" /> Active ({myBids.active.length})
                        </button>
                        <button
                            onClick={() => setDrawerTab('history')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${drawerTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <History className="w-4 h-4" /> History ({myBids.history.length})
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
                        {drawerTab === 'active' ? (
                            myBids.active.length === 0 ? (
                                <div className="text-center py-12">
                                    <Gavel className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">No active bids</p>
                                    <p className="text-sm text-gray-400 mt-2">Start bidding on items to see them here</p>
                                </div>
                            ) : (
                                myBids.active.map(bid => (
                                    <div key={bid.id} className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary-200 transition-colors shadow-sm">
                                        <div className="flex gap-4 mb-4">
                                            <img
                                                src={bid.image}
                                                alt={bid.name}
                                                className="w-16 h-16 rounded-xl object-cover"
                                                onError={(e) => {
                                                    e.target.src = '/assets/images/hero_school_supplies.png';
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 truncate mb-1">{bid.name}</h4>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${bid.status === 'Winning' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {bid.status}
                                                    </span>
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Timer className="w-3 h-3" /> {bid.endsIn}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end p-3 bg-gray-50 rounded-xl">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Your Bid</p>
                                                <p className="font-bold text-gray-900">Rs. {bid.myBid.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Current</p>
                                                <p className={`font-bold ${bid.status === 'Outbid' ? 'text-red-500' : 'text-green-500'}`}>Rs. {bid.currentBid.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )
                        ) : (
                            myBids.history.length === 0 ? (
                                <div className="text-center py-12">
                                    <History className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">No bid history</p>
                                    <p className="text-sm text-gray-400 mt-2">Your completed bids will appear here</p>
                                </div>
                            ) : (
                                myBids.history.map(bid => (
                                    <div key={bid.id} className="p-4 rounded-2xl border border-gray-100 bg-white opacity-80">
                                        <div className="flex gap-4 mb-4">
                                            <img
                                                src={bid.image}
                                                alt={bid.name}
                                                className="w-16 h-16 rounded-xl object-cover grayscale"
                                                onError={(e) => {
                                                    e.target.src = '/assets/images/hero_school_supplies.png';
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 truncate mb-1">{bid.name}</h4>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${bid.status === 'Won' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {bid.status}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{bid.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center p-3 border border-t border-gray-50 rounded-xl">
                                            <p className="text-sm font-medium text-gray-600">Final Price</p>
                                            <p className="font-bold text-gray-900 text-lg">Rs. {bid.finalPrice.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </aside>
            )}

            {/* Hero Section */}
            <section className="relative pt-24 pb-6 bg-white lg:pl-80">

                <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    {/* Floating My Bids Badge - Positioned to avoid overlap with centered content */}
                    <div className="fixed top-[95px] right-2 sm:right-4 lg:right-6 z-[60] pointer-events-none">
                        {isLoggedIn && (
                            <button
                                onClick={() => setIsDrawerOpen(true)}
                                className="pointer-events-auto flex items-center justify-between gap-6 bg-gradient-to-br from-[#124074] via-[#1a4a84] to-[#255a9a] text-white p-2.5 pl-5 pr-4 rounded-2xl hover:scale-105 transition-all duration-300 shadow-[0_15px_40px_rgba(18,64,116,0.3)] border border-white/10 group active:scale-95"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-3">
                                        {myBids.active.slice(0, 2).map((b, i) => (
                                            <img
                                                key={i}
                                                src={b.image}
                                                className="w-9 h-9 rounded-full border-2 border-white/20 object-cover shadow-sm group-hover:border-white/40 transition-colors"
                                                alt={b.name}
                                                onError={(e) => {
                                                    e.target.src = '/assets/images/hero_school_supplies.png';
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.15em] leading-none">My Biddings</p>
                                            <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                                        </div>
                                        <p className="text-sm font-bold leading-none tracking-tight">
                                            {myBids.active.length} Active • <span className="text-green-400">Winning {myBids.active.filter(b => b.status === 'Winning').length}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white/10 p-2 rounded-xl group-hover:bg-white/20 transition-colors">
                                    <ChevronRight className="w-4 h-4 text-white" />
                                </div>
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col items-center text-center">
                        <h1 className="text-4xl md:text-6xl font-normal tracking-tight text-[#124074] mb-3">
                            Bidding <span className="font-black">Gallery</span>
                        </h1>

                        <p className="text-sm text-slate-500 font-light max-w-xl leading-relaxed mb-6">
                            Bid on unique and antique items. All proceeds support our charitable causes. Join our community and win something special today.
                        </p>
                    </div>

                    {/* Filters - Now merged into Hero */}
                    <div className="mt-8 bg-white rounded-3xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-1.5 h-6 bg-[#124074] rounded-full"></div>
                            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Search & Filters</h3>
                        </div>

                        <div className="flex flex-col lg:flex-row items-end gap-6">
                            {/* Search Bar */}
                            <div className="flex-[1.5] w-full">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
                                    Search
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="search by name"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                                    />
                                </div>
                            </div>
                            {/* Status Filter */}
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
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

                            {/* Sort By */}
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
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

                            {/* Clear Filters Button */}
                            {(statusFilter !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest') && (
                                <button
                                    onClick={() => {
                                        setStatusFilter('all');
                                        setSelectedCategory('all');
                                        setSortBy('newest');
                                        setSearchQuery('');
                                    }}
                                    className="flex items-center justify-center gap-2 px-6 h-[52px] rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all font-bold text-[10px] uppercase tracking-widest whitespace-nowrap"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <div className="flex min-h-screen pt-0 bg-white">
                {/* Modern White Sidebar for Categories */}
                <aside className="w-80 hidden lg:block shrink-0">
                    <div className="fixed left-0 top-20 bottom-0 w-80 bg-white z-[60] flex flex-col border-r border-slate-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]">
                        <div className="px-8 pt-8 pb-4 border-b border-slate-50 mb-2">
                            <button
                                onClick={() => navigate("/request-donation")}
                                className="w-9 h-9 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 mb-6 transition-colors hover:bg-white hover:text-[#124074] hover:border-[#124074]/30"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-900 mb-1">Categories</h3>
                            <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                Filter items by category
                            </p>
                        </div>

                        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`w-full group flex items-center justify-between px-6 py-4 rounded-xl transition-all duration-300 relative overflow-hidden ${selectedCategory === 'all'
                                    ? 'bg-slate-50 text-[#124074] font-bold'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                {selectedCategory === 'all' && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#124074] shadow-[0_0_20px_rgba(18,64,116,0.2)]"></div>
                                )}
                                <div className="flex items-center gap-4 relative z-10">
                                    <span className={`text-[18px] tracking-wide transition-all duration-300 ${selectedCategory === 'all' ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                                        All Items
                                    </span>
                                </div>
                                <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg transition-all duration-500 relative z-10 ${selectedCategory === 'all'
                                    ? 'bg-[#124074] text-white shadow-[0_10px_20px_rgba(18,64,116,0.1)]'
                                    : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                                    }`}>
                                    {totalCount}
                                </span>
                            </button>

                            {allCategories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`w-full group flex items-center justify-between px-6 py-4 rounded-xl transition-all duration-300 relative overflow-hidden ${selectedCategory === cat
                                        ? 'bg-slate-50 text-[#124074] font-bold'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    {selectedCategory === cat && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#124074] shadow-[0_0_20px_rgba(18,64,116,0.2)]"></div>
                                    )}

                                    <div className="flex items-center gap-4 relative z-10">
                                        <span className={`text-[18px] tracking-wide transition-all duration-300 ${selectedCategory === cat ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                                            {cat}
                                        </span>
                                    </div>
                                    <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg transition-all duration-500 relative z-10 ${selectedCategory === cat
                                        ? 'bg-[#124074] text-white shadow-[0_10px_20px_rgba(18,64,116,0.1)]'
                                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                                        }`}>
                                        {categoryCounts[cat] || 0}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Auctions Grid Area */}
                <main className="flex-1 min-w-0 pb-16">
                    <div className="max-w-7xl px-6 lg:px-12">
                        {/* Status Label */}
                        <div className="flex items-center gap-6 mb-10 mt-6">
                            <div className="w-2 h-16 bg-[#124074] rounded-full shadow-lg shadow-blue-900/10"></div>
                            <div>
                                <h2 className="text-3xl font-light text-slate-900 tracking-tight leading-tight">
                                    {selectedCategory === 'all' ? 'All Biddings' : selectedCategory}
                                </h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                        {filteredAuctions.length} {filteredAuctions.length === 1 ? 'Item' : 'Items'} Available
                                    </p>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} className="bg-white rounded-[2rem] h-[400px] animate-pulse border border-slate-100"></div>
                                ))}
                            </div>
                        ) : filteredAuctions.length === 0 ? (
                            <div className="bg-white rounded-[3rem] border border-slate-200 border-dashed py-24 text-center">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Gavel className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">No Auctions Found</h3>
                                <p className="text-slate-400 font-light max-w-sm mx-auto">
                                    There are no items currently available for bidding in this category.
                                </p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                {filteredAuctions.map(auction => (
                                    <AuctionCard
                                        key={auction.id}
                                        auction={auction}
                                        getSignedUrl={getSignedUrl}
                                        formatCurrency={formatCurrency}
                                        onPlaceBid={handlePlaceBid}
                                        onViewDetails={handleViewDetails}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>



            {/* Bid Modal */}
            {showBidModal && selectedAuction && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
                    onClick={closeBidModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up border border-[#124074]/20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                    <Gavel className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold font-outfit text-gray-900">Place Your Bid</h2>
                                    <p className="text-sm text-gray-500">{selectedAuction.product_name || "Unnamed Product"}</p>
                                </div>
                            </div>
                            <button
                                onClick={closeBidModal}
                                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content - Side by Side */}
                        <div className="overflow-y-auto flex-1 p-6">
                            <div className="grid md:grid-cols-2 gap-8 items-stretch h-full">
                                {/* Left Side - Image Only */}
                                <div>
                                    {bidModalImageUrl ? (
                                        <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 h-full flex items-center justify-center">
                                            <img
                                                src={bidModalImageUrl}
                                                alt={selectedAuction.product_name}
                                                className="max-w-full max-h-[350px] w-auto h-auto object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-xl bg-gray-100 flex items-center justify-center h-full min-h-[400px]">
                                            <span className="text-gray-400">No image available</span>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side - Form and Bid Info */}
                                <div className="relative h-full flex flex-col">
                                    {/* Bid History Overlay for Place Bid Modal */}
                                    {showBidHistory && (
                                        <div className="absolute inset-0 bg-white z-20 flex flex-col animate-slide-up">
                                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setShowBidHistory(false)}
                                                        className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-[#124074]"
                                                    >
                                                        <ChevronRight className="w-5 h-5 rotate-180" />
                                                    </button>
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Bid History</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold">{bidHistory.length} Total Bids</p>
                                                    </div>
                                                </div>
                                                <div className="px-2 py-1 bg-[#124074] text-white rounded text-[8px] font-black uppercase tracking-widest">Live</div>
                                            </div>

                                            <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
                                                <div className="space-y-3">
                                                    {bidHistory.length === 0 ? (
                                                        <div className="text-center py-12 opacity-40">
                                                            <Gavel className="w-10 h-10 mx-auto mb-2" />
                                                            <p className="text-xs font-bold uppercase tracking-widest">No bids yet</p>
                                                        </div>
                                                    ) : (
                                                        bidHistory.map((bid, index) => (
                                                            <div key={bid.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${index === 0 ? 'bg-[#124074] text-white border-[#124074] shadow-lg shadow-blue-900/10' : 'bg-slate-50/50 border-slate-100 text-slate-600'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black ${index === 0 ? 'bg-white text-[#124074]' : 'bg-white border border-slate-100 text-slate-400'}`}>
                                                                        #{bidHistory.length - index}
                                                                    </div>
                                                                    <div>
                                                                        <p className={`text-xs font-bold ${index === 0 ? 'text-white' : 'text-slate-800'}`}>
                                                                            {formatCurrency(parseFloat(bid.bid_amount))}
                                                                        </p>
                                                                        <p className={`text-[8px] uppercase tracking-widest ${index === 0 ? 'text-white/60' : 'text-slate-400'}`}>
                                                                            {new Date(bid.created_at).toLocaleDateString()} at {new Date(bid.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {index === 0 && (
                                                                    <div className="px-1.5 py-0.5 bg-white/20 rounded text-[7px] font-black uppercase tracking-widest">Highest</div>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowBidHistory(false)}
                                                className="mt-4 w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                                            >
                                                Back to Bid
                                            </button>
                                        </div>
                                    )}

                                    {/* Bid History Trigger Button (Only visible when history is hidden) */}
                                    {!showBidHistory && (
                                        <button
                                            type="button"
                                            onClick={() => setShowBidHistory(true)}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all mb-3 uppercase tracking-widest border border-slate-100 shadow-sm"
                                        >
                                            <History className="w-3 h-3" />
                                            View Bid History
                                        </button>
                                    )}

                                    {/* Current Bid Info */}
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Tag className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Starting Price</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-600">
                                                    {formatCurrency(parseFloat(selectedAuction.starting_price))}
                                                </span>
                                            </div>
                                            <div className="border-t border-slate-200/50 pt-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-[#124074]">
                                                        <TrendingUp className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Highest Bid</span>
                                                    </div>
                                                    <span className="text-xl font-black text-[#124074]">
                                                        {selectedAuction.status === 'upcoming' ? '-' : formatCurrency(parseFloat(selectedAuction.current_highest_bid || selectedAuction.starting_price))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bid Form */}
                                    <form onSubmit={(e) => { e.preventDefault(); handleSubmitBid(); }} className="space-y-6 flex flex-col h-full overflow-hidden">
                                        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                                            <div>
                                                <label htmlFor="bid-amount" className="label flex items-center gap-2">
                                                    Your Bid Amount (PKR) <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    id="bid-amount"
                                                    min={parseFloat(selectedAuction.current_highest_bid || selectedAuction.starting_price) + 1}
                                                    step="0.01"
                                                    value={bidAmount}
                                                    onChange={(e) => setBidAmount(e.target.value)}
                                                    placeholder={`Enter amount higher than ${formatCurrency(parseFloat(selectedAuction.current_highest_bid || selectedAuction.starting_price))}`}
                                                    required
                                                    className="input-field"
                                                />
                                                <small className="text-gray-500 text-sm mt-2 block">
                                                    Your bid must be higher than the current highest bid.
                                                </small>
                                            </div>

                                            {bidFeedback && (
                                                <div
                                                    className={`p-4 rounded-xl flex items-center gap-3 ${bidFeedback.type === "success"
                                                        ? "bg-green-50 text-green-700 border border-green-200"
                                                        : "bg-red-50 text-red-700 border border-red-200"
                                                        }`}
                                                >
                                                    <span className="text-xl">
                                                        {bidFeedback.type === "success" ? "✅" : "❌"}
                                                    </span>
                                                    <span className="font-medium">{bidFeedback.message}</span>
                                                </div>
                                            )}
                                        </div>



                                        <div className="flex gap-4 pt-4 mt-auto border-t border-slate-100 bg-white">
                                            <button
                                                type="button"
                                                onClick={closeBidModal}
                                                disabled={bidLoading || bidFeedback?.type === "success"}
                                                className="btn-secondary flex-1"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={bidLoading || !bidAmount.trim() || bidFeedback?.type === "success"}
                                                className={`btn-primary flex-1 ${bidLoading ? 'btn-loading' : ''}`}
                                            >
                                                {bidLoading ? 'Placing Bid...' : (
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
                    </div>
                </div>
            )}

            {/* Product Detail Modal */}
            {showProductDetail && selectedProductForView && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
                    onClick={closeProductDetail}
                >
                    <div
                        className="bg-white w-full max-w-5xl max-h-[95vh] rounded-[2.5rem] shadow-2xl animate-slide-up flex flex-col overflow-hidden border border-[#124074]/20 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button - Absolute Positioned */}
                        <button
                            onClick={closeProductDetail}
                            className="absolute top-4 right-4 w-12 h-12 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-900 hover:rotate-90 z-20"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="grid lg:grid-cols-2 h-full">
                                {/* Image Section */}
                                <div className="p-8 lg:p-10 bg-slate-50/50 flex items-center justify-center relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#124074]/5 to-transparent pointer-events-none"></div>
                                    {productImageUrl ? (
                                        <img
                                            src={productImageUrl}
                                            alt={selectedProductForView.product_name}
                                            className="relative z-10 w-full h-full max-h-[380px] object-contain rounded-2xl drop-shadow-2xl"
                                        />
                                    ) : (
                                        <div className="w-full aspect-square bg-white rounded-3xl flex flex-col items-center justify-center border border-slate-100 shadow-sm">
                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">No Image</span>
                                        </div>
                                    )}
                                </div>

                                {/* Info Section */}
                                <div className="p-8 lg:p-10 pt-6 lg:pt-8 flex flex-col space-y-5 overflow-y-auto relative">
                                    {/* Bid History Overlay */}
                                    {showBidHistory && (
                                        <div className="absolute inset-0 bg-white z-[110] flex flex-col animate-slide-left">
                                            <div className="p-8 lg:p-10 pt-6 lg:pt-8 flex flex-col h-full">
                                                <div className="flex items-center justify-between mb-8">
                                                    <button
                                                        onClick={() => setShowBidHistory(false)}
                                                        className="flex items-center gap-2 text-slate-400 hover:text-[#124074] transition-all group"
                                                    >
                                                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Back</span>
                                                    </button>
                                                    <div className="px-3 py-1 bg-[#124074]/5 text-[#124074] rounded-full text-[10px] font-black uppercase tracking-widest">
                                                        {bidHistory.length} Bids Total
                                                    </div>
                                                </div>

                                                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-6">
                                                    Bid History
                                                </h3>

                                                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
                                                    {bidHistory.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                                            <History className="w-12 h-12 mb-4 opacity-20" />
                                                            <p className="text-sm font-medium uppercase tracking-widest">No bids placed yet</p>
                                                        </div>
                                                    ) : (
                                                        bidHistory.map((bid, index) => (
                                                            <div key={bid.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${index === 0 ? 'bg-[#124074] text-white border-[#124074] shadow-xl shadow-blue-900/20' : 'bg-slate-50/50 border-slate-100 text-slate-600'}`}>
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-white text-[#124074]' : 'bg-white border border-slate-100 text-slate-400'}`}>
                                                                        #{bidHistory.length - index}
                                                                    </div>
                                                                    <div>
                                                                        <p className={`text-sm font-bold tracking-tight ${index === 0 ? 'text-white' : 'text-slate-800'}`}>
                                                                            {formatCurrency(parseFloat(bid.bid_amount))}
                                                                        </p>
                                                                        <p className={`text-[9px] uppercase tracking-widest ${index === 0 ? 'text-white/60' : 'text-slate-400'}`}>
                                                                            {new Date(bid.created_at).toLocaleDateString()} at {new Date(bid.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {index === 0 && (
                                                                    <div className="px-2 py-1 bg-white/20 rounded text-[8px] font-black uppercase tracking-widest">Highest</div>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Identity & Action */}
                                    <div className="flex items-start justify-between gap-4 pr-16">
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
                                            {selectedProductForView.product_name}
                                        </h3>
                                        <p className="text-lg text-slate-500 font-light leading-relaxed line-clamp-2">
                                            {selectedProductForView.product_description}
                                        </p>
                                    </div>


                                    {/* Financial & Donation Info */}
                                    <div className="flex flex-col gap-6 py-2">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50/80 flex items-center justify-center border border-slate-100 shadow-sm">
                                                <Tag className="w-7 h-7 text-slate-400" strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Starting Price</p>
                                                <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                                                    {formatCurrency(parseFloat(selectedProductForView.starting_price))}
                                                </h4>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50/80 flex items-center justify-center border border-slate-100 shadow-sm">
                                                <TrendingUp className="w-7 h-7 text-slate-400" strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Highest Bid</p>
                                                <div className="flex items-center gap-4">
                                                    <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                                                        {selectedProductForView.status === 'upcoming' ? '-' : formatCurrency(parseFloat(selectedProductForView.current_highest_bid || selectedProductForView.starting_price))}
                                                    </h4>
                                                    {selectedProductForView.status !== 'upcoming' && (
                                                        <button
                                                            onClick={() => setShowBidHistory(!showBidHistory)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#124074]/5 text-[#124074] rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#124074] hover:text-white transition-all shadow-sm"
                                                        >
                                                            <History className="w-3 h-3" />
                                                            {showBidHistory ? "Hide" : "History"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50/50 p-5 rounded-xl border border-[#124074]/15">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Starts</p>
                                            <div className="flex items-center gap-2 text-slate-600 font-bold">
                                                <Calendar className="w-4 h-4 text-[#124074]" />
                                                <span>{new Date(selectedProductForView.bid_start_date).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50/50 p-5 rounded-xl border border-[#124074]/15">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ends</p>
                                            <div className="flex items-center gap-2 text-slate-600 font-bold">
                                                <Calendar className="w-4 h-4 text-[#124074]" />
                                                <span>{new Date(selectedProductForView.bid_end_date).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 lg:p-6 border-t border-slate-100 flex items-center justify-end gap-4 bg-slate-50/30">
                            <button
                                onClick={closeProductDetail}
                                className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all"
                            >
                                CLOSE
                            </button>
                            {selectedProductForView.status === "active" && (
                                <button
                                    onClick={() => {
                                        closeProductDetail();
                                        handlePlaceBid(selectedProductForView);
                                    }}
                                    className="px-8 py-3 bg-[#124074] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#103866] transition-all shadow-lg shadow-blue-900/20"
                                >
                                    PLACE BID
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AuctionCard = ({ auction, getSignedUrl, formatCurrency, onPlaceBid, onViewDetails }) => {
    const navigate = useNavigate();
    const [imageUrl, setImageUrl] = useState(null);
    const [imageLoading, setImageLoading] = useState(true);

    useEffect(() => {
        const path = auction.product_image_url || auction.product_donations?.image_url;
        if (path) {
            loadImage(path);
        } else {
            setImageLoading(false);
        }
    }, [auction.product_image_url, auction.product_donations?.image_url]);

    const loadImage = async (path) => {
        try {
            const url = await getSignedUrl(path);
            setImageUrl(url);
        } catch (error) {
            console.error('Error loading image:', error);
        } finally {
            setImageLoading(false);
        }
    };

    // Count bids for this auction
    const [bidCount, setBidCount] = useState(0);
    useEffect(() => {
        const loadBidCount = async () => {
            try {
                const { count } = await supabase
                    .from('bids')
                    .select('*', { count: 'exact', head: true })
                    .eq('bidding_product_id', auction.id);
                setBidCount(count || 0);
            } catch (error) {
                console.error('Error loading bid count:', error);
            }
        };
        loadBidCount();
    }, [auction.id]);

    return (
        <div
            onClick={() => onViewDetails(auction)}
            className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden group hover:shadow-2xl hover:shadow-[#124074]/10 transition-all duration-500 cursor-pointer"
        >
            <div className="relative h-56 overflow-hidden">
                {/* Status Badge */}
                <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl z-10 backdrop-blur-md border border-white/20 ${auction.status === 'active'
                        ? 'bg-green-500/90 text-white'
                        : 'bg-blue-500/90 text-white'
                    }`}>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${auction.status === 'active' ? 'bg-white' : 'bg-white/80'}`}></div>
                        {auction.status}
                    </div>
                </div>

                {imageLoading ? (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#124074]"></div>
                    </div>
                ) : imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={auction.product_name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-100/50 flex items-center justify-center">
                        <Gavel className="w-10 h-10 text-slate-300" />
                    </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-[#124074]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl scale-50 group-hover:scale-100 transition-all duration-500">
                        <ArrowRight className="w-6 h-6 text-[#124074]" />
                    </div>
                </div>
            </div>

            <div className="p-4">

                <h3 className="text-base font-bold text-slate-800 tracking-tight line-clamp-1 mb-1 uppercase">
                    {auction.product_name || 'Unnamed Product'}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">click to view and place bid</p>
            </div>
        </div>
    );
};

// Countdown Timer Component
const CountdownTimer = ({ endDate }) => {
    const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: false });

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date();
            const end = new Date(endDate);
            const diff = end - now;

            if (diff <= 0) {
                setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining({ days, hours, minutes, seconds, ended: false });
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [endDate]);

    if (timeRemaining.ended) {
        return <div className="text-red-600 font-semibold">Bidding Ended</div>;
    }

    return (
        <div className="flex items-center gap-3">
            {timeRemaining.days > 0 && (
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary-600 font-outfit">{timeRemaining.days}</span>
                    <span className="text-xs text-gray-500 font-medium">Days</span>
                </div>
            )}
            <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary-600 font-outfit">{String(timeRemaining.hours).padStart(2, '0')}</span>
                <span className="text-xs text-gray-500 font-medium">Hours</span>
            </div>
            <span className="text-primary-600 font-bold">:</span>
            <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary-600 font-outfit">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                <span className="text-xs text-gray-500 font-medium">Minutes</span>
            </div>
            <span className="text-primary-600 font-bold">:</span>
            <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary-600 font-outfit">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                <span className="text-xs text-gray-500 font-medium">Seconds</span>
            </div>
        </div>
    );
};

export default BiddingGallery;


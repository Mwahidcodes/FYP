import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Package, FileText, CheckCircle, AlertCircle, Info, ArrowRight, MapPin, MessageCircle } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";

function ProductRequestForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [address, setAddress] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [hasPending, setHasPending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const isLoggedIn = !!currentUser;

  // Get productId from query params
  const searchParams = new URLSearchParams(location.search);
  const productId = searchParams.get("productId");

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (user) setCurrentUser(JSON.parse(user));
  }, []);

  useEffect(() => {
    if (!productId) {
      navigate("/browse-products");
      return;
    }
    loadProductData();
    checkExistingPending();
  }, [productId]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("product_donations")
        .select("*")
        .eq("id", productId)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (err) {
      console.error("Error loading product:", err);
      setFeedback({ type: "error", message: "Failed to load product details." });
    } finally {
      setLoading(false);
    }
  };

  const checkExistingPending = async () => {
    try {
      const user = localStorage.getItem("currentUser");
      if (!user) {
        navigate("/");
        return;
      }
      const userData = JSON.parse(user);

      if (!userData.is_verified) {
        navigate("/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("product_requests")
        .select("id")
        .eq("user_id", userData.id)
        .eq("status", "pending")
        .limit(1);

      if (data && data.length > 0) {
        setHasPending(true);
        setFeedback({ type: "warning", message: "You already have a pending product request. Please wait for its approval." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || hasPending) return;

    if (!reason.trim() || !address.trim()) {
      setFeedback({ type: "error", message: "Please provide both a reason and your delivery address." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const user = localStorage.getItem("currentUser");
      if (!user) throw new Error("Please login first.");
      const userData = JSON.parse(user);

      if (!userData.is_verified) {
        throw new Error("Your account must be verified to request products.");
      }

      const { error } = await supabase.from("product_requests").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          product_donation_id: product.id,
          product_name: product.product_name,
          product_category: product.category,
          reason: `${reason.trim()} [DELIVERY ADDRESS] ${address.trim()}`,
          status: "pending",
        },
      ]);

      if (error) throw error;

      setFeedback({ type: "success", message: "Your request has been submitted successfully! Admin will review it shortly." });
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error) {
      let errMsg = error.message;
      if (errMsg.includes('Failed to fetch')) {
        errMsg = 'Check your internet connection and try again.';
      }
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const mainContentRef = useRef(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [feedback]);

  if (loading) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#124074]"></div>
        <p className="mt-4 text-slate-400 font-medium tracking-widest uppercase text-xs">Loading Request Form...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white text-slate-900 flex flex-col font-outfit">
      <AuthenticatedNavbar />

      <div className="flex flex-1 relative overflow-hidden bg-slate-50/50 pt-20">
        {/* Global Background Blobs */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#124074]/8 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Left Panel: Process Sidebar */}
        <aside className="hidden md:flex w-72 bg-white/40 backdrop-blur-2xl border-r border-slate-100/50 pt-6 px-6 pb-8 flex flex-col shrink-0 relative z-20 shadow-[20px_0_40px_rgba(0,0,0,0.01)]">
          <button
            onClick={() => navigate("/request-donation")}
            className="w-9 h-9 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Process <span className="text-slate-300">Guide</span></h2>
            <div className="h-1 w-8 bg-[#124074] rounded-full mt-2"></div>
          </div>

          <div className="relative flex-1 flex flex-col justify-center">
            {/* Timeline Line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-100"></div>

            <div className="space-y-4 relative z-10">
              {[
                { title: "Item Detail", desc: "Name, Category, Message" },
                { title: "Verification", desc: "Accounts must be verified." },
                { title: "Admin Review", desc: "Wait for final approval." },
                { title: "Status", desc: "Get notified of progress." }
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-black border-2 bg-white text-slate-400 border-slate-100">
                    0{i + 1}
                  </div>
                  <div className="pt-1">
                    <h4 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-900">
                      {s.title}
                    </h4>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed mt-1.5">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </aside>

        {/* Right Panel: Form Area */}
        <main
          ref={mainContentRef}
          className="flex-1 relative flex flex-col pt-6 pb-8 px-8 lg:px-16 overflow-y-auto overflow-x-hidden no-scrollbar bg-transparent"
        >

          <div className="max-w-3xl w-full mx-auto relative z-10">
            <header className="mb-6 animate-fade-in">

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-[#124074]">
                Request <span className="font-black text-[#124074]">Product</span>
              </h1>
              <p className="text-xs text-slate-500 mt-3 font-medium max-w-md leading-relaxed">
                Provide honest details to help our donors and admins verify your request.
              </p>
            </header>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#124074]/20 to-transparent"></div>

              {feedback && (
                <div className={`mb-10 p-5 rounded-2xl border flex items-start gap-4 animate-slide-down ${feedback.type === "success" ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" :
                  feedback.type === "warning" ? "bg-amber-50/50 border-amber-100 text-amber-800" :
                    "bg-rose-50/50 border-rose-100 text-rose-800"
                  }`}>
                  <div className={`p-2 rounded-lg ${feedback.type === "success" ? "bg-emerald-500/10" :
                    feedback.type === "warning" ? "bg-amber-500/10" : "bg-rose-500/10"
                    }`}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  </div>
                  <span className="font-bold text-sm pt-2">{feedback.message}</span>
                </div>
              )}

              <div className="mb-10 p-6 bg-[#124074]/5 rounded-3xl border border-[#124074]/10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-[#124074]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#124074]">Requesting Item</h3>
                    <p className="text-sm font-bold text-slate-900 mt-1">{product?.product_name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-white rounded-md border border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {product?.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className={`space-y-10 ${hasPending ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                <div className="space-y-3">
                  <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Reason for Request</label>
                  <div className="relative group">
                    <MessageCircle className="absolute left-6 top-6 w-4 h-4 text-slate-300 group-focus-within:text-[#124074] transition-all" />
                    <textarea
                      placeholder="Why do you need this item? Please be brief but honest..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows="4"
                      required
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-semibold text-slate-600 focus:bg-white focus:border-[#124074] focus:ring-8 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-300 placeholder:font-light resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Delivery Address</label>
                  <div className="relative group">
                    <MapPin className="absolute left-6 top-6 w-4 h-4 text-slate-300 group-focus-within:text-emerald-500 transition-all" />
                    <textarea
                      placeholder="Provide your complete delivery address..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows="3"
                      required
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-semibold text-slate-600 focus:bg-white focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 transition-all outline-none placeholder:text-slate-300 placeholder:font-light resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className={`w-full md:w-max bg-[#124074] text-white rounded-2xl py-4 px-12 text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 ${submitting ? 'opacity-70 pointer-events-none' : ''}`}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        Submit Request
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProductRequestForm;


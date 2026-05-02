import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, HeartHandshake, LogIn, ArrowLeft, X, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';

function Login({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  // Disable background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Get return URL and additional params from query params

  let returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const productId = searchParams.get('productId');
  const openBid = searchParams.get('openBid');

  try {
    returnUrl = decodeURIComponent(returnUrl);
  } catch (e) {
    // If decoding fails, use original
  }

  let finalReturnUrl = returnUrl;
  if (productId) {
    if (returnUrl === '/bidding' && openBid) {
      finalReturnUrl = `/bidding?productId=${productId}&openBid=true`;
    } else if (returnUrl === '/bidding') {
      finalReturnUrl = `/bidding?productId=${productId}`;
    } else if (returnUrl.includes('/product-request')) {
      finalReturnUrl = `${returnUrl}?productId=${productId}`;
    }
  }

  // Redirect if already logged in logic removed per user request to keep form visible
  useEffect(() => {
    // We'll keep the form visible so the user can re-login if they want
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error) throw new Error('Invalid email or password!');

      if (data.role === 'admin') {
        onClose();
        navigate('/admin');
      } else {
        localStorage.setItem('currentUser', JSON.stringify(data));

        onClose();
        // Handle complex redirects
        if (returnUrl === '/bidding-gallery' && productId && openBid) {
          navigate(`/bidding-gallery?productId=${productId}&openBid=true`);
        } else if (returnUrl === '/bidding' && productId && openBid) {
          navigate(`/bidding?productId=${productId}&openBid=true`);
        } else if (returnUrl === '/bidding' && productId) {
          navigate(`/bidding?productId=${productId}`);
        } else if (returnUrl === '/bidding' || returnUrl === '/bidding-gallery') {
          navigate('/bidding-gallery');
        } else if (returnUrl.includes('/product-request') && productId) {
          navigate(finalReturnUrl);
        } else {
          navigate(returnUrl);
        }
      }
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/15 backdrop-blur-[2px] animate-in fade-in duration-500">
      {/* Clickable Backdrop Area */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.2)] relative z-10 border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-500">

        {/* Glow Effects - Very subtle */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#1db5f4]/5 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#124074]/5 rounded-full blur-[80px] pointer-events-none"></div>

        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#124074] via-[#1db5f4] to-[#124074]"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all z-20 group shadow-sm"
        >
          <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
        </button>

        {/* Header - Non-scrollable */}
        <div className="p-10 pb-4 text-center relative z-10">
          <h2 className="text-3xl font-semibold text-[#124074] font-outfit tracking-tight leading-tight">Welcome Back</h2>
          <p className="text-gray-500 mt-2 text-sm font-medium flex items-center justify-center gap-1.5">
            Safe, Secure & Transparent Giving
          </p>
        </div>

        {/* Form Body - Scrollable */}
        <div className="overflow-y-auto px-8 md:px-12 pb-10 custom-scrollbar relative z-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse flex-shrink-0"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700 tracking-wide ml-1 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#1db5f4]" />
                Email Address
              </label>
              <div className="relative group">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#1db5f4]/10 focus:border-[#1db5f4] transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                  placeholder="name@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-1 ml-1">
                <label className="text-[13px] font-bold text-gray-700 tracking-wide flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#1db5f4]" />
                  Password
                </label>
                <button type="button" onClick={() => setSearchParams({ forgot: 'true' })} className="text-[11px] font-bold text-[#124074] hover:underline">
                  FORGOT PASSWORD?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-5 pr-12 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#1db5f4]/10 focus:border-[#1db5f4] transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1db5f4] transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full max-w-[240px] h-11 bg-[#124074] text-white rounded-xl flex items-center justify-center active:scale-[0.98] transition-all shadow-[0_8px_15px_rgba(18,64,116,0.15)] font-medium text-sm relative overflow-hidden group ${loading ? 'opacity-70' : 'hover:bg-[#0e335d] hover:shadow-[0_12px_20px_rgba(18,64,116,0.25)] hover:-translate-y-0.5'}`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="tracking-wide">Signing in...</span>
                  </div>
                ) : (
                  <span className="tracking-wider">Sign In</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100">
            <p className="text-gray-500 font-medium text-sm">
              Don't have an account? <button onClick={() => setSearchParams({ signup: 'true' })} className="text-[#124074] hover:text-[#1db5f4] font-semibold ml-1 transition-colors">Sign Up Now</button>
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
}

export default Login;

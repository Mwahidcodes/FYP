import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, X, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';

function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if already logged in as admin
  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser');
    if (adminUser) {
      const from = location.state?.from || '/admin-panel';
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const { data: admin, error: supabaseError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (supabaseError || !admin) {
        throw new Error('Invalid admin credentials!');
      }

      if (admin.password !== password) {
        throw new Error('Invalid admin credentials!');
      }

      localStorage.setItem(
        'adminUser',
        JSON.stringify({ id: admin.id, email: admin.email })
      );
      
      const from = location.state?.from || '/admin-panel';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to login as admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 animate-fade-in relative overflow-hidden bg-gray-900">
      {/* Full Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-60 scale-105"
        style={{ backgroundImage: "url('/admin-bg.png')" }}
      ></div>
      
      {/* Dark Overlay/Blur */}
      <div className="absolute inset-0 z-0 bg-[#0a2544]/40 backdrop-blur-[4px]"></div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54 48L54 54L48 54L48 48L54 48ZM6 48L6 54L0 54L0 48L6 48ZM54 0L54 6L48 6L48 0L54 0ZM6 0L6 6L0 6L0 0L6 0Z' fill='%231db5f4' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")` }}></div>

      {/* Back Button */}
      <div className="absolute top-8 left-8 z-20">
        <button
          onClick={() => navigate("/")}
          className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all shadow-2xl active:scale-95 group"
        >
          <ArrowLeft className="w-6 h-6 text-white transition-colors" />
        </button>
      </div>

      {/* Admin Login Card - Centered */}
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative z-10 border border-white/20 flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-[#124074] via-[#1db5f4] to-[#124074]"></div>

        {/* Header */}
        <div className="p-12 pb-6 text-center relative z-10">
          <div className="w-16 h-16 bg-[#124074]/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
             <ShieldCheck className="w-8 h-8 text-[#124074]" />
          </div>
          <h2 className="text-4xl font-bold text-[#124074] font-outfit tracking-tight leading-tight">Admin Portal</h2>
          <p className="text-gray-500 mt-2 text-sm font-medium tracking-wide">Enter your secure credentials</p>
        </div>

        {/* Form Body */}
        <div className="px-10 md:px-14 pb-14 relative z-10">
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
                Email
              </label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#1db5f4]/10 focus:border-[#1db5f4] transition-all outline-none text-gray-900 font-medium placeholder:text-gray-300"
                  placeholder=""
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700 tracking-wide ml-1 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#1db5f4]" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-5 pr-12 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#1db5f4]/10 focus:border-[#1db5f4] transition-all outline-none text-gray-900 font-medium placeholder:text-gray-300"
                  placeholder=""
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

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full max-w-[260px] h-12 bg-[#124074] text-white rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all shadow-[0_15px_30px_rgba(18,64,116,0.2)] font-semibold text-sm relative overflow-hidden group ${loading ? 'opacity-70' : 'hover:bg-[#0e335d] hover:shadow-[0_20px_40px_rgba(18,64,116,0.3)] hover:-translate-y-1'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform"></div>
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="tracking-wide">Signing in...</span>
                  </div>
                ) : (
                  <span className="tracking-wider text-base">Login as Administrator</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }
      `}} />
    </div>
  );
}

export default AdminLogin;

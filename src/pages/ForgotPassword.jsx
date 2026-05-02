import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, X, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';

function ForgotPassword({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setFeedback(null);
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

  if (!isOpen) return null;

  const generateOtp = (length = 6) => {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  };

  const sendResetEmail = async (email, name, otp) => {
    try {
      const emailjs = await import('@emailjs/browser').catch(() => null);
      if (!emailjs || !process.env.REACT_APP_EMAILJS_SERVICE_ID) {
        console.log('EmailJS not configured');
        return false;
      }
      if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
        emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
      }
      await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        {
          to_email: email,
          to_name: name || 'User',
          subject: 'Password Reset OTP',
          message: `Your password reset OTP is ${otp}. Valid for 15 mins.`
        }
      );
      return true;
    } catch (err) {
      console.log('Reset email failed:', err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setFeedback(null);
    if (!email.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email.' });
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', trimmedEmail)
        .single();

      if (error || !user) {
        setFeedback({ type: 'success', message: 'If registered, an OTP has been sent. Moving to reset...' });
        setTimeout(() => {
          onClose();
          navigate('/reset-password', { state: { email: trimmedEmail } });
        }, 2000);
        return;
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await supabase.from('password_resets').insert([{ email: trimmedEmail, otp, expires_at: expiresAt }]);
      await sendResetEmail(user.email, user.name, otp);

      setFeedback({ type: 'success', message: 'OTP sent! Redirecting to reset page...' });
      setTimeout(() => {
        onClose();
        navigate('/reset-password', { state: { email: trimmedEmail } });
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      setFeedback({ type: 'error', message: 'Error sending OTP. Please try again.' });
    } finally {
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
          <h2 className="text-3xl font-semibold text-[#124074] font-outfit tracking-tight leading-tight">Forgot Password?</h2>
          <p className="text-gray-500 mt-2 text-sm font-medium flex items-center justify-center gap-1.5">
            Safe, Secure & Transparent Giving
          </p>
        </div>

        {/* Form Body - Scrollable */}
        <div className="overflow-y-auto px-8 md:px-12 pb-10 custom-scrollbar relative z-10">
          {feedback && (
            <div className={`mb-6 p-4 border rounded-2xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
              : 'bg-red-50 border-red-100 text-red-600'
              }`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${feedback.type === 'success' ? 'bg-emerald-500' : 'bg-red-600 animate-pulse'}`}></div>
              {feedback.message}
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
              <p className="text-[11px] text-gray-500 ml-2 mt-2">We'll send you reset instructions to your email.</p>
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
                    <span className="tracking-wide">Sending OTP...</span>
                  </div>
                ) : (
                  <span className="tracking-wider">Send Reset OTP</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100">
            <p className="text-gray-500 font-medium text-sm">
              Remembered? <button onClick={() => setSearchParams({ login: 'true' })} className="text-[#124074] hover:text-[#1db5f4] font-semibold ml-1 transition-colors">Back to Login</button>
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

export default ForgotPassword;

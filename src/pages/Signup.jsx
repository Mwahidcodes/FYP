import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, HeartHandshake, User, Phone, UserPlus, ArrowLeft, X, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as emailjs from '@emailjs/browser';

// Initialize EmailJS once at startup for instant delivery
if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
  emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
}

function generateSignupOtp(length = 6) {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

async function sendSignupOtpEmail(email, name, otp) {
  try {
    if (!process.env.REACT_APP_EMAILJS_SERVICE_ID || !process.env.REACT_APP_EMAILJS_PUBLIC_KEY || !process.env.REACT_APP_EMAILJS_TEMPLATE_ID) {
      return { success: false, error: 'Email configuration is missing in .env file' };
    }

    const subject = 'Verify Your Email - Share For Good';
    const message = `Hi ${name || 'User'},\n\nThank you for signing up for Share For Good.\n\nYour email verification OTP: ${otp}\n\nThis code confirms that this email address belongs to you.\n\nThankyou for visiting share for good!`;

    // Explicitly pass the public key in the send call for maximum reliability
    const result = await emailjs.send(
      process.env.REACT_APP_EMAILJS_SERVICE_ID,
      process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        to_name: name || 'User',
        subject,
        message,
      },
      process.env.REACT_APP_EMAILJS_PUBLIC_KEY
    );

    console.log('Signup OTP email sent successfully:', result.status, result.text);
    return { success: true };
  } catch (error) {
    console.error('Signup OTP email failed:', error);
    return {
      success: false,
      error: error?.text || error?.message || 'Unknown error'
    };
  }
}

function Signup({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    terms: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        terms: false,
      });
      setError('');
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 11);
      setFormData({ ...formData, [name]: numericValue });
    } else {
      setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFeedback(null);

    if (loading) return;

    const trimmedName = formData.name.trim();
    const trimmedPhone = formData.phone.trim();

    const nameRegex = /^[a-zA-Z ]+$/;
    if (!nameRegex.test(trimmedName)) {
      setError('Name can only contain letters and spaces (no numbers).');
      return;
    }

    if (!trimmedPhone.startsWith('03')) {
      setError('Phone number must start with 03 (e.g., 03123456789).');
      return;
    }

    if (trimmedPhone.length !== 11) {
      setError('Phone number must be exactly 11 digits.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters!');
      return;
    }

    if (!formData.terms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    try {
      setLoading(true);

      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.email.toLowerCase().trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        setError('An account with this email already exists. Please login instead.');
        setLoading(false);
        return;
      }

      const otp = generateSignupOtp();

      const { error: insertError } = await supabase
        .from('signup_otps')
        .insert([
          {
            name: trimmedName,
            email: formData.email.toLowerCase().trim(),
            password: formData.password,
            phone: trimmedPhone,
            otp,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      // Send the email and check if it succeeded
      const emailResult = await sendSignupOtpEmail(formData.email.toLowerCase().trim(), formData.name, otp);

      if (!emailResult.success) {
        setError(`Failed to send email: ${emailResult.error}. Please check your internet or EmailJS quota.`);
        setLoading(false);
        return;
      }

      setSearchParams({ verify: 'true', email: formData.email.toLowerCase().trim() });
    } catch (error) {
      setError(error.message);
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
          <h2 className="text-3xl font-semibold text-[#124074] font-outfit tracking-tight leading-tight">Join Share4Good</h2>
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
                <User className="w-3.5 h-3.5 text-[#1db5f4]" />
                Full Name
              </label>
              <div className="relative group">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full h-12 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#1db5f4]/10 focus:border-[#1db5f4] transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                  placeholder="Ahmed Khan"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-700 tracking-wide ml-1 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#1db5f4]" />
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full h-12 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#1db5f4]/10 focus:border-[#1db5f4] transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                    placeholder="name@email.com"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-700 tracking-wide ml-1 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#1db5f4]" />
                  Phone
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full h-12 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#1db5f4]/10 focus:border-[#1db5f4] transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                    placeholder="03123456789"
                    maxLength={11}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-700 tracking-wide ml-1 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#1db5f4]" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full h-12 px-5 pr-12 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#1db5f4]/10 focus:border-[#1db5f4] transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                    placeholder="••••••••"
                    autoComplete="new-password"
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

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-gray-700 tracking-wide ml-1 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1db5f4]" />
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full h-12 px-5 pr-12 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#1db5f4]/10 focus:border-[#1db5f4] transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1db5f4] transition-colors p-1"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="terms"
                  checked={formData.terms}
                  onChange={handleChange}
                  className="w-5 h-5 rounded-lg border-gray-200 text-[#124074] focus:ring-[#1db5f4]/20 transition-all cursor-pointer"
                  required
                />
                <span className="text-xs text-gray-500 font-semibold group-hover:text-gray-700 transition-colors">
                  I agree to the <Link to="/terms" className="text-[#124074] hover:underline decoration-2" onClick={onClose}>Terms</Link> & <Link to="/privacy" className="text-[#124074] hover:underline decoration-2" onClick={onClose}>Privacy Policy</Link>
                </span>
              </label>
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
                    <span className="tracking-wide">Creating...</span>
                  </div>
                ) : (
                  <span className="tracking-wider">Create My Account</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100">
            <p className="text-gray-500 font-medium text-sm">
              Already a member? <button onClick={() => setSearchParams({ login: 'true' })} className="text-[#124074] hover:text-[#1db5f4] font-semibold ml-1 transition-colors">Sign In Now</button>
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

export default Signup;

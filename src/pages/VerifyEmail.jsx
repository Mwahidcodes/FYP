import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck, Mail, X, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as emailjs from '@emailjs/browser';

// Initialize EmailJS once at startup for instant delivery
if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
  emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
}

function generateOtp(length = 6) {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

async function sendOtpEmail(email, name, otp) {
  try {
    if (!process.env.REACT_APP_EMAILJS_SERVICE_ID || !process.env.REACT_APP_EMAILJS_PUBLIC_KEY || !process.env.REACT_APP_EMAILJS_TEMPLATE_ID) {
      return { success: false, error: 'Email configuration is missing' };
    }

    const subject = 'Verify Your Email - Share For Good';
    const message = `Hi ${name || 'User'},\n\nYour new email verification OTP: ${otp}\n\nThis code confirms that this email address belongs to you.\n\nThankyou for visiting share for good!`;

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

    return { success: true };
  } catch (error) {
    console.error('OTP email failed:', error);
    return {
      success: false,
      error: error?.text || error?.message || 'Unknown error'
    };
  }
}

function VerifyEmail({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get email from query param or state
  const emailParam = searchParams.get('email') || (location.state && location.state.email) || '';

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Sync email if param changes
  useEffect(() => {
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setOtp('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setFeedback(null);

    if (!email.trim() || !otp.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email and OTP.' });
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedOtp = otp.trim();

      const { data: signupRecord, error } = await supabase
        .from('signup_otps')
        .select('*')
        .eq('email', trimmedEmail)
        .eq('otp', trimmedOtp)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !signupRecord) {
        setFeedback({ type: 'error', message: 'Invalid OTP or email. Please check your inbox.' });
        setLoading(false);
        return;
      }

      const now = new Date();
      if (new Date(signupRecord.expires_at) < now) {
        setFeedback({ type: 'error', message: 'OTP has expired. Please sign up again.' });
        setLoading(false);
        return;
      }

      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', trimmedEmail.toLowerCase().trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingUser) {
        setFeedback({ type: 'error', message: 'An account with this email already exists. Please login instead.' });
        setLoading(false);
        return;
      }

      const { data: createdUsers, error: createError } = await supabase
        .from('users')
        .insert([{
          name: signupRecord.name,
          email: signupRecord.email.toLowerCase().trim(),
          password: signupRecord.password,
          phone: signupRecord.phone,
          is_verified: false
        }])
        .select();

      if (createError) throw createError;

      const user = createdUsers[0];

      await supabase
        .from('signup_otps')
        .update({ used: true })
        .eq('id', signupRecord.id);

      localStorage.setItem('currentUser', JSON.stringify(user));
      setFeedback({ type: 'success', message: 'Email verified successfully! Redirecting to dashboard...' });
      setTimeout(() => {
        onClose();
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Verify email error:', err);
      setFeedback({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading || !email.trim()) return;

    setLoading(true);
    setFeedback(null);

    try {
      // 1. Get the latest signup record for this email
      const { data: signupRecord, error: fetchError } = await supabase
        .from('signup_otps')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !signupRecord) {
        setFeedback({ type: 'error', message: 'No signup record found. Please sign up again.' });
        setLoading(false);
        return;
      }

      // 2. Generate new OTP
      const newOtp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // 3. Update the record with new OTP
      const { error: updateError } = await supabase
        .from('signup_otps')
        .update({
          otp: newOtp,
          expires_at: expiresAt,
          used: false
        })
        .eq('id', signupRecord.id);

      if (updateError) throw updateError;

      // 4. Send the email
      const emailResult = await sendOtpEmail(email.trim().toLowerCase(), signupRecord.name, newOtp);

      if (emailResult.success) {
        setFeedback({ type: 'success', message: 'A new verification code has been sent to your email.' });
      } else {
        setFeedback({ type: 'error', message: `Failed to send email: ${emailResult.error}. Please check your EmailJS quota.` });
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setFeedback({ type: 'error', message: 'An error occurred while resending the code.' });
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
          <h2 className="text-3xl font-semibold text-[#124074] font-outfit tracking-tight leading-tight">Verify Your Email</h2>
          <p className="text-gray-500 mt-2 text-sm font-medium">Please enter the 6-digit code sent to your email.</p>
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
              <label className="text-[13px] font-bold text-gray-700 tracking-wide ml-1">
                Email Address
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
              <div className="flex justify-between items-center mb-1 ml-1">
                <label className="text-[13px] font-bold text-gray-700 tracking-wide">
                  Verification OTP
                </label>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded tracking-wider uppercase">Expires in 10m</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full h-14 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#1db5f4]/10 focus:border-[#1db5f4] transition-all outline-none text-gray-900 font-bold text-2xl tracking-[0.5em] text-center placeholder:text-gray-100"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full max-w-[260px] h-12 bg-[#124074] text-white rounded-xl flex items-center justify-center active:scale-[0.98] transition-all shadow-[0_8px_15px_rgba(18,64,116,0.15)] font-medium text-sm relative overflow-hidden group ${loading ? 'opacity-70' : 'hover:bg-[#0e335d] hover:shadow-[0_12px_20px_rgba(18,64,116,0.25)] hover:-translate-y-0.5'}`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="tracking-wide">Verifying...</span>
                  </div>
                ) : (
                  <span className="tracking-wider">Confirm Verification</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100">
            <p className="text-gray-500 font-medium text-sm mb-3">
              Didn't receive the code?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleResendOtp}
                disabled={loading}
                className="w-full h-10 bg-white border border-gray-200 text-[#124074] rounded-xl font-bold text-xs hover:bg-gray-50 hover:border-[#1db5f4] transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : 'Resend Verification Code'}
              </button>
              <button
                onClick={() => setSearchParams({ signup: 'true' })}
                className="text-xs text-[#124074] hover:text-[#1db5f4] font-semibold transition-colors"
              >
                Or Resubmit Signup
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => setSearchParams({ login: 'true' })}
              className="text-[11px] font-bold text-gray-400 hover:text-[#124074] flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              BACK TO LOGIN
            </button>
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

export default VerifyEmail;

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state && location.state.email) || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setFeedback(null);
    if (!email.trim() || !otp.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in email and OTP.' });
      return;
    }
    if (password.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const trimmedOtp = otp.trim();

      const { data: resetRecord, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('email', trimmedEmail)
        .eq('otp', trimmedOtp)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !resetRecord) {
        setFeedback({ type: 'error', message: 'Invalid OTP or email. Please check your inbox.' });
        setLoading(false);
        return;
      }

      const now = new Date();
      if (new Date(resetRecord.expires_at) < now) {
        setFeedback({ type: 'error', message: 'OTP has expired. Please request a new one.' });
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ password })
        .eq('email', trimmedEmail);

      if (updateError) throw updateError;

      await supabase
        .from('password_resets')
        .update({ used: true })
        .eq('id', resetRecord.id);

      setFeedback({ type: 'success', message: 'Password reset successful! Redirecting to login...' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setFeedback({ type: 'error', message: 'Unable to reset password. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 p-4 animate-fade-in relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 opacity-50 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-50 opacity-50 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 p-8 md:p-12 relative z-10 border border-gray-100">
        <div className="absolute top-8 left-8">
           <button onClick={() => navigate("/forgot-password")} className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all shadow-sm active:scale-95">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="text-center mb-10 mt-4">
          <h2 className="text-3xl font-bold text-gray-900 font-outfit tracking-tight">Set New Password</h2>
          <p className="text-gray-600 mt-2 font-medium">Verify your OTP and choose a strong password.</p>
        </div>

        {feedback && (
          <div className={`mb-8 p-4 border-l-4 rounded-xl text-sm font-bold flex items-center gap-3 transition-all ${feedback.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 bg-current rounded-full" />}
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-gray-700 tracking-wide ml-1">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 px-5 mt-2 bg-gray-50 border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900" placeholder="name@email.com" required />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 tracking-wide ml-1">Verification OTP</label>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full h-12 px-5 mt-2 bg-gray-50 border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900 tracking-widest font-bold text-center" placeholder="000000" maxLength={6} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700 tracking-wide ml-1">New Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 px-5 mt-2 bg-gray-50 border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[60%] -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 tracking-wide ml-1">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-12 px-5 mt-2 bg-gray-50 border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900" placeholder="••••••••" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className={`w-full h-14 bg-[#124074] text-white rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all shadow-xl shadow-blue-900/20 font-semibold text-lg ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#103866]'}`}>
            {loading ? <div className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>Resetting...</span></div> : <span>Update Password</span>}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-gray-500 font-semibold">Back to <Link to="/login" className="text-[#124074] hover:underline font-bold">Login</Link></p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;


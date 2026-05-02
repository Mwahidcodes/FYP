import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Upload, CheckCircle, AlertCircle, Info, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

function VerifyDocuments() {
  const navigate = useNavigate();
  const [affidavit, setAffidavit] = useState(null);
  const [fileName, setFileName] = useState('');
  const [bankStatement, setBankStatement] = useState(null);
  const [bankFileName, setBankFileName] = useState('');
  const [residenceDoc, setResidenceDoc] = useState(null);
  const [residenceFileName, setResidenceFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const user = localStorage.getItem('currentUser');
      if (!user) {
        navigate('/login');
        return;
      }
      const userData = JSON.parse(user);
      
      try {
        // Fetch latest user status to be sure
        const { data: latestUser, error: userError } = await supabase
          .from('users')
          .select('is_verified')
          .eq('id', userData.id)
          .single();

        if (latestUser?.is_verified) {
          // Update localStorage
          const updatedUser = { ...userData, is_verified: true };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          navigate('/dashboard');
          return;
        }

        const { data, error } = await supabase
          .from('verification_requests')
          .select('id, status')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (data && data.length > 0) {
          const lastRequest = data[0];
          if (lastRequest.status === 'pending') {
            setIsPending(true);
            setFeedback({ type: 'warning', message: 'Verification already pending. Please wait for admin review.' });
          }
        }
      } catch (err) {
        console.error('Error checking verification status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [navigate]);

  const handleFileUpload = (e, setFile, setName) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setFeedback({ type: 'error', message: 'Only PDF, JPG, and PNG files are allowed.' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'File size must be less than 10MB.' });
        return;
      }
      setFile(file);
      setName(file.name);
      setFeedback(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setFeedback(null);
    setLoading(true);

    const user = localStorage.getItem('currentUser');
    if (!user) {
      setFeedback({ type: 'error', message: 'Please login first.' });
      setLoading(false);
      return;
    }

    const userData = JSON.parse(user);

    if (!affidavit || !bankStatement) {
      setFeedback({ type: 'error', message: 'Please upload proof (Affidavit and Bank Statement).' });
      setLoading(false);
      return;
    }

    try {
      // 1. Upload Affidavit
      const fileExt = affidavit.name.split('.').pop();
      const uniqueFileName = `${userData.id}_affidavit_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(uniqueFileName, affidavit);
      if (uploadError) throw uploadError;

      // 2. Upload Bank Statement
      const bankExt = bankStatement.name.split('.').pop();
      const uniqueBankName = `${userData.id}_bank_${Date.now()}.${bankExt}`;
      const { data: bankData, error: bankError } = await supabase.storage
        .from('verification-documents')
        .upload(uniqueBankName, bankStatement);
      if (bankError) throw bankError;

      // 3. Upload Residence Document (Optional)
      let resDataPath = '';
      if (residenceDoc) {
        const resExt = residenceDoc.name.split('.').pop();
        const uniqueResName = `${userData.id}_residence_${Date.now()}.${resExt}`;
        const { data: resData, error: resError } = await supabase.storage
          .from('verification-documents')
          .upload(uniqueResName, residenceDoc);
        if (resError) throw resError;
        resDataPath = resData.path;
      }

      const combinedNames = [fileName, bankFileName, residenceFileName || ''].join('|');
      const combinedUrls = [uploadData.path, bankData.path, resDataPath].join('|');

      const { error: dbError } = await supabase
        .from('verification_requests')
        .insert([{
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          affidavit_name: combinedNames,
          affidavit_url: combinedUrls,
          reason: 'N/A',
          status: 'pending'
        }]);

      if (dbError) throw dbError;

      setFeedback({ type: 'success', message: 'Verification request submitted! Admin will review within 24-48 hours. Redirecting to dashboard...' });
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (error) {
      setLoading(false);
      let errMsg = error.message;
      if (errMsg.includes('Failed to fetch')) {
        errMsg = 'Check your internet connection and try again.';
      }
      setFeedback({ type: 'error', message: 'Error submitting verification: ' + errMsg });
    }
  };

  if (checkingStatus) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-[#124074] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex animate-fade-in bg-white">
      {/* Left Side - Seamless Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#124074] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#124074] to-[#0a2544]"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500 opacity-10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500 opacity-10 rounded-full blur-[120px]"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-center p-12 w-full h-full">
          <div className="mb-10">
            <div className="flex flex-col items-center justify-center gap-6 mb-4">
              <img src="/logo.png" alt="Share4Good Logo" className="w-32 h-32 object-contain" />
              <h1 className="text-5xl font-bold text-white font-outfit tracking-tight">Share<span className="text-blue-400">4</span>Good</h1>
            </div>
          </div>
          <p className="text-white/70 text-xl max-w-md font-medium leading-relaxed">Document verification ensures the safety and trust of our community.</p>
        </div>
      </div>

      {/* Right Side - Verification Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative overflow-y-auto no-scrollbar">


        <div className="w-full max-w-md my-12">
          <div className="text-left mb-10">
            <h2 className="text-4xl font-bold text-gray-900 font-outfit tracking-tight">Verify Your Identity</h2>
            <p className="text-gray-600 mt-2 text-lg font-medium">Please upload the required documents to complete your profile.</p>
          </div>

          {feedback && (
            <div className={`mb-8 p-4 border-l-4 rounded-xl text-sm font-bold flex items-start gap-3 transition-all ${
              feedback.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 
              feedback.type === 'warning' ? 'bg-amber-50 border-amber-500 text-amber-700' :
              'bg-red-50 border-red-500 text-red-700'
            }`}>
              {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : 
               feedback.type === 'warning' ? <Info className="w-5 h-5 flex-shrink-0 text-amber-500" /> :
               <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Affidavit Upload */}
            <div className="space-y-2">
              <label className="text-lg font-bold text-black tracking-wide ml-1 flex items-center gap-2">
                Upload Affidavit <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="affidavit"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, setAffidavit, setFileName)}
                required
                disabled={loading || isPending}
                className="hidden"
              />
              <label htmlFor="affidavit" className={`block h-16 ${loading || isPending ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <div className="w-full h-full px-6 bg-gray-50 border-gray-100 border-2 border-dashed rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all">
                  {fileName ? (
                    <div className="flex items-center gap-3 w-full">
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                      <span className="text-gray-900 font-medium truncate">{fileName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-400">
                      <Upload className="w-6 h-6" />
                      <span className="font-medium text-lg">Upload Affidavit</span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Bank Statement Upload */}
            <div className="space-y-2">
              <label className="text-lg font-bold text-black tracking-wide ml-1 flex items-center gap-2">
                Bank Statement <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 ml-1 mb-1">Upload last 5 months statement</p>
              <input
                type="file"
                id="bankStatement"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, setBankStatement, setBankFileName)}
                required
                disabled={loading || isPending}
                className="hidden"
              />
              <label htmlFor="bankStatement" className={`block h-16 ${loading || isPending ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <div className="w-full h-full px-6 bg-gray-50 border-gray-100 border-2 border-dashed rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all">
                  {bankFileName ? (
                    <div className="flex items-center gap-3 w-full">
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                      <span className="text-gray-900 font-medium truncate">{bankFileName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-400">
                      <Upload className="w-6 h-6" />
                      <span className="font-medium text-lg">Upload Bank Statement</span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Residence Doc Upload */}
            <div className="space-y-2">
              <label className="text-lg font-bold text-black tracking-wide ml-1">
                Rent Agreement <span className="text-gray-400 text-sm font-normal ml-1">(Optional)</span>
              </label>
              <input
                type="file"
                id="residenceDoc"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, setResidenceDoc, setResidenceFileName)}
                disabled={loading || isPending}
                className="hidden"
              />
              <label htmlFor="residenceDoc" className={`block h-16 ${loading || isPending ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <div className="w-full h-full px-6 bg-gray-50 border-gray-100 border-2 border-dashed rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all">
                  {residenceFileName ? (
                    <div className="flex items-center gap-3 w-full">
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                      <span className="text-gray-900 font-medium truncate">{residenceFileName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-400">
                      <Upload className="w-6 h-6" />
                      <span className="font-medium text-lg">Upload Rent Agreement</span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading || isPending}
                className={`w-full h-14 bg-[#124074] text-white rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all shadow-xl shadow-blue-900/20 font-semibold text-lg ${loading || isPending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#103866]'}`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Submit for Review</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </button>
              

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default VerifyDocuments;

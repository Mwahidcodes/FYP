import React, { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle, AlertCircle, Info, Lock, X, DollarSign, Package, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function VerificationFormModal({ isOpen, onClose, onSuccess }) {
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
      if (!isOpen) return;
      
      const user = localStorage.getItem('currentUser');
      if (!user) {
        setCheckingStatus(false);
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
          setCheckingStatus(false);
          onClose();
          navigate('/cash-request');
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
            setFeedback({ type: 'warning', message: 'Already in verification. Please wait for admin review.' });
          } else if (lastRequest.status === 'rejected') {
            setIsPending(false);
            setFeedback(null);
          } else {
            setIsPending(false);
            setFeedback(null);
          }
        } else {
          setIsPending(false);
          setFeedback(null);
        }
      } catch (err) {
        console.error('Error checking verification status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e, setFile, setName) => {
    const file = e.target.files[0];
    if (file) {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      
      if (!allowedExts.includes(fileExt) || (file.type && !allowedTypes.includes(file.type))) {
        setFeedback({ type: 'error', message: 'Only PDF, JPG, and PNG files are allowed.' });
        e.target.value = '';
        setFile(null);
        setName("");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'File size must be less than 10MB.' });
        e.target.value = '';
        setFile(null);
        setName("");
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
      setFeedback({ type: 'error', message: 'Please upload Affidavit and Bank Statement.' });
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
          reason: 'N/A', // Deprecated
          status: 'pending'
        }]);

      if (dbError) throw dbError;

      setFeedback({ type: 'success', message: 'Verification request submitted! Admin will review within 24-48 hours.' });
      setLoading(false);
      
      // Auto close after success
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);

    } catch (error) {
      setLoading(false);
      let errMsg = error.message;
      if (errMsg.includes('Failed to fetch')) {
        errMsg = 'Check your internet connection and try again.';
      }
      setFeedback({ type: 'error', message: 'Error submitting verification: ' + errMsg });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Document Verification</h2>
            <p className="text-sm text-gray-500 mt-1">Upload required documents to verify your identity.</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto no-scrollbar">
          {feedback && (
            <div
              className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
                feedback.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : feedback.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : feedback.type === 'warning' ? (
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <span className="font-medium text-sm">{feedback.message}</span>
            </div>
          )}

          <form id="verification-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Affidavit Upload */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                Upload Affidavit <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="modal-affidavit"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, setAffidavit, setFileName)}
                required
                disabled={loading || feedback?.type === 'success' || isPending || checkingStatus}
                className="hidden"
              />
              <label htmlFor="modal-affidavit" className={`block h-14 ${isPending || checkingStatus ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <div className="border border-gray-300 rounded-lg text-center hover:border-primary-400 hover:bg-gray-50 transition-all h-full flex items-center justify-center bg-white shadow-sm">
                  {fileName ? (
                    <div className="flex items-center justify-center space-x-3 px-4 w-full">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-gray-700 truncate">{fileName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-primary-600 transition-colors">
                      <Upload className="w-5 h-5" />
                      <span className="text-sm font-medium">Click to upload Affidavit</span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Bank Statement Upload */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                Bank Statement (last 5 months) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="modal-bankStatement"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, setBankStatement, setBankFileName)}
                required
                disabled={loading || feedback?.type === 'success' || isPending || checkingStatus}
                className="hidden"
              />
              <label htmlFor="modal-bankStatement" className={`block h-14 ${isPending || checkingStatus ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <div className="border border-gray-300 rounded-lg text-center hover:border-primary-400 hover:bg-gray-50 transition-all h-full flex items-center justify-center bg-white shadow-sm">
                  {bankFileName ? (
                    <div className="flex items-center justify-center space-x-3 px-4 w-full">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-gray-700 truncate">{bankFileName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-primary-600 transition-colors">
                      <Upload className="w-5 h-5" />
                      <span className="text-sm font-medium">Click to upload Bank Statement</span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Residence Doc Upload */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                Rent Agreement <span className="text-gray-400 text-xs font-normal">(In case of rented house)</span>
              </label>
              <input
                type="file"
                id="modal-residenceDoc"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e, setResidenceDoc, setResidenceFileName)}
                disabled={loading || feedback?.type === 'success' || isPending || checkingStatus}
                className="hidden"
              />
              <label htmlFor="modal-residenceDoc" className={`block h-14 ${isPending || checkingStatus ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <div className="border border-gray-300 rounded-lg text-center hover:border-primary-400 hover:bg-gray-50 transition-all h-full flex items-center justify-center bg-white shadow-sm">
                  {residenceFileName ? (
                    <div className="flex items-center justify-center space-x-3 px-4 w-full">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-gray-700 truncate">{residenceFileName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-primary-600 transition-colors">
                      <Upload className="w-5 h-5" />
                      <span className="text-sm font-medium">Click to upload Rent Agreement</span>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-center bg-gray-50/50">
          <button
            type="submit"
            form="verification-form"
            className={`btn-primary px-12 py-2.5 mx-auto flex items-center justify-center gap-2 ${loading || !affidavit || !bankStatement || isPending || checkingStatus ? 'opacity-50 cursor-not-allowed' : ''} ${feedback?.type === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            disabled={loading || feedback?.type === 'success' || !affidavit || !bankStatement || isPending || checkingStatus}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : feedback?.type === 'success' ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Submitted
              </span>
            ) : (
              'Submit for Review'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Upload, CheckCircle, AlertCircle, MessageCircle, Landmark, User, CreditCard, Phone, ArrowRight, Smartphone, RefreshCw } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";
import CustomDropdown from "../components/CustomDropdown";

function CashRequestForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    description: "",
    paymentMethod: "bank",
    bankName: "",
    accountName: "",
    accountNumber: "",
    phoneNumber: "",
  });
  const [proof, setProof] = useState(null);
  const [proofName, setProofName] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = React.useState(null);
  const [hasPending, setHasPending] = React.useState(false);

  React.useEffect(() => {
    checkExistingPending();
  }, []);

  const checkExistingPending = async () => {
    try {
      const user = localStorage.getItem("currentUser");
      if (!user) {
        navigate("/");
        return;
      }
      const userData = JSON.parse(user);

      if (!userData.is_verified && userData.role !== 'admin') {
        navigate("/request-donation");
        return;
      }

      const { data, error } = await supabase
        .from("cash_requests")
        .select("id")
        .eq("user_id", userData.id)
        .eq("status", "pending")
        .limit(1);

      if (data && data.length > 0) {
        setHasPending(true);
        setFeedback({ type: "warning", message: "Your request is already in pending." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ["Medical Assistance", "Education Fees", "Utility Bills", "Marriage", "Debt Relief", "Other"];

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validation for Phone Number (only numbers, max 11)
    if (name === "phoneNumber") {
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length > 11) return;
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    // Validation for Account Number (only numbers, max 14)
    if (name === "accountNumber") {
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length > 14) return;
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    // Validation for Bank Name (no numbers)
    if (name === "bankName") {
      const cleaned = value.replace(/[0-9]/g, "");
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    // Validation for Account Title (no numbers)
    if (name === "accountName") {
      const cleaned = value.replace(/[0-9]/g, "");
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      
      if (!allowedExts.includes(fileExt) || (file.type && !allowedTypes.includes(file.type))) {
        setFeedback({ type: "error", message: "Only PDF, JPG, and PNG files are allowed." });
        e.target.value = ''; 
        setProof(null);
        setProofName("");
        return;
      }
      setProof(file);
      setProofName(file.name);
      setFeedback(null);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category || !formData.description) {
      setFeedback({ type: "error", message: "Please fill all required fields." });
      return;
    }

    if (parseFloat(formData.amount) > 50000) {
      setFeedback({ type: "error", message: "Request limit is 50000" });
      return;
    }

    if (!proof) {
      setFeedback({ type: "error", message: "Please upload document (Supporting Proof)." });
      return;
    }

    if (proof) {
      const fileExt = proof.name.split('.').pop().toLowerCase();
      const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
      if (!allowedExts.includes(fileExt)) {
        setFeedback({ type: "error", message: "Invalid file type. Only PDF, JPG, and PNG are allowed." });
        return;
      }
    }

    setFeedback(null);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setFeedback(null);

    try {
      const user = localStorage.getItem("currentUser");
      if (!user) throw new Error("Please login first.");
      const userData = JSON.parse(user);

      if (!userData.is_verified && userData.role !== 'admin') {
        throw new Error("Your account must be verified to request cash assistance.");
      }

      // Final validation checks
      if (formData.paymentMethod === "mobile") {
        if (!formData.phoneNumber.startsWith("03")) {
          throw new Error("Phone number must start with 03.");
        }
        if (formData.phoneNumber.length !== 11) {
          throw new Error("Phone number must be exactly 11 digits.");
        }
      } else {
        if (formData.accountNumber.length !== 14) {
          throw new Error("Account number must be exactly 14 digits.");
        }
      }

      let proofUrl = null;
      if (proof) {
        const fileExt = proof.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `requests/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("verification-documents")
          .upload(filePath, proof);

        if (uploadError) throw uploadError;
        proofUrl = filePath;
      }

      const { error } = await supabase.from("cash_requests").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.paymentMethod === "bank"
            ? `${formData.description}\n\n[BANK DETAILS]\nMethod: bank\nBank: ${formData.bankName}\nAccount Name: ${formData.accountName}\nAccount Number: ${formData.accountNumber}`
            : `${formData.description}\n\n[PAYMENT DETAILS]\nMethod: EasyPaisa\nPhone Number: ${formData.phoneNumber}`,
          proof_url: proofUrl,
          status: "pending",
        },
      ]);

      if (error) throw error;

      setFeedback({ type: "success", message: "Request submitted successfully! Admin will verify your details." });
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error) {
      let errMsg = error.message;
      if (errMsg.includes('Failed to fetch')) {
        errMsg = 'Check your internet connection and try again.';
      }
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: "Need", desc: "Define your requirements" },
    { title: "Payout", desc: "Where to send funds" },
  ];
  const mainContentRef = useRef(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step, feedback]);

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
            onClick={() => step === 1 ? navigate("/request-donation") : setStep(1)}
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
                { title: "Item Detail", desc: "Amount, Category, Reason" },
                { title: "Verification", desc: "Upload supporting evidence" },
                { title: "Payout", desc: "Where to send funds" },
                { title: "Status", desc: "Get notified of progress" }
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
                Request <span className="font-black text-[#124074]">Cash</span>
              </h1>
              <p className="text-xs text-slate-500 mt-3 font-medium max-w-md leading-relaxed">
                Provide clear details to help our donors understand your situation.
              </p>
            </header>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#124074]/20 to-transparent"></div>

              {feedback && (
                <div className={`mb-6 p-5 rounded-2xl border flex items-start gap-4 animate-slide-down ${feedback.type === "success" ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" :
                  "bg-rose-50/50 border-rose-100 text-rose-800"
                  }`}>
                  <div className={`p-2 rounded-lg ${feedback.type === "success" ? "bg-emerald-500/10" : "bg-rose-500/10"
                    }`}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  </div>
                  <span className="font-bold text-sm pt-2">{feedback.message}</span>
                </div>
              )}

              <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="space-y-6">
                {step === 1 ? (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Required Amount (PKR)</label>
                        <div className="relative group">
                          <input
                            type="number"
                            name="amount"
                            placeholder="Amount in PKR"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                            className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-600 focus:bg-white focus:border-[#124074] focus:ring-8 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-300 placeholder:font-light"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Category</label>
                        <CustomDropdown
                          options={categories.map(cat => ({ value: cat, label: cat }))}
                          value={formData.category}
                          onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                          placeholder="Select Category"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Reason for Assistance</label>
                      <textarea
                        name="description"
                        placeholder="Please explain why you need this assistance..."
                        value={formData.description}
                        onChange={handleChange}
                        rows="4"
                        required
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-600 focus:bg-white focus:border-[#124074] focus:ring-8 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-300 placeholder:font-light resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Supporting Document (Medical bill, Fee slip, etc.)</label>
                      <input
                        type="file"
                        id="proof"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="proof" className="block cursor-pointer group">
                        <div className="flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-2xl p-4 hover:bg-white hover:border-[#124074] transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                              {proofName ? <FileText className="w-5 h-5 text-[#124074]" /> : <Upload className="w-5 h-5 text-slate-300" />}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-slate-700">{proofName || "Upload Document"}</p>
                            </div>
                          </div>
                          {proofName && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        </div>
                      </label>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className="w-full md:w-max bg-[#124074] text-white rounded-2xl py-4 px-12 text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-4"
                      >
                        Next Step
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-8 animate-fade-in">
                      <div className="space-y-3">
                        <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Payout Method</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: "bank" }))}
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${formData.paymentMethod === "bank"
                              ? 'bg-[#124074]/5 border-[#124074] text-[#124074]'
                              : 'bg-slate-50/50 border-slate-100 text-slate-400 hover:bg-white hover:border-slate-200'
                              }`}
                          >
                            <CreditCard className="w-6 h-6" />
                            <span className="text-[12px] font-black uppercase tracking-widest">Bank Account</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: "mobile" }))}
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${formData.paymentMethod === "mobile"
                              ? 'bg-emerald-500/5 border-emerald-500 text-emerald-600'
                              : 'bg-slate-50/50 border-slate-100 text-slate-400 hover:bg-white hover:border-slate-200'
                              }`}
                          >
                            <Smartphone className="w-6 h-6" />
                            <span className="text-[12px] font-black uppercase tracking-widest">Mobile Wallet</span>
                          </button>
                        </div>
                      </div>

                      {formData.paymentMethod === "bank" ? (
                        <div className="grid md:grid-cols-2 gap-6 animate-slide-up">
                          <div className="space-y-3">
                            <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Bank Name</label>
                            <input
                              type="text"
                              name="bankName"
                              placeholder="e.g. Meezan Bank"
                              value={formData.bankName}
                              onChange={handleChange}
                              className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-600 outline-none focus:bg-white focus:border-[#124074] transition-all placeholder:text-slate-300 placeholder:font-light"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Account Title</label>
                            <input
                              type="text"
                              name="accountName"
                              placeholder="Full Name"
                              value={formData.accountName}
                              onChange={handleChange}
                              className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-600 outline-none focus:bg-white focus:border-[#124074] transition-all placeholder:text-slate-300 placeholder:font-light"
                            />
                          </div>
                          <div className="space-y-3 md:col-span-2">
                            <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Account Number / IBAN</label>
                            <input
                              type="text"
                              name="accountNumber"
                              placeholder="Your Account Number"
                              value={formData.accountNumber}
                              onChange={handleChange}
                              className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-600 outline-none focus:bg-white focus:border-[#124074] transition-all placeholder:text-slate-300 placeholder:font-light"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 animate-slide-up">
                          <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">EasyPaisa / JazzCash Number</label>
                          <input
                            type="tel"
                            name="phoneNumber"
                            placeholder="03xx xxxxxxx"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-600 outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-300 placeholder:font-light"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row justify-end gap-4 pt-6">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        disabled={loading}
                        className={`px-8 py-4 text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className={`w-full md:w-max bg-[#124074] text-white rounded-2xl py-4 px-12 text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Request
                            <CheckCircle className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default CashRequestForm;

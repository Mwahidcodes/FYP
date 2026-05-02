import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  DollarSign,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";
import CustomDropdown from "../components/CustomDropdown";

function CashDonationForm() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("stripe");

  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    message: "",
  });

  const [screenshot, setScreenshot] = useState(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [hasPending, setHasPending] = useState(false);
  const mainContentRef = useRef(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [step, feedback]);

  useEffect(() => {
    checkExistingPending();
  }, []);

  const checkExistingPending = async () => {
    try {
      const user = localStorage.getItem("currentUser");
      if (!user) return;

      const userData = JSON.parse(user);

      const { data } = await supabase
        .from("cash_donations")
        .select("id")
        .eq("user_id", userData.id)
        .eq("status", "pending")
        .limit(1);

      if (data && data.length > 0) {
        setHasPending(true);
        setFeedback({
          type: "warning",
          message: "Your donation is already in pending",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const categories = [
    "Medical Assistance",
    "Education Fees",
    "Utility Bills",
    "Marriage",
    "Debt Relief",
    "Other",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNextStep = async (e) => {
    e.preventDefault();

    if (hasPending) {
      setFeedback({ type: "warning", message: "Your donation is already in pending" });
      return;
    }

    if (!formData.amount || !formData.category) {
      setFeedback({
        type: "error",
        message: "Please fill in all required fields.",
      });
      return;
    }

    if (Number(formData.amount) <= 0) {
      setFeedback({
        type: "error",
        message: "Please enter a valid donation amount.",
      });
      return;
    }

    if (paymentMethod === "stripe" && Number(formData.amount) < 150) {
      setFeedback({
        type: "error",
        message: "Stripe requires a minimum donation of PKR 150 (approx $0.50).",
      });
      return;
    }

    if (Number(formData.amount) > 50000) {
      setFeedback({
        type: "error",
        message: "Donation limit is 50000.",
      });
      return;
    }

    setFeedback(null);

    if (paymentMethod === "bank_transfer") {
      setStep(2);
      return;
    }

    await handleStripeRedirect();
  };

  const handleStripeRedirect = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const user = localStorage.getItem("currentUser");
      if (!user) throw new Error("Please login first.");
      const userData = JSON.parse(user);

      // Create a pending donation record first
      const { data, error } = await supabase
        .from("cash_donations")
        .insert([
          {
            user_id: userData.id,
            user_name: userData.name,
            user_email: userData.email,
            amount: parseFloat(formData.amount),
            category: formData.category,
            message: formData.message,
            screenshot_url: null,
            status: "waiting_payment",
            payment_gateway: "stripe"
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      setFeedback({ type: "success", message: "Redirecting to Stripe secure checkout..." });

      const API_URL = "http://127.0.0.1:5001";
      const response = await fetch(`${API_URL}/api/create-stripe-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: formData.amount,
          donationId: data.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not initialize Stripe session.");
      }

      // Redirect to Official Stripe Checkout
      setTimeout(() => {
        window.location.href = result.url;
      }, 1500);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      setLoading(false);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasPending) {
      setFeedback({ type: "warning", message: "Your donation is already in pending" });
      return;
    }

    if (loading) return;

    setLoading(true);
    setFeedback(null);

    try {
      const user = localStorage.getItem("currentUser");
      if (!user) throw new Error("Please login first.");

      const userData = JSON.parse(user);

      let screenshotUrl = null;

      if (!screenshot) {
        setFeedback({ type: "error", message: "Please upload payment proof." });
        setLoading(false);
        return;
      }

      if (screenshot) {
        const fileExt = screenshot.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `donations/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("verification-documents")
          .upload(filePath, screenshot);

        if (uploadError) throw uploadError;

        screenshotUrl = filePath;
      }

      const { error } = await supabase.from("cash_donations").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          amount: parseFloat(formData.amount),
          category: formData.category,
          message: formData.message,
          screenshot_url: screenshotUrl,
          status: "pending",
        },
      ]);

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Donation submitted successfully! We will verify it soon.",
      });

      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white text-slate-900 flex flex-col font-poppins overflow-hidden">
      <AuthenticatedNavbar />

      <div className="flex flex-1 relative overflow-hidden bg-slate-50/50 pt-20">
        {/* Left Panel: Process Sidebar */}
        <aside className="hidden md:flex w-72 bg-white/40 backdrop-blur-2xl border-r border-slate-100/50 pt-6 px-6 pb-8 flex flex-col shrink-0 relative z-20 shadow-[20px_0_40px_rgba(0,0,0,0.01)]">
          <button
            onClick={() => (step === 1 ? navigate("/donate") : setStep(1))}
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
                { title: "Item Detail", desc: "Amount, Category, Message" },
                { title: "Method", desc: "Bank or Stripe." },
                { title: "Verification", desc: "Upload proof if bank." },
                { title: "Admin Approval", desc: "Wait for Admin review." }
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
          className="flex-1 relative flex flex-col pt-6 pb-8 px-8 lg:px-16 overflow-y-auto overflow-x-hidden bg-transparent"
        >
          <div className="max-w-3xl w-full mx-auto relative z-10">
            <header className="mb-6 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-[#124074]">
                {step === 1 ? (
                  <>Donate <span className="font-black">Cash</span></>
                ) : (
                  <><span className="font-black">Bank</span> Details</>
                )}
              </h1>
              <p className="text-xs text-slate-500 mt-3 font-medium max-w-md leading-relaxed">
                {step === 1
                  ? "Your contribution directly funds essential services for those in need."
                  : "Follow the steps below to complete your secure bank transfer."}
              </p>
            </header>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#124074]/20 to-transparent"></div>

              {feedback && (
                <div
                  className={`mb-10 p-5 rounded-2xl border flex items-start gap-4 animate-slide-down ${feedback.type === "success"
                    ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                    : feedback.type === "warning"
                      ? "bg-amber-50/50 border-amber-100 text-amber-800"
                      : "bg-rose-50/50 border-rose-100 text-rose-800"
                    }`}
                >
                  <div className={`p-2 rounded-lg ${feedback.type === "success" ? "bg-emerald-500/10" :
                    feedback.type === "warning" ? "bg-amber-500/10" : "bg-rose-500/10"
                    }`}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  </div>
                  <span className="font-bold text-sm pt-2">
                    {feedback.message}
                  </span>
                </div>
              )}

              <form
                onSubmit={step === 1 ? handleNextStep : handleSubmit}
                className={`space-y-10 ${hasPending ? "opacity-50 pointer-events-none select-none" : ""
                  }`}
              >
                {step === 1 ? (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">
                          Donation Amount (PKR)
                        </label>
                        <div className="relative group">
                          <input
                            type="number"
                            name="amount"
                            placeholder="Enter amount"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                            min="1"
                            className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-600 focus:bg-white focus:border-[#124074] focus:ring-8 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-300 placeholder:font-light"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">
                          Category
                        </label>
                        <CustomDropdown
                          options={categories.map((cat) => ({
                            value: cat,
                            label: cat,
                          }))}
                          value={formData.category}
                          onChange={(val) =>
                            setFormData((prev) => ({
                              ...prev,
                              category: val,
                            }))
                          }
                          placeholder="Select Category"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">
                        Message (Optional)
                      </label>
                      <textarea
                        name="message"
                        placeholder="Leave a message of support..."
                        value={formData.message}
                        onChange={handleChange}
                        rows="4"
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-600 focus:bg-white focus:border-[#124074] focus:ring-8 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-300 placeholder:font-light resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("stripe")}
                          className={`p-5 rounded-2xl border text-left transition-all ${paymentMethod === "stripe"
                              ? "border-[#124074] bg-[#124074]/5 ring-4 ring-[#124074]/5"
                              : "border-slate-100 bg-slate-50/50"
                            }`}
                        >
                          <p className="text-sm font-bold text-slate-900">Credit / Debit Card</p>
                          <p className="text-xs font-medium text-slate-400 mt-1">Pay securely via Stripe gateway.</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod("bank_transfer")}
                          className={`p-5 rounded-2xl border text-left transition-all ${paymentMethod === "bank_transfer"
                              ? "border-[#124074] bg-[#124074]/5 ring-4 ring-[#124074]/5"
                              : "border-slate-100 bg-slate-50/50"
                            }`}
                        >
                          <p className="text-sm font-bold text-slate-900">Bank Transfer</p>
                          <p className="text-xs font-medium text-slate-400 mt-1">Manual transfer & upload receipt.</p>
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className={`w-full md:w-max bg-[#124074] text-white rounded-2xl py-4 px-12 text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 ${loading ? "opacity-70 pointer-events-none" : ""
                          }`}
                        disabled={loading}
                      >
                        {loading ? "Processing..." : (
                          <>
                            {paymentMethod === "stripe" ? "Pay Now" : "Continue"}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-[#124074]/5 rounded-3xl p-8 border border-[#124074]/10">
                      <h3 className="text-xs font-black uppercase tracking-widest text-[#124074] mb-6">Bank Account Details</h3>
                      <div className="space-y-4">
                        {[
                          { label: "Bank", value: "Meezan Bank" },
                          { label: "Title", value: "Share For Good" },
                          { label: "Account", value: "01234567890123" },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center border-b border-[#124074]/5 pb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                            <span className="text-sm font-bold text-slate-900">{item.value}</span>
                          </div>
                        ))}
                        <div className="pt-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">IBAN</span>
                          <div className="bg-white/50 p-3 rounded-xl border border-[#124074]/5 text-[11px] font-bold text-[#124074] break-all">
                            PK12MEZN0001234567890123
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">
                        Upload Payment Proof
                      </label>
                      <input
                        type="file"
                        id="screenshot"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setScreenshot(file);
                            setScreenshotName(file.name);
                          }
                        }}
                        className="hidden"
                      />
                      <label htmlFor="screenshot" className="block cursor-pointer group">
                        <div className="flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-2xl p-4 hover:bg-white hover:border-[#124074] transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                              {screenshotName ? <FileText className="w-5 h-5 text-[#124074]" /> : <Upload className="w-5 h-5 text-slate-300" />}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-slate-700">{screenshotName || "Upload Proof"}</p>
                              <p className="text-[10px] font-medium text-slate-400">JPG, PNG (Max 10MB)</p>
                            </div>
                          </div>
                          {screenshotName ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ArrowRight className="w-5 h-5 text-slate-200 group-hover:text-[#124074] group-hover:translate-x-1 transition-all" />
                          )}
                        </div>
                      </label>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className={`w-full md:w-max bg-[#124074] text-white rounded-2xl py-4 px-12 text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 ${loading ? "opacity-70 pointer-events-none" : ""
                          }`}
                        disabled={loading}
                      >
                        {loading ? "Submitting..." : (
                          <>
                            Submit Donation
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

export default CashDonationForm;
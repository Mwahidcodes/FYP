import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Package, ArrowLeft, Image as ImageIcon, Upload, FileText, CheckCircle, AlertCircle, Info, Tag, ArrowRight, RefreshCw } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";
import CustomDropdown from "../components/CustomDropdown";

function ProductDonationForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    productName: "",
    category: "",
    description: "",
  });
  const [image, setImage] = useState(null);
  const [imageName, setImageName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVerifyingImage, setIsVerifyingImage] = useState(false);
  const [isImageVerified, setIsImageVerified] = useState(false);
  const [feedback, setFeedback] = React.useState(null);
  const [hasPending, setHasPending] = React.useState(false);

  React.useEffect(() => {
    checkExistingPending();
  }, []);

  const checkExistingPending = async () => {
    try {
      const user = localStorage.getItem("currentUser");
      if (!user) return;
      const userData = JSON.parse(user);

      const { data, error } = await supabase
        .from("product_donations")
        .select("id")
        .eq("user_id", userData.id)
        .eq("status", "pending")
        .limit(1);

      if (data && data.length > 0) {
        setHasPending(true);
        setFeedback({ type: "warning", message: "Your donation is already in pending." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ["Electronics", "Clothes", "Furniture", "Toys", "Educational Material", "Other"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const allowedExts = ['jpg', 'jpeg', 'png'];
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      
      if (!allowedExts.includes(fileExt) || (file.type && !allowedTypes.includes(file.type))) {
        setFeedback({ type: "error", message: "Only JPG and PNG files are allowed." });
        e.target.value = ''; 
        setImage(null);
        setImageName("");
        return;
      }
      setImage(file);
      setImageName(file.name);
      setFeedback(null);
      
      // Reset verification state when image changes
      setIsImageVerified(false);
      setIsVerifyingImage(false);
    }
  };

  const handleModerateImage = async (file) => {
    // This is now called within handleSubmit logic
    return await moderateImage(file);
  };

  const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
};

const moderateImage = async (file) => {
  try {
    const base64Image = await fileToBase64(file);

    const response = await fetch("/api/verify-product", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64: base64Image,
      }),
    });

    const result = await response.json();

    return result;
  } catch (error) {
    console.error("Moderation Crash:", error);
    return { safe: false, reason: "Moderation service unreachable" };
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setFeedback(null);

    if (!formData.category) {
      setFeedback({ type: "error", message: "Please select a category." });
      setLoading(false);
      return;
    }

    try {
      const user = localStorage.getItem("currentUser");
      if (!user) throw new Error("Please login first.");
      const userData = JSON.parse(user);

      let imageUrl = null;
      if (!image) {
        setFeedback({ type: "error", message: "Please upload proof (Product Photo)." });
        setLoading(false);
        return;
      }
      
      // AI Verification Step
      if (image && !isImageVerified) {
        setIsVerifyingImage(true);
        setFeedback({ type: "info", message: "AI is verifying your product image security..." });
        
        const moderation = await moderateImage(image);
        setIsVerifyingImage(false);
        
        if (!moderation.safe) {
          setIsImageVerified(false);
          setFeedback({ type: "error", message: moderation.reason });
          setLoading(false);
          return;
        }
        
        setIsImageVerified(true);
        setFeedback({ type: "info", message: "Verification successful! Finalizing your donation..." });
        // CONTINUE AUTOMATICALLY TO SUBMISSION LOGIC
      }

      // 3. Actual Submission (Supabase call)
      const fileExt = image.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, image);

      if (uploadError) throw uploadError;
      imageUrl = filePath;

      const { error } = await supabase.from("product_donations").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          product_name: formData.productName,
          category: formData.category,
          description: formData.description,
          image_url: imageUrl,
          status: "pending",
        },
      ]);

      if (error) throw error;

      setHasPending(true);
      setFeedback({ type: "success", message: "Product donation submitted successfully! Admin will review it soon." });
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
  const mainContentRef = useRef(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [feedback]);

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
            onClick={() => navigate("/donate")}
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
                { title: "Item Detail", desc: "Name, Category" },
                { title: "Condition", desc: "State the current quality." },
                { title: "Visuals", desc: "Upload clear product photos." },
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
          className="flex-1 relative flex flex-col pt-6 pb-8 px-8 lg:px-16 overflow-y-auto overflow-x-hidden no-scrollbar bg-transparent"
        >

          <div className="max-w-3xl w-full mx-auto relative z-10">
            <header className="mb-6 animate-fade-in">

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-[#124074]">
                Donate <span className="font-black text-[#124074]">Product</span>
              </h1>
              <p className="text-xs text-slate-500 mt-3 font-medium max-w-md leading-relaxed">
                Your surplus can be someone else's necessity. Fill in the details to start your giving journey.
              </p>
            </header>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#124074]/20 to-transparent"></div>

              {feedback && (
                <div className={`mb-10 p-5 rounded-2xl border flex items-start gap-4 animate-slide-down ${feedback.type === "success" ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" :
                  feedback.type === "warning" ? "bg-amber-50/50 border-amber-100 text-amber-800" :
                  feedback.type === "info" ? "bg-blue-50/50 border-blue-100 text-blue-800" :
                    "bg-rose-50/50 border-rose-100 text-rose-800"
                  }`}>
                  <div className={`p-2 rounded-lg ${feedback.type === "success" ? "bg-emerald-500/10" :
                    feedback.type === "warning" ? "bg-amber-500/10" : 
                    feedback.type === "info" ? "bg-blue-500/10" : "bg-rose-500/10"
                    }`}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  </div>
                  <span className="font-bold text-sm pt-2">{feedback.message}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className={`space-y-10 ${hasPending ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Product Name</label>
                    <div className="relative group">
                      <Tag className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#124074] transition-all" />
                      <input
                        type="text"
                        name="productName"
                        placeholder="What are you donating?"
                        value={formData.productName}
                        onChange={handleChange}
                        required
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-semibold text-slate-600 focus:bg-white focus:border-[#124074] focus:ring-8 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-300 placeholder:font-light"
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
                  <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Description & Condition</label>
                  <textarea
                    name="description"
                    placeholder="Describe the item's condition and any other details..."
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    required
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-600 focus:bg-white focus:border-[#124074] focus:ring-8 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-300 placeholder:font-light resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[12px] font-bold font-jakarta uppercase tracking-wider text-[#124074] ml-2">Upload Product Photo</label>
                  <input
                    type="file"
                    id="image"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label htmlFor="image" className="block cursor-pointer group">
                    <div className="flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-2xl p-4 hover:bg-white hover:border-[#124074] transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                          {isVerifyingImage ? (
                            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                          ) : isImageVerified ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : imageName ? (
                            <FileText className="w-5 h-5 text-[#124074]" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-700">
                            {isVerifyingImage ? "Verifying with AI..." : imageName || "Upload Image"}
                          </p>
                        </div>
                      </div>
                      {isVerifyingImage ? (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : isImageVerified ? (
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
                    className={`w-full md:w-max bg-[#124074] text-white rounded-2xl py-4 px-12 text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 ${loading || isVerifyingImage || hasPending ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                    disabled={loading || isVerifyingImage || hasPending}
                  >
                    {hasPending ? (
                      <span className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4" />
                        Already Submitted
                      </span>
                    ) : loading ? (
                      <span className="flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting...
                      </span>
                    ) : isVerifyingImage ? (
                      <span className="flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        AI Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        Submit Donation
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProductDonationForm;

import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";

function DonationForm() {
  const navigate = useNavigate();

  const handleTypeSelect = (type) => {
    if (type === "cash") {
      navigate("/cash-donation");
    } else if (type === "product") {
      navigate("/product-donation");
    }
  };

  const processSteps = [
    { title: "Select Type", desc: "Select the mode of donation" },
    { title: "Fill Form", desc: "Fill the donation form" },
    { title: "Under Review", desc: "Submit for administrative verification" },
    { title: "Get Notified", desc: "Get notified once the process is complete" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-outfit">
      <AuthenticatedNavbar />

      <div className="flex flex-1 relative pt-20">
        {/* Left Panel: How It Works */}
        <aside className="w-72 bg-slate-50 border-r border-slate-200 p-8 flex flex-col animate-fade-in shrink-0 overflow-y-auto">
          <div className="mb-10">
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 leading-none">How It <span className="text-slate-300">Works</span></h2>
          </div>

          <div className="space-y-8">
            {processSteps.map((step, index) => (
              <div key={index} className="flex gap-6">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 transition-all duration-500 shadow-sm text-lg">
                    {index + 1}
                  </div>
                  {index < processSteps.length - 1 && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[1px] h-8 bg-gradient-to-b from-slate-200 to-transparent"></div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 transition-colors">{step.title}</h4>
                  <p className="text-[13px] text-slate-400 font-medium leading-relaxed mt-2 transition-colors max-w-[200px]">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Panel: Options */}
        <main className="flex-1 relative flex flex-col pt-6 md:pt-10 p-10 md:p-14 overflow-y-auto bg-slate-50/30">
          <div className="relative z-10 w-full max-w-6xl animate-slide-up text-left">
            <h1 className="text-4xl md:text-5xl font-medium mb-8 tracking-tighter leading-[1.1] text-[#124074]">
              Donation <br />
              <span className="text-[#124074] font-black">Hub</span>
            </h1>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Cash Donation Card */}
              <div
                onClick={() => handleTypeSelect("cash")}
                className="group relative bg-[#124074] rounded-3xl p-7 transition-all duration-700 hover:scale-[1.03] hover:-translate-y-4 cursor-pointer text-left shadow-[0_20px_40px_rgba(18,64,116,0.2)] hover:shadow-[0_40px_80px_rgba(18,64,116,0.3)]"
              >
                <h3 className="text-3xl font-bold mb-4 tracking-tight text-white">Donate Cash</h3>
                <p className="text-base text-white/80 font-medium leading-relaxed tracking-tight mb-8">
                  Contribute funds for medical bills, scholarships, or community projects.
                </p>
                <div className="flex items-center gap-3 text-lg font-black uppercase tracking-[0.2em] text-white transition-colors">
                  <span>Donate Cash</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>

              {/* Product Donation Card */}
              <div
                onClick={() => handleTypeSelect("product")}
                className="group relative bg-[#124074] rounded-3xl p-7 transition-all duration-700 hover:scale-[1.03] hover:-translate-y-4 cursor-pointer text-left shadow-[0_20px_40px_rgba(18,64,116,0.2)] hover:shadow-[0_40px_80px_rgba(18,64,116,0.3)]"
              >
                <h3 className="text-3xl font-bold mb-4 tracking-tight text-white">Donate Product</h3>
                <p className="text-base text-white/80 font-medium leading-relaxed tracking-tight mb-8">
                  Share surplus items. We ensure they reach those in need.
                </p>
                <div className="flex items-center gap-3 text-lg font-black uppercase tracking-[0.2em] text-white transition-colors">
                  <span>Donate Product</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DonationForm;

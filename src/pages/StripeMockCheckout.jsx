import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, ArrowLeft, CreditCard, ShieldCheck, CheckCircle2 } from "lucide-react";

function StripeMockCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: ""
  });

  // Get amount and donationId from state (passed from form)
  const { amount, donationId, email } = location.state || { amount: "0", donationId: "0", email: "user@example.com" };

  const handlePay = (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate bank processing
    setTimeout(() => {
      setLoading(false);
      setCompleted(true);
      
      // After showing success for 1.5s, redirect to success page
      setTimeout(() => {
        navigate(`/stripe-success/${donationId}`);
      }, 1500);
    }, 3000);
  };

  const handleCardChange = (e) => {
    let { name, value } = e.target;
    if (name === "number") {
      value = value.replace(/\D/g, '').substring(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
    } else if (name === "expiry") {
      value = value.replace(/\D/g, '').substring(0, 4).replace(/(\d{2})(?=\d)/g, '$1 / ');
    } else if (name === "cvc") {
      value = value.replace(/\D/g, '').substring(0, 3);
    }
    setCardData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col md:flex-row font-sans text-[#32325d]">
      {/* Left Side: Order Summary */}
      <div className="w-full md:w-[45%] p-8 md:p-16 flex flex-col justify-center">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#697386] hover:text-[#32325d] transition-colors mb-12 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Share For Good
        </button>

        <div className="mb-8">
          <p className="text-[#697386] font-semibold uppercase tracking-wider text-sm mb-2">Donate to Share For Good</p>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1a1f36]">PKR {parseFloat(amount).toLocaleString()}.00</h1>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center">
              <span className="text-xl font-bold text-[#635bff]">S</span>
            </div>
            <div>
              <p className="font-bold text-[#1a1f36]">Donation Contribution</p>
              <p className="text-sm text-[#697386]">One-time payment</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-12 text-[#697386] text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Powered by <span className="font-bold text-[#32325d]">Stripe</span>
        </div>
      </div>

      {/* Right Side: Payment Form */}
      <div className="w-full md:w-[55%] bg-white p-8 md:p-16 shadow-[-20px_0_40px_rgba(0,0,0,0.02)] flex items-center justify-center">
        <div className="max-w-md w-full">
          {completed ? (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-[#635bff] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Confirmed</h2>
              <p className="text-[#697386]">Redirecting you back to the app...</p>
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold mb-6">Pay with card</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[#4f566b]">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    disabled
                    className="w-full px-4 py-3 rounded-lg border border-[#e3e8ee] focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/10 outline-none transition-all bg-[#f7fafc]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-[#4f566b]">Card information</label>
                  <div className="border border-[#e3e8ee] rounded-lg overflow-hidden focus-within:border-[#635bff] focus-within:ring-2 focus-within:ring-[#635bff]/10 transition-all">
                    <div className="relative">
                      <input 
                        name="number"
                        placeholder="1234 5678 9123 4567"
                        required
                        value={cardData.number}
                        onChange={handleCardChange}
                        className="w-full px-4 py-3 outline-none"
                      />
                      <CreditCard className="absolute right-4 top-3.5 w-5 h-5 text-[#a3acb9]" />
                    </div>
                    <div className="flex border-t border-[#e3e8ee]">
                      <input 
                        name="expiry"
                        placeholder="MM / YY"
                        required
                        value={cardData.expiry}
                        onChange={handleCardChange}
                        className="w-1/2 px-4 py-3 outline-none border-r border-[#e3e8ee]"
                      />
                      <input 
                        name="cvc"
                        placeholder="CVC"
                        required
                        value={cardData.cvc}
                        onChange={handleCardChange}
                        className="w-1/2 px-4 py-3 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-[#4f566b]">Name on card</label>
                  <input 
                    name="name"
                    placeholder="Jane Doe"
                    required
                    value={cardData.name}
                    onChange={handleCardChange}
                    className="w-full px-4 py-3 rounded-lg border border-[#e3e8ee] focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/10 outline-none transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#635bff] text-white py-3.5 rounded-lg font-bold shadow-lg shadow-[#635bff]/20 hover:bg-[#5851ed] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Pay PKR {parseFloat(amount).toLocaleString()}.00
                  </>
                )}
              </button>

              <p className="text-center text-[#697386] text-xs">
                By confirming your payment, you allow Share For Good to charge your card for this donation in accordance with their terms.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default StripeMockCheckout;

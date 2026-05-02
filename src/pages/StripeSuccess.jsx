import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle, ArrowRight, Heart, Download } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";

function StripeSuccess() {
  const navigate = useNavigate();
  const { donationId } = useParams();
  const [loading, setLoading] = useState(true);
  const [donation, setDonation] = useState(null);

  useEffect(() => {
    const updateDonationStatus = async () => {
      try {
        if (!donationId || donationId === "0") return;

        const { data, error } = await supabase
          .from("cash_donations")
          .update({ 
            status: "pending",
            payment_gateway: "stripe"
          })
          .eq("id", donationId)
          .select()
          .single();

        if (error) throw error;
        setDonation(data);

        // Create notification for Admin
        try {
          // Find all admin users
          const { data: admins } = await supabase
            .from("users")
            .select("id")
            .eq("role", "admin");

          if (admins && admins.length > 0) {
            const notifications = admins.map(admin => ({
              user_id: admin.id,
              type: "stripe_donation_received",
              title: "New Stripe Donation",
              message: `A new donation of PKR ${data.amount} has been received via Stripe from ${data.user_name}.`,
              is_read: false
            }));

            await supabase.from("notifications").insert(notifications);
          }
        } catch (notifErr) {
          console.error("Error creating admin notification:", notifErr);
        }
      } catch (err) {
        console.error("Error updating donation:", err);
      } finally {
        setLoading(false);
      }
    };

    updateDonationStatus();
  }, [donationId]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-outfit flex items-center justify-center p-6">
      <main className="w-full max-w-md">
        <div className="bg-white rounded-[2rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-slate-900 mb-2">Donation Received!</h1>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Your contribution has been processed successfully via 
              <span className="text-[#635bff] font-bold mx-1">Stripe</span>. 
              Thank you for making an impact.
            </p>

            <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
              <div className="flex justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</span>
                <span className="text-xs font-bold text-slate-900">PKR {donation?.amount || "..."}</span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</span>
                <span className="text-xs font-bold text-emerald-600">CONFIRMED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gateway</span>
                <span className="text-xs font-bold text-[#635bff]">Stripe Official</span>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full bg-[#124074] text-white rounded-2xl py-4 px-8 text-sm font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => window.print()}
                className="w-full bg-white text-slate-600 border border-slate-200 rounded-2xl py-4 px-8 text-sm font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                Print Receipt
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StripeSuccess;

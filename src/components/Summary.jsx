import React from 'react';
import { ShieldCheck, DollarSign, HandHeart, Gift, ShoppingBag, Gavel } from 'lucide-react';

function Summary({
  verifications,
  verificationCounts,
  cashRequests,
  cashDonations,
  productDonations,
  productRequests,
  biddingProducts
}) {
  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-card-header">
          <h3>Verifications</h3>
        </div>
        <p className="stat-number">{verificationCounts?.total || 0}</p>
        <div className="stat-breakdown">
          <div className="stat-breakdown-item">
            <span className="stat-label">Pending</span>
            <span className="stat-value pending">{verificationCounts?.pending || 0}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Approved</span>
            <span className="stat-value approved">{verificationCounts?.approved || 0}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Rejected</span>
            <span className="stat-value rejected">{verificationCounts?.rejected || 0}</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <h3>Cash Requests</h3>
        </div>
        <p className="stat-number">{cashRequests.length}</p>
        <div className="stat-breakdown">
          <div className="stat-breakdown-item">
            <span className="stat-label">Pending</span>
            <span className="stat-value pending">{cashRequests.filter((r) => r.status === "pending").length}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Approved</span>
            <span className="stat-value approved">{cashRequests.filter((r) => r.status === "approved").length}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Rejected</span>
            <span className="stat-value rejected">{cashRequests.filter((r) => r.status === "rejected").length}</span>
          </div>
        </div>
        <div className="stat-amount-container">
          <span className="stat-amount-label">Total Approved</span>
          <p className="stat-amount-value">
            PKR {cashRequests
              .filter((r) => r.status === "approved")
              .reduce((sum, r) => sum + Number(r.amount), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <h3>Cash Donations</h3>
        </div>
        <p className="stat-number">{cashDonations.length}</p>
        <div className="stat-breakdown">
          <div className="stat-breakdown-item">
            <span className="stat-label">Pending</span>
            <span className="stat-value pending">{cashDonations.filter((d) => d.status === "pending").length}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Approved</span>
            <span className="stat-value approved">{cashDonations.filter((d) => d.status === "approved").length}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Rejected</span>
            <span className="stat-value rejected">{cashDonations.filter((d) => d.status === "rejected").length}</span>
          </div>
        </div>
        <div className="stat-amount-container">
          <span className="stat-amount-label">Total Received</span>
          <p className="stat-amount-value">
            PKR {cashDonations
              .filter((d) => d.status === "approved")
              .reduce((sum, d) => sum + Number(d.amount), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <h3>Product Donations</h3>
        </div>
        <p className="stat-number">{productDonations.length}</p>
        <div className="stat-breakdown">
          <div className="stat-breakdown-item">
            <span className="stat-label">Pending</span>
            <span className="stat-value pending">{productDonations.filter((d) => d.status === "pending").length}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Approved</span>
            <span className="stat-value approved">{productDonations.filter((d) => d.status === "approved").length}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Rejected</span>
            <span className="stat-value rejected">{productDonations.filter((d) => d.status === "rejected").length}</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <h3>Product Requests</h3>
        </div>
        <p className="stat-number">{productRequests.length}</p>
        <div className="stat-breakdown">
          <div className="stat-breakdown-item">
            <span className="stat-label">Pending</span>
            <span className="stat-value pending">{productRequests.filter((r) => r.status === "pending").length}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Approved</span>
            <span className="stat-value approved">{productRequests.filter((r) => r.status === "approved").length}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Rejected</span>
            <span className="stat-value rejected">{productRequests.filter((r) => r.status === "rejected").length}</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <h3>Bidding</h3>
        </div>
        <p className="stat-number">{biddingProducts.length}</p>
        <div className="stat-breakdown">
          <div className="stat-breakdown-item">
            <span className="stat-label">Active</span>
            <span className="stat-value approved">{biddingProducts.filter((b) => b.status === "active").length}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Upcoming</span>
            <span className="stat-value pending">{biddingProducts.filter((b) => b.status === "upcoming").length}</span>
          </div>
          <div className="stat-breakdown-item">
            <span className="stat-label">Ended</span>
            <span className="stat-value rejected">{biddingProducts.filter((b) => b.status === "ended").length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Summary;

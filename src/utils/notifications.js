import { supabase } from "../supabaseClient";
import * as emailjs from "@emailjs/browser";

// Initialize EmailJS once at startup for instant delivery
if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
  emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
}

// Cache to prevent duplicate emails within a short timeframe
const recentEmails = new Set();

// Cache to prevent duplicate database notifications within a short timeframe
const recentNotifications = new Set();

/**
 * Create a notification in the database
 */
export const createNotification = async (userId, type, title, message, relatedId = null, rejectionReason = null) => {
  try {
    // Deduplication check
    const notificationKey = `${userId}-${type}-${title}-${message}-${relatedId}`;
    if (recentNotifications.has(notificationKey)) {
      console.log("Duplicate notification detected, skipping database insert...");
      return true;
    }
    recentNotifications.add(notificationKey);
    setTimeout(() => recentNotifications.delete(notificationKey), 5000);

    // Ensure user_id is BIGINT (convert string to number if needed)
    const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;
    const relatedIdNum = relatedId && (typeof relatedId === 'string' ? parseInt(relatedId) : relatedId);
    
    const notificationData = {
      user_id: userIdNum,
      type: type, // 'request_approved', 'request_rejected', 'donation_approved', 'donation_rejected', 'verification_approved', 'verification_rejected'
      title: title,
      message: message,
      related_id: relatedIdNum,
      is_read: false,
    };

    if (rejectionReason) {
      notificationData.rejection_reason = rejectionReason;
    }
    
    const { data, error } = await supabase.from("notifications").insert([notificationData]).select();

    if (error) {
      console.error("Error creating notification:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
};

/**
 * Send email notification using EmailJS
 */
export const sendEmailNotification = async (userEmail, userName, type, details) => {
  try {
    if (!process.env.REACT_APP_EMAILJS_SERVICE_ID || !process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
      console.log("EmailJS not configured, skipping email notification");
      return false;
    }

    // Create a unique key for this email attempt
    const emailKey = `${userEmail}-${type}-${details}`;
    if (recentEmails.has(emailKey)) {
      console.log("Duplicate email detected, skipping...");
      return true; // Pretend it succeeded to avoid showing errors
    }

    // Add to cache and remove after 5 seconds
    recentEmails.add(emailKey);
    setTimeout(() => recentEmails.delete(emailKey), 5000);

    const emailTemplates = {
      request_approved: {
        subject: "✅ Cash Request Approved!",
        body: `Hi ${userName},\n\nGreat news! Your cash request has been approved by the admin.\n\nDetails:\n${details}\n\nThankyou for visiting share for good!`,
      },
      request_approved_bank_details: {
        subject: "✅ Cash Request Approved!",
        body: `Hi ${userName},\n\nGreat news! Your cash request has been approved. We will now proceed with the disbursement.\n\nDetails:\n${details}\n\nThankyou for visiting share for good!`,
      },
      request_rejected: {
        subject: "❌ Cash Request Rejected",
        body: `Hi ${userName},\n\nWe regret to inform you that your cash request has been rejected.\n\n${details}\n\nIf you have any questions, please contact support.\n\nThankyou for visiting share for good!`,
      },
      donation_approved: {
        subject: "✅ Cash Donation Approved!",
        body: `Hi ${userName},\n\nThank you! Your cash donation has been approved and processed.\n\nDetails:\n${details}\n\nYour generosity makes a difference!\n\nThankyou for visiting share for good!`,
      },
      donation_rejected: {
        subject: "❌ Cash Donation Rejected",
        body: `Hi ${userName},\n\nWe regret to inform you that your cash donation has been rejected.\n\n${details}\n\nIf you have any questions, please contact support.\n\nThankyou for visiting share for good!`,
      },
      verification_approved: {
        subject: "✅ Account Verified Successfully!",
        body: `Hi ${userName},\n\nCongratulations! Your account has been verified.\n\nYou can now submit requests for donations.\n\nThankyou for visiting share for good!`,
      },
      verification_rejected: {
        subject: "❌ Verification Status Update",
        body: `Hi ${userName},\n\nWe regret to inform you that your verification request has been rejected.\n\n${details}\n\nThankyou for visiting share for good!`,
      },
      bid_won: {
        subject: "🏆 Congratulations! You won the bid!",
        body: `Hi ${userName},\n\nGreat news! You have won the bidding for a product.\n\nDetails:\n${details}\n\nPlease proceed with the next steps as mentioned in the details.\n\nThankyou for visiting share for good!`,
      },
      bid_ended: {
        subject: "📢 Bidding Period Ended",
        body: `Hi ${userName},\n\nThe bidding period for a product has ended.\n\nDetails:\n${details}\n\nThankyou for visiting share for good!`,
      },
      payment_verified: {
        subject: "💰 Payment Verified Successfully!",
        body: `Hi ${userName},\n\nYour payment has been verified. We are now preparing for delivery.\n\nDetails:\n${details}\n\nThankyou for visiting share for good!`,
      },
      delivery_arranged: {
        subject: "🚚 Delivery Is On The Way!",
        body: `Hi ${userName},\n\nGreat news! Delivery has been arranged for your product.\n\nDetails:\n${details}\n\nThankyou for visiting share for good!`,
      },
      product_request_rejected: {
        subject: "❌ Product Request Rejected",
        body: `Hi ${userName},\n\nWe regret to inform you that your product request has been rejected.\n\n${details}\n\nIf you have any questions, please contact support.\n\nThankyou for visiting share for good!`,
      },
      product_request_approved: {
        subject: "✅ Product Request Approved!",
        body: `Hi ${userName},\n\nGreat news! Your product request has been approved by the admin.\n\nDetails:\n${details}\n\nThankyou for visiting share for good!`,
      },
      product_donation_approved: {
        subject: "✅ Product Donation Approved!",
        body: `Hi ${userName},\n\nThank you! Your product donation has been approved and processed.\n\nDetails:\n${details}\n\nYour generosity makes a difference!\n\nThankyou for visiting share for good!`,
      },
      product_donation_rejected: {
        subject: "❌ Product Donation Rejected",
        body: `Hi ${userName},\n\nWe regret to inform you that your product donation has been rejected.\n\n${details}\n\nIf you have any questions, please contact support.\n\nThankyou for visiting share for good!`,
      },
    };

    const template = emailTemplates[type];
    if (!template) {
      console.error("Unknown notification type:", type);
      return false;
    }

    await emailjs.send(
      process.env.REACT_APP_EMAILJS_SERVICE_ID,
      process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
      {
        to_email: userEmail,
        to_name: userName,
        subject: template.subject,
        message: template.body,
      },
      process.env.REACT_APP_EMAILJS_PUBLIC_KEY
    );

    return true;
  } catch (error) {
    console.log("Email notification failed:", error.message);
    return false;
  }
};

/**
 * Create notification and send email
 */
export const notifyUser = async (userId, userEmail, userName, type, title, message, details, relatedId = null, rejectionReason = null) => {
  let emailDetails = details || "";
  if (rejectionReason) {
    emailDetails = emailDetails ? `${emailDetails}\n\nRejection Reason: ${rejectionReason}` : `Rejection Reason: ${rejectionReason}`;
  }
  
  // Run both in parallel to speed up the process
  await Promise.all([
    createNotification(userId, type, title, message, relatedId, rejectionReason),
    sendEmailNotification(userEmail, userName, type, emailDetails)
  ]);
};

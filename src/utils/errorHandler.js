/**
 * Utility functions for handling and formatting errors
 */

export const getErrorMessage = (error) => {
  // Network errors
  if (!navigator.onLine) {
    return "Check your internet connection and try again.";
  }

  // Supabase errors
  if (error?.code) {
    switch (error.code) {
      case "PGRST116":
        return "The requested data was not found.";
      case "23505":
        return "This record already exists. Please try again.";
      case "23503":
        return "Invalid reference. Please refresh and try again.";
      case "42501":
        return "You don't have permission to perform this action.";
      case "PGRST301":
        return "Request timeout. Please try again.";
      default:
        return error.message || "An error occurred. Please try again.";
    }
  }

  // Generic error messages
  if (error?.message) {
    // Check for common error patterns
    if (error.message.includes("timeout") || error.message.includes("Network")) {
      return "Check your internet connection and try again.";
    }
    if (error.message.includes("Failed to fetch")) {
      return "Unable to connect to the server. Please try again later.";
    }
    if (error.message.includes("JSON")) {
      return "Invalid data format. Please refresh the page.";
    }
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
};

export const isNetworkError = (error) => {
  return (
    !navigator.onLine ||
    error?.message?.includes("Failed to fetch") ||
    error?.message?.includes("Network") ||
    error?.message?.includes("timeout")
  );
};

export const shouldRetry = (error, retryCount = 0) => {
  const maxRetries = 3;
  if (retryCount >= maxRetries) return false;
  
  return (
    isNetworkError(error) ||
    error?.code === "PGRST301" || // Timeout
    error?.message?.includes("timeout")
  );
};

export const getRetryDelay = (retryCount) => {
  // Exponential backoff: 1s, 2s, 4s
  return Math.min(1000 * Math.pow(2, retryCount), 4000);
};


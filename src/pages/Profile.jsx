import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Settings, ArrowLeft, Edit, Save, X, Lock, LogOut, CheckCircle, AlertCircle, Mail, Calendar, Shield, Eye, EyeOff } from "lucide-react";
import { supabase } from "../supabaseClient";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get tab from URL query parameter
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl === 'settings' ? 'settings' : 'profile');
  
  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: "",
    email: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  // Password change state
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Update activeTab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'settings') {
      setActiveTab('settings');
    } else {
      setActiveTab('profile');
    }
  }, [location.search]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = localStorage.getItem("currentUser");
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(user);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userData.id)
        .single();

      if (error) throw error;

      setCurrentUser(data);
      setProfileFormData({
        name: data.name || "",
        email: data.email || "",
      });
    } catch (error) {
      console.error("Error loading user data:", error);
      setCurrentUser(JSON.parse(user)); // Fallback to cached data
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (profileLoading) return;

    setProfileLoading(true);
    setProfileFeedback(null);

    try {
      if (!profileFormData.name.trim()) {
        setProfileFeedback({ type: "error", message: "Name is required." });
        return;
      }

      if (!profileFormData.email.trim()) {
        setProfileFeedback({ type: "error", message: "Email is required." });
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .update({
          name: profileFormData.name.trim(),
          email: profileFormData.email.trim(),
        })
        .eq("id", currentUser.id)
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem("currentUser", JSON.stringify(data));
      setCurrentUser(data);
      setIsEditingProfile(false);
      setProfileFeedback({ type: "success", message: "Profile updated successfully!" });
    } catch (error) {
      console.error("Error updating profile:", error);
      setProfileFeedback({
        type: "error",
        message: "Error updating profile: " + (error.message || "Unknown error"),
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordLoading) return;

    setPasswordLoading(true);
    setPasswordFeedback(null);

    try {
      if (!passwordFormData.currentPassword) {
        setPasswordFeedback({ type: "error", message: "Current password is required." });
        return;
      }

      if (!passwordFormData.newPassword) {
        setPasswordFeedback({ type: "error", message: "New password is required." });
        return;
      }

      if (passwordFormData.newPassword.length < 6) {
        setPasswordFeedback({ type: "error", message: "New password must be at least 6 characters." });
        return;
      }

      if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
        setPasswordFeedback({ type: "error", message: "New passwords do not match." });
        return;
      }

      const { data: userData, error: verifyError } = await supabase
        .from("users")
        .select("password")
        .eq("id", currentUser.id)
        .single();

      if (verifyError) throw verifyError;

      if (userData.password !== passwordFormData.currentPassword) {
        setPasswordFeedback({ type: "error", message: "Current password is incorrect." });
        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: passwordFormData.newPassword,
        })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      setPasswordFeedback({ type: "success", message: "Password changed successfully!" });
      setPasswordFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);

      setTimeout(() => {
        setPasswordFeedback(null);
      }, 3000);
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordFeedback({
        type: "error",
        message: "Error changing password: " + (error.message || "Unknown error"),
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Unable to load profile. Please try again.</p>
          <button className="btn-primary" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <AuthenticatedNavbar />
      
      {/* Header */}
      <section className="py-6 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center max-w-3xl mx-auto flex-1">
              <h1 className="text-3xl font-bold font-outfit text-gray-900 mb-2">
                {activeTab === 'profile' ? 'My Profile' : 'Account Settings'}
              </h1>
              <p className="text-sm text-gray-600">
                {activeTab === 'profile' ? 'Manage your personal information' : 'Manage your account settings and preferences'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card bg-white mb-6">
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => {
                  setActiveTab("profile");
                  navigate("/profile");
                }}
                className={`flex-1 px-4 py-2 rounded-md font-semibold text-sm transition-all ${
                  activeTab === "profile"
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-gray-600 hover:text-primary-600"
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Profile
              </button>
              <button
                onClick={() => {
                  setActiveTab("settings");
                  navigate("/profile?tab=settings");
                }}
                className={`flex-1 px-4 py-2 rounded-md font-semibold text-sm transition-all ${
                  activeTab === "settings"
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-gray-600 hover:text-primary-600"
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Settings
              </button>
            </div>
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold font-outfit text-gray-900">Personal Information</h2>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              {profileFeedback && (
                <div
                  className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
                    profileFeedback.type === "success"
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {profileFeedback.type === "success" ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium">{profileFeedback.message}</span>
                </div>
              )}

              {!isEditingProfile ? (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="text-sm font-semibold text-gray-500 mb-1 block">Name</label>
                      <p className="text-lg font-semibold text-gray-900">{currentUser.name || "Not set"}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="text-sm font-semibold text-gray-500 mb-1 block flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        Email
                      </label>
                      <p className="text-lg font-semibold text-gray-900">{currentUser.email || "Not set"}</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="text-sm font-semibold text-gray-500 mb-1 block">Account Type</label>
                      <p className="text-lg font-semibold text-gray-900 capitalize">{currentUser.role || "user"}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="text-sm font-semibold text-gray-500 mb-1 block flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Verification Status
                      </label>
                      <p className={`text-lg font-semibold ${currentUser.is_verified ? "text-green-600" : "text-orange-600"}`}>
                        {currentUser.is_verified ? "✓ Verified" : "Not Verified"}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="text-sm font-semibold text-gray-500 mb-1 block flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Member Since
                    </label>
                    <p className="text-lg font-semibold text-gray-900">
                      {currentUser.created_at
                        ? new Date(currentUser.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2 font-outfit">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileFormData.name}
                      onChange={(e) =>
                        setProfileFormData({ ...profileFormData, name: e.target.value })
                      }
                      required
                      placeholder="Enter your name"
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2 font-outfit">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={profileFormData.email}
                      onChange={(e) =>
                        setProfileFormData({ ...profileFormData, email: e.target.value })
                      }
                      required
                      placeholder="Enter your email"
                      className="input-field w-full"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="btn-secondary flex-1 flex items-center justify-center gap-2"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileFormData({
                          name: currentUser.name || "",
                          email: currentUser.email || "",
                        });
                        setProfileFeedback(null);
                      }}
                      disabled={profileLoading}
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`btn-primary flex-1 flex items-center justify-center gap-2 ${profileLoading ? 'btn-loading' : ''}`}
                      disabled={profileLoading}
                    >
                      {profileLoading ? 'Saving...' : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Password Change */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold font-outfit text-gray-900 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-primary-600" />
                    Change Password
                  </h2>
                  {!showPasswordForm && (
                    <button
                      onClick={() => setShowPasswordForm(true)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      Change Password
                    </button>
                  )}
                </div>

                {showPasswordForm ? (
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    {passwordFeedback && (
                      <div
                        className={`p-4 rounded-lg border flex items-start gap-3 ${
                          passwordFeedback.type === "success"
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-red-50 border-red-200 text-red-800"
                        }`}
                      >
                        {passwordFeedback.type === "success" ? (
                          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        )}
                        <span className="font-medium">{passwordFeedback.message}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2 font-outfit">
                        Current Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordFormData.currentPassword}
                          onChange={(e) =>
                            setPasswordFormData({
                              ...passwordFormData,
                              currentPassword: e.target.value,
                            })
                          }
                          required
                          placeholder="Enter current password"
                          className="input-field w-full pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2 font-outfit">
                        New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordFormData.newPassword}
                          onChange={(e) =>
                            setPasswordFormData({
                              ...passwordFormData,
                              newPassword: e.target.value,
                            })
                          }
                          required
                          minLength={6}
                          placeholder="Enter new password (min 6 characters)"
                          className="input-field w-full pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2 font-outfit">
                        Confirm New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordFormData.confirmPassword}
                          onChange={(e) =>
                            setPasswordFormData({
                              ...passwordFormData,
                              confirmPassword: e.target.value,
                            })
                          }
                          required
                          minLength={6}
                          placeholder="Confirm new password"
                          className="input-field w-full pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordFormData({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          });
                          setPasswordFeedback(null);
                        }}
                        disabled={passwordLoading}
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`btn-primary flex-1 flex items-center justify-center gap-2 ${passwordLoading ? 'btn-loading' : ''}`}
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? 'Changing...' : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Change Password</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Click "Change Password" to update your password.</p>
                  </div>
                )}
              </div>

              {/* Account Actions */}
              <div className="card">
                <h2 className="text-2xl font-bold font-outfit text-gray-900 mb-6 flex items-center gap-2">
                  <LogOut className="w-6 h-6 text-red-600" />
                  Account Actions
                </h2>
                <div className="p-6 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Logout</h3>
                      <p className="text-sm text-gray-600">Sign out of your account</p>
                    </div>
                    <button
                      className="btn-accent flex items-center gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Profile;

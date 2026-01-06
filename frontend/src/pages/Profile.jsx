import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import InfoModal from '../components/InfoModal';
import { getApiBaseUrl } from '../config';

export default function Profile() {
  const { user, isAdmin, updateUser } = useAuth();
  const { userId } = useParams(); // Get userId from URL params
  const API_BASE = getApiBaseUrl();
  const [profileUser, setProfileUser] = useState(null); // The user whose profile we're viewing
  const [activeTab, setActiveTab] = useState('general');
  const [accountInfo, setAccountInfo] = useState({
    member_since: '',
    last_login: '',
    total_requests: 0,
    account_status: ''
  });
  const [formData, setFormData] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Determine which user we're viewing
  const isViewingOwnProfile = !userId || userId === user?.id?.toString();
  const currentProfileUser = profileUser || user;
  const canEdit = isViewingOwnProfile || isAdmin;
  const isAdminEditingOthers = isAdmin && !isViewingOwnProfile;

  // Load account info on component mount
  useEffect(() => {
    loadAccountInfo();
  }, []);

  // Load profile user data
  useEffect(() => {
    const loadProfileUser = async () => {
      if (!userId || userId === user?.id?.toString()) {
        // Viewing own profile
        setProfileUser(user);
        setFormData(prev => ({
          ...prev,
          username: user?.username || ''
        }));
      } else {
        // Viewing another user's profile
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (!response.ok) {
            throw new Error('User not found');
          }
          
          const userData = await response.json();
          setProfileUser(userData);
          setFormData(prev => ({
            ...prev,
            username: userData.username || ''
          }));
        } catch (error) {
          setInfoModal({
            isOpen: true,
            title: 'Error',
            message: error.message || 'Error loading user data',
            type: 'error'
          });
        } finally {
          setLoading(false);
        }
      }
    };

    if (user) {
      loadProfileUser();
    }
  }, [userId, user]);

  const loadAccountInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/auth/account-info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAccountInfo(data);
      }
    } catch (error) {
      console.error('Error loading account info:', error);
    }
  };

  // Password validation helper
  const isPasswordValid = (password) => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
  };

  // Get password requirement status
  const getPasswordRequirements = (password) => {
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password)
    };
  };

  // Show info modal helper
  const showInfoModal = (title, message, type = 'success') => {
    setInfoModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const closeInfoModal = () => {
    setInfoModal(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: formData.username
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        updateUser(updatedUser);
        showInfoModal(
          'Profile updated',
          'Your username has been successfully changed.',
          'success'
        );
      } else {
        const error = await response.json();
        let errorMessage = 'An unknown error occurred.';
        
        if (error.detail) {
          if (error.detail.includes('already exists')) {
            errorMessage = 'This username is already taken. Please choose another.';
          } else if (error.detail.includes('permission')) {
            errorMessage = 'You do not have permission to change your profile.';
          } else {
            errorMessage = error.detail;
          }
        }
        
        showInfoModal(
          'Error updating profile',
          errorMessage,
          'error'
        );
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showInfoModal(
        'Connection error',
        'There was a problem connecting to the server. Please try again later.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    
    // Only require current password for own profile or non-admin users
    if (!isAdminEditingOthers && !formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (!isPasswordValid(formData.newPassword)) {
      newErrors.newPassword = 'Password does not meet all requirements';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Password confirmation is required';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const token = localStorage.getItem('token');
      
      // Use different endpoints for admin editing others vs own password
      let endpoint, body;
      if (isAdminEditingOthers) {
        // Admin changing another user's password - use admin endpoint
        endpoint = `${API_BASE}/api/admin/users/${userId}/password`;
        body = JSON.stringify({
          new_password: formData.newPassword
        });
      } else {
        // User changing own password - use regular endpoint
        endpoint = `${API_BASE}/api/auth/change-password`;
        body = JSON.stringify({
          current_password: formData.currentPassword,
          new_password: formData.newPassword
        });
      }
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: body
      });

      if (response.ok) {
        showInfoModal(
          'Password changed',
          'Your password has been successfully changed.',
          'success'
        );
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        const error = await response.json();
        let errorMessage = 'An unknown error occurred.';
        
        if (error.detail) {
          if (error.detail.includes('Current password is incorrect') || 
              error.detail.includes('current password') ||
              error.detail.includes('wrong password')) {
            errorMessage = 'The current password is incorrect. Please check your entry.';
          } else if (error.detail.includes('Password must be at least')) {
            errorMessage = 'The new password must be at least 8 characters long.';
          } else if (error.detail.includes('uppercase')) {
            errorMessage = 'The new password must contain at least one uppercase letter.';
          } else if (error.detail.includes('lowercase')) {
            errorMessage = 'The new password must contain at least one lowercase letter.';
          } else if (error.detail.includes('number')) {
            errorMessage = 'The new password must contain at least one number.';
          } else {
            errorMessage = error.detail;
          }
        }
        
        showInfoModal(
          'Error changing password',
          errorMessage,
          'error'
        );
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showInfoModal(
        'Connection error',
        'There was a problem connecting to the server. Please try again later.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General Settings', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'password', name: 'Password', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isViewingOwnProfile ? user?.username : currentProfileUser?.username}
          </h1>
          {(isViewingOwnProfile ? user?.role : currentProfileUser?.role) && (
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-2 ${
              (isViewingOwnProfile ? user?.role : currentProfileUser?.role) === 'admin' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {(isViewingOwnProfile ? user?.role : currentProfileUser?.role)?.charAt(0).toUpperCase() + 
               (isViewingOwnProfile ? user?.role : currentProfileUser?.role)?.slice(1)}
            </span>
          )}
        </div>

        {/* Tabs - only show for own profile */}
        {canEdit && (
          <div className="flex justify-center mb-8">
            <div className="flex bg-gray-800 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content - only show for editing own profile */}
        {canEdit && (
          <div className="bg-gray-800 rounded-lg p-6">
            {activeTab === 'general' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">General Settings</h2>
              <form onSubmit={handleGeneralSubmit} className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                    Username {!isAdmin && <span className="text-sm text-gray-500">(Admin only)</span>}
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={!isAdmin}
                    className={`w-full px-3 py-2 border rounded-lg text-white placeholder-gray-400 focus:outline-none ${
                      errors.username 
                        ? 'border-red-500 bg-red-500/10' 
                        : 'border-gray-600 focus:border-blue-500'
                    } ${
                      !isAdmin ? 'bg-gray-800 cursor-not-allowed opacity-50' : 'bg-gray-700'
                    }`}
                    required
                  />
                  {errors.username && (
                    <p className="text-red-400 text-sm mt-1">{errors.username}</p>
                  )}
                </div>

                {errors.submit && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{errors.submit}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || !isAdmin}
                    className={`px-6 py-2 text-white rounded-lg transition-colors ${
                      loading || !isAdmin 
                        ? 'bg-gray-600 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                {isAdminEditingOthers ? `Change password for ${currentProfileUser?.username}` : 'Change Password'}
              </h2>
              {isAdminEditingOthers && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-blue-300 text-sm">
                      As an administrator, you can change this user's password without entering the current password.
                    </p>
                  </div>
                </div>
              )}
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {/* Only show current password field if not admin editing others */}
                {!isAdminEditingOthers && (
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none ${
                        errors.currentPassword ? 'border-red-500 bg-red-500/10' : 'border-gray-600 focus:border-blue-500'
                      }`}
                      required
                    />
                    {errors.currentPassword && (
                      <p className="text-red-400 text-sm mt-1">{errors.currentPassword}</p>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none ${
                      errors.newPassword ? 'border-red-500 bg-red-500/10' : 'border-gray-600 focus:border-blue-500'
                    }`}
                    required
                  />
                  {errors.newPassword && (
                    <p className="text-red-400 text-sm mt-1">{errors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none ${
                      errors.confirmPassword ? 'border-red-500 bg-red-500/10' : 'border-gray-600 focus:border-blue-500'
                    }`}
                    required
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                {formData.newPassword && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-blue-300 font-medium mb-2">Password Requirements</h4>
                        <ul className="text-sm space-y-1">
                          {(() => {
                            const requirements = getPasswordRequirements(formData.newPassword);
                            return (
                              <>
                                <li className={`flex items-center ${requirements.minLength ? 'text-green-400' : 'text-gray-400'}`}>
                                  <svg className={`w-4 h-4 mr-2 ${requirements.minLength ? 'text-green-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={requirements.minLength ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                                  </svg>
                                  At least 8 characters long
                                </li>
                                <li className={`flex items-center ${requirements.hasUpperCase ? 'text-green-400' : 'text-gray-400'}`}>
                                  <svg className={`w-4 h-4 mr-2 ${requirements.hasUpperCase ? 'text-green-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={requirements.hasUpperCase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                                  </svg>
                                  Contains uppercase letters
                                </li>
                                <li className={`flex items-center ${requirements.hasLowerCase ? 'text-green-400' : 'text-gray-400'}`}>
                                  <svg className={`w-4 h-4 mr-2 ${requirements.hasLowerCase ? 'text-green-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={requirements.hasLowerCase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                                  </svg>
                                  Contains lowercase letters
                                </li>
                                <li className={`flex items-center ${requirements.hasNumber ? 'text-green-400' : 'text-gray-400'}`}>
                                  <svg className={`w-4 h-4 mr-2 ${requirements.hasNumber ? 'text-green-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={requirements.hasNumber ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                                  </svg>
                                  Contains at least one number
                                </li>
                              </>
                            );
                          })()}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {errors.submit && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{errors.submit}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-6 py-2 text-white rounded-lg transition-colors ${
                      loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
        )}

        {/* Account Info */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Member since:</span>
              <span className="text-white ml-2">{accountInfo.member_since || 'Loading...'}</span>
            </div>
            <div>
              <span className="text-gray-400">Last login:</span>
              <span className="text-white ml-2">{accountInfo.last_login || 'Loading...'}</span>
            </div>
            <div>
              <span className="text-gray-400">Total requests:</span>
              <span className="text-white ml-2">{accountInfo.total_requests}</span>
            </div>
            <div>
              <span className="text-gray-400">Account status:</span>
              <span className="text-green-400 ml-2">{accountInfo.account_status || 'Loading...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <InfoModal
        isOpen={infoModal.isOpen}
        onClose={closeInfoModal}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
      />
    </div>
  );
}

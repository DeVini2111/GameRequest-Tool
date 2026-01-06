import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import InfoModal from '../components/InfoModal';
import { authFetch } from '../api/auth';
import { getApiBaseUrl } from '../config';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [telegramTestSuccess, setTelegramTestSuccess] = useState(false);
  
  // Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });
  
  const [settings, setSettings] = useState({
    // General Settings
    maxRequestsPerUser: -1, // -1 = unlimited
    
    // Request Management
    requireAdminApproval: true,
    allowUserRequestDeletion: false,
    
    // Telegram Notifications
    telegramEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
    notifyOnNewRequest: true,
    notifyOnStatusChange: true,
    notifyOnUserRegistration: false,
    notifyOnSystemErrors: false,
    
    // Logging
    enableApplicationLogs: true,
    enableErrorLogs: true,
    enableAuditLogs: true,
    logRetentionDays: 30
  });

  const API_BASE = getApiBaseUrl();

  // Define loadSettings before useEffect
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const { logLevel: _logLevel, ...rest } = data;
        setSettings(rest);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Reset telegram test success and disable telegram if bot token or chat ID changes
    if (key === 'telegramBotToken' || key === 'telegramChatId') {
      setTelegramTestSuccess(false);
      // Also disable telegram if it was enabled
      if (settings.telegramEnabled) {
        setSettings(prev => ({
          ...prev,
          [key]: value,
          telegramEnabled: false
        }));
      }
    }
  };

  // Separate function for immediate telegram toggle save
  const handleTelegramToggle = async () => {
    const newValue = !settings.telegramEnabled;
    
    try {
      setLoading(true);
      
      // Update local state immediately
      setSettings(prev => ({
        ...prev,
        telegramEnabled: newValue
      }));
      
      // Save to backend immediately
      const token = localStorage.getItem('token');
      const updatedSettings = { ...settings, telegramEnabled: newValue };
      
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedSettings)
      });

      if (response.ok) {
        setInfoModal({
          isOpen: true,
          title: newValue ? 'Telegram enabled' : 'Telegram disabled',
          message: newValue ? 'Telegram notifications are now active.' : 'Telegram notifications have been disabled.',
          type: 'success'
        });
      } else {
        // Revert on error
        setSettings(prev => ({
          ...prev,
          telegramEnabled: !newValue
        }));
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving telegram setting:', error);
      setInfoModal({
        isOpen: true,
        title: 'Error Saving',
        message: 'Telegram setting could not be saved.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Separate function for immediate telegram notification type save
  const handleTelegramNotificationToggle = async (key, newValue) => {
    try {
      setLoading(true);
      
      // Update local state immediately
      setSettings(prev => ({
        ...prev,
        [key]: newValue
      }));
      
      // Save to backend immediately
      const token = localStorage.getItem('token');
      const updatedSettings = { ...settings, [key]: newValue };
      
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedSettings)
      });

      if (!response.ok) {
        // Revert on error
        setSettings(prev => ({
          ...prev,
          [key]: !newValue
        }));
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving notification setting:', error);
      setInfoModal({
        isOpen: true,
        title: 'Error Saving',
        message: 'Notification setting could not be saved.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setInfoModal({
          isOpen: true,
          title: 'Settings Saved',
          message: 'All changes have been saved successfully.',
          type: 'success'
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setInfoModal({
        isOpen: true,
        title: 'Error Saving',
        message: 'Settings could not be saved. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testTelegramConnection = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      setInfoModal({
        isOpen: true,
        title: 'Incomplete Configuration',
        message: 'Please provide both Bot Token and Chat ID.',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // First save the token and chat ID to backend
      const token = localStorage.getItem('token');
      const saveResponse = await fetch(`${API_BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save telegram configuration');
      }

      // Then test the connection
      const response = await fetch(`${API_BASE}/api/admin/telegram/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bot_token: settings.telegramBotToken,
          chat_id: settings.telegramChatId
        })
      });

      const data = await response.json();

      if (response.ok && data.success === true) {
        setTelegramTestSuccess(true);
        setInfoModal({
          isOpen: true,
          title: 'Connection Successful',
          message: 'Telegram configuration has been saved and test message sent successfully. You can now enable Telegram.',
          type: 'success'
        });
      } else {
        setTelegramTestSuccess(false);
        setInfoModal({
          isOpen: true,
          title: 'Connection Failed',
          message: data.detail || data.message || 'Could not establish Telegram connection.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error testing telegram:', error);
      setTelegramTestSuccess(false);
      setInfoModal({
        isOpen: true,
        title: 'Connection Failed',
        message: 'Could not establish Telegram connection. Check your configuration.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const closeInfoModal = () => {
    setInfoModal({ isOpen: false, title: '', message: '', type: 'success' });
  };

  // Logs functions
  const loadLogs = async (lines = 100) => {
    try {
      setLogsLoading(true);
      const response = await authFetch(`/api/logs/recent?lines=${lines}`);
      const data = await response.json();
      
      if (response.ok) {
        setLogs(data);
      } else {
        setInfoModal({
          isOpen: true,
          title: 'Error',
          message: data.detail || 'Error loading logs',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Load logs error:', error);
      setInfoModal({
        isOpen: true,
        title: 'Error',
        message: 'Network error loading logs',
        type: 'error'
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const downloadLogFile = async () => {
    try {
      const response = await authFetch('/api/logs/download');
      
      if (response.ok) {
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `gamerequest_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
        
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) {
            filename = match[1];
          }
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setInfoModal({
          isOpen: true,
          title: 'Success',
          message: 'Logs downloaded successfully',
          type: 'success'
        });
      } else {
        const data = await response.json();
        setInfoModal({
          isOpen: true,
          title: 'Error',
          message: data.detail || 'Error downloading',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      setInfoModal({
        isOpen: true,
        title: 'Error',
        message: 'Network error downloading logs',
        type: 'error'
      });
    }
  };

  const cleanupOldLogs = async () => {
    try {
      const response = await authFetch('/api/logs/cleanup', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        setInfoModal({
          isOpen: true,
          title: 'Success',
          message: data.message,
          type: 'success'
        });
      } else {
        setInfoModal({
          isOpen: true,
          title: 'Error',
          message: data.detail || 'Error during cleanup',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      setInfoModal({
        isOpen: true,
        title: 'Error',
        message: 'Network error during cleanup',
        type: 'error'
      });
    }
  };

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Load logs when logs tab is active
  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]);

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { 
      id: 'general', 
      name: 'General', 
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    },
    { 
      id: 'telegram', 
      name: 'Telegram', 
      icon: 'M12 2l3.09 6.26L22 9l-5.91 5.74L17.82 22 12 18.27 6.18 22l1.73-7.26L2 9l6.91-.74L12 2z'
    },
    { 
      id: 'logs', 
      name: 'Logs & Monitoring', 
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    }
  ];

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">System Settings</h1>
          <p className="text-gray-400">Configure system settings and notifications</p>
        </div>

        {/* Tabs */}
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

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">General Settings</h2>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Note:</strong> Admin requests are always automatically approved and are exempt from request limits.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Requests per User
                  </label>
                  <select
                    value={settings.maxRequestsPerUser}
                    onChange={(e) => handleSettingChange('maxRequestsPerUser', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={-1}>Unlimited (-1)</option>
                    <option value={1}>1 Request</option>
                    <option value={2}>2 Requests</option>
                    <option value={3}>3 Requests</option>
                    <option value={5}>5 Requests</option>
                    <option value={10}>10 Requests</option>
                    <option value={20}>20 Requests</option>
                    <option value={50}>50 Requests</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">-1 = Unlimited, 0+ = Maximum number of active requests (applies only to regular users)</p>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <h3 className="text-lg font-semibold text-white">Permissions & Behavior</h3>
                
                {[
                  { 
                    key: 'requireAdminApproval', 
                    label: 'Admin approval required', 
                    desc: 'All requests must be approved by an administrator'
                  },
                  { 
                    key: 'allowUserRequestDeletion', 
                    label: 'Users can delete their own requests', 
                    desc: 'Regular users can delete their own requests'
                  }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-300">{item.label}</label>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange(item.key, !settings[item.key])}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings[item.key] ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings[item.key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'telegram' && (
            <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">Telegram Notifications</h2>              {/* Telegram Configuration Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-blue-300 font-medium mb-2">Telegram Settings</h4>
                    <p className="text-blue-200 text-sm">
                      <strong>1. Enter Bot Token and Chat ID</strong><br />
                      <strong>2. Click "Save configuration & test"</strong> → Saves the data and sends test message<br />
                      <strong>3. "Enable Telegram"</strong> → Saved immediately<br />
                      <strong>4. Select notification types</strong> → Saved immediately<br />
                      <em>Create a bot via @BotFather for token and chat ID.</em>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bot Token
                  </label>
                  <input
                    type="text"
                    value={settings.telegramBotToken}
                    onChange={(e) => handleSettingChange('telegramBotToken', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chat ID
                  </label>
                  <input
                    type="text"
                    value={settings.telegramChatId}
                    onChange={(e) => handleSettingChange('telegramChatId', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="-1001234567890"
                  />
                </div>

                <div className="flex gap-3 items-center">
                  <button
                    onClick={testTelegramConnection}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {loading ? 'Testing...' : 'Save Configuration & Test'}
                  </button>
                  
                  <div className="flex items-center">
                    <label className="text-sm font-medium text-gray-300 mr-3">Enable Telegram</label>
                    <button
                      onClick={handleTelegramToggle}
                      disabled={(!telegramTestSuccess && !settings.telegramEnabled) || loading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.telegramEnabled ? 'bg-blue-600' : 'bg-gray-600'
                      } ${((!telegramTestSuccess && !settings.telegramEnabled) || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings.telegramEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                
                {!telegramTestSuccess && !settings.telegramEnabled && (
                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-200 text-sm">
                      <strong>Note:</strong> Perform the connection test first before you can enable Telegram.
                    </p>
                  </div>
                )}
              </div>

              {/* Notification Options */}
              <div className="space-y-4 pt-6">
                <h3 className="text-lg font-semibold text-white">Notification Types</h3>
                
                {[
                  { 
                    key: 'notifyOnNewRequest', 
                    label: 'New Requests', 
                    desc: 'Notification for new game requests'
                  },
                  { 
                    key: 'notifyOnStatusChange', 
                    label: 'Status Changes', 
                    desc: 'Notification for request status changes'
                  },
                  { 
                    key: 'notifyOnUserRegistration', 
                    label: 'New User Registrations', 
                    desc: 'Notification for new user registrations'
                  },
                  { 
                    key: 'notifyOnSystemErrors', 
                    label: 'System Errors', 
                    desc: 'Notification for critical system errors'
                  }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-300">{item.label}</label>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => handleTelegramNotificationToggle(item.key, !settings[item.key])}
                      disabled={!settings.telegramEnabled || loading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings[item.key] && settings.telegramEnabled ? 'bg-blue-600' : 'bg-gray-600'
                      } ${(!settings.telegramEnabled || loading) ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings[item.key] && settings.telegramEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-6">Logs & Monitoring</h2>
              
              {/* Settings Section */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Log Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Log Retention (days)
                    </label>
                    <input
                      type="number"
                      value={settings.logRetentionDays}
                      onChange={(e) => handleSettingChange('logRetentionDays', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      min={1}
                      max={365}
                    />
                    <p className="text-xs text-gray-400 mt-1">How long log files are retained</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {[{
                    key: 'enableApplicationLogs',
                    label: 'Application Logs',
                    desc: 'Info/Warn activity logging'
                  }, {
                    key: 'enableErrorLogs',
                    label: 'Error Logs',
                    desc: 'Error-level logging'
                  }, {
                    key: 'enableAuditLogs',
                    label: 'Audit Logs',
                    desc: 'Security/audit trail entries'
                  }].map(item => (
                    <div key={item.key} className="p-4 bg-gray-800 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-200">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => handleSettingChange(item.key, !settings[item.key])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[item.key] ? 'bg-blue-600' : 'bg-gray-600'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings[item.key] ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls Section */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Aktionen</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => loadLogs(50)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Load 50 entries
                  </button>
                  <button
                    onClick={() => loadLogs(100)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Load 100 entries
                  </button>
                  <button
                    onClick={() => loadLogs(200)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Load 200 entries
                  </button>
                  <button
                    onClick={downloadLogFile}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    📥 Download Logs
                  </button>
                  <button
                    onClick={cleanupOldLogs}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
                  >
                    🧹 Clean up old logs
                  </button>
                </div>
              </div>

              {/* Logs Section */}
              <div className="bg-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Current Log Entries</h3>
                  {logs.length > 0 && (
                    <p className="text-sm text-gray-400">
                      {logs.length} entries loaded (newest first)
                    </p>
                  )}
                </div>
                
                {logsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                    <p className="text-gray-400 mt-2">Logs are being loaded...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No log entries found</p>
                    <button
                      onClick={() => loadLogs()}
                      className="mt-2 text-blue-400 hover:text-blue-300"
                    >
                      Load
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {logs.map((log, index) => (
                        <div
                          key={index}
                          className="p-3 rounded border border-gray-700 bg-gray-900"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-gray-700 text-gray-200 px-2 py-1 rounded uppercase">
                                  {log.level}
                                </span>
                                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                  {log.type}
                                </span>
                              </div>
                              <p className="text-gray-300 font-mono text-xs leading-relaxed">
                                {log.message}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xs text-gray-500">{log.formatted_time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save Button - Only show for general and logs tabs */}
        {(activeTab === 'general' || activeTab === 'logs') && (
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        )}
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

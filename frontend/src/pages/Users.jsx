import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import CreateUserModal from '../components/CreateUserModal';
import ConfirmModal from '../components/ConfirmModal';
import InfoModal from '../components/InfoModal';
import { getApiBaseUrl } from '../config';

export default function Users() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const API_BASE = getApiBaseUrl();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null, hasRequests: false, requestCount: 0 });
  const [userRequestCounts, setUserRequestCounts] = useState({});
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin) return;
      
      try {
        const token = localStorage.getItem('token');
        
        // Fetch users and request counts in parallel
        const [usersResponse, requestCountsResponse] = await Promise.all([
          fetch(`${API_BASE}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/admin/users/request-counts`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        } else {
          console.error('Failed to fetch users:', usersResponse.statusText);
        }

        if (requestCountsResponse.ok) {
          const requestCounts = await requestCountsResponse.json();
          setUserRequestCounts(requestCounts);
        } else {
          console.error('Failed to fetch request counts:', requestCountsResponse.statusText);
          setUserRequestCounts({});
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin]);

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleDeleteUser = async (userToDelete) => {
    if (userToDelete.id === user.id) {
      setInfoModal({
        isOpen: true,
        title: 'Error',
        message: 'You cannot delete yourself.',
        type: 'error'
      });
      return;
    }

    // First, check if user has requests
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // User deleted successfully (had no requests)
        setUsers(users.filter(u => u.id !== userToDelete.id));
      } else {
        const errorData = await response.json();
        
        // Check if error is about existing requests
        if (errorData.detail && errorData.detail.includes('game request')) {
          const match = errorData.detail.match(/(\d+) game request/);
          const requestCount = match ? parseInt(match[1]) : 0;
          
          // Open modal with request information
          setDeleteModal({ 
            isOpen: true, 
            user: userToDelete, 
            hasRequests: true, 
            requestCount: requestCount 
          });
        } else {
          setInfoModal({
            isOpen: true,
            title: 'Error Deleting',
            message: errorData.detail || 'User could not be deleted',
            type: 'error'
          });
        }
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setInfoModal({
        isOpen: true,
        title: 'Error',
        message: 'Error deleting user',
        type: 'error'
      });
    }
  };

  const confirmDeleteUser = async (force = false) => {
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE}/api/admin/users/${deleteModal.user.id}${force ? '?force=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setUsers(users.filter(u => u.id !== deleteModal.user.id));
        setDeleteModal({ isOpen: false, user: null, hasRequests: false, requestCount: 0 });
      } else {
        const errorData = await response.json();
        setInfoModal({
          isOpen: true,
          title: 'Error Deleting',
          message: errorData.detail || 'User could not be deleted',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setInfoModal({
        isOpen: true,
        title: 'Error',
        message: 'Error deleting user',
        type: 'error'
      });
    }
  };

  const handleCreateUser = (newUser) => {
    setUsers(prevUsers => [...prevUsers, newUser]);
    setUserRequestCounts(prevCounts => ({
      ...prevCounts,
      [newUser.id]: 0
    }));
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
              <p className="text-gray-400">Manage users and their permissions</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create User
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Requests</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          <span className="ml-2">Loading users...</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{userItem.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeColor(userItem.role)}`}>
                            {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-300">
                              {userRequestCounts[userItem.id] || 0}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {userRequestCounts[userItem.id] === 1 ? 'request' : 'requests'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {userItem.created_at
                            ? new Date(userItem.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                // If admin is editing their own profile, redirect to /profile
                                if (userItem.id === user?.id) {
                                  navigate('/profile');
                                } else {
                                  navigate(`/profile/${userItem.id}`);
                                }
                              }}
                              className="text-blue-400 hover:text-blue-300 p-2 rounded hover:bg-blue-500/10 transition-colors"
                              title="Edit user"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {userItem.id !== user?.id && (
                              <button 
                                onClick={() => handleDeleteUser(userItem)}
                                className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-500/10 transition-colors"
                                title="Delete user"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="text-2xl font-bold text-white">{users.length}</div>
                <div className="ml-2 text-sm text-gray-400">Total Users</div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="text-2xl font-bold text-blue-400">{users.filter(u => u.is_active).length}</div>
                <div className="ml-2 text-sm text-gray-400">Active Users</div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="text-2xl font-bold text-red-400">{users.filter(u => u.role === 'admin').length}</div>
                <div className="ml-2 text-sm text-gray-400">Admins</div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="text-2xl font-bold text-green-400">{users.filter(u => u.role === 'user').length}</div>
                <div className="ml-2 text-sm text-gray-400">Regular Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateUser}
      />

      {/* Delete User Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, user: null, hasRequests: false, requestCount: 0 })}
        onConfirm={() => confirmDeleteUser(true)} // Always force delete when modal is shown
        title="Delete User"
        message={`The user "${deleteModal.user?.username}" has ${deleteModal.requestCount} Game Request(s). Do you want to delete the user and all associated requests?`}
        confirmText="Yes, delete all"
        cancelText="Cancel"
        confirmColor="red"
        icon="delete"
      >
        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <p className="text-yellow-300 text-sm font-medium">Warning</p>
              <p className="text-yellow-200 text-sm mt-1">
                This action will permanently delete the user and all {deleteModal.requestCount} associated Game Request(s). This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </ConfirmModal>

      {/* Info Modal */}
      <InfoModal
        isOpen={infoModal.isOpen}
        onClose={() => setInfoModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
      />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import InfoModal from '../components/InfoModal';
import { getApiBaseUrl } from '../config';

export default function Requests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState(null);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, requestId: null, requestName: '' });
  const [editModal, setEditModal] = useState({ isOpen: false, request: null, newStatus: '' });
  const [nextStatusModal, setNextStatusModal] = useState({ isOpen: false, request: null, nextStatus: '' });
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const API_BASE = getApiBaseUrl();

  // Status styling functions
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'completed': return '🎮';
      default: return '❓';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'completed': return 'Available';
      default: return 'Unknown';
    }
  };

  // Get next status for progression
  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return 'approved';
      case 'approved': return 'completed';
      case 'rejected': return 'approved';
      default: return null;
    }
  };

  const getNextStatusText = (currentStatus) => {
    const nextStatus = getNextStatus(currentStatus);
    return getStatusText(nextStatus);
  };

  const getNextStatusColor = (currentStatus) => {
    const nextStatus = getNextStatus(currentStatus);
    switch (nextStatus) {
      case 'approved': return 'bg-purple-600 hover:bg-purple-700';
      case 'completed': return 'bg-green-600 hover:bg-green-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const fetchRequests = async () => {
    try {
      // If it's not the first load, use a softer transition
      if (!loading) {
        setSwitching(true);
      } else {
        setLoading(true);
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/requests/?skip=0&limit=1000&my_requests=${showMyRequests}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error loading requests');
      }

      const data = await response.json();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setRequests([]);
    } finally {
      setLoading(false);
      setSwitching(false);
    }
  };

  const openDeleteModal = (requestId, requestName) => {
    setDeleteModal({
      isOpen: true,
      requestId,
      requestName
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      requestId: null,
      requestName: ''
    });
  };

  const confirmDelete = async () => {
    const { requestId } = deleteModal;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error deleting request');
      }

      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err) {
      setInfoModal({
        isOpen: true,
        title: 'Error Deleting',
        message: 'Error deleting: ' + err.message,
        type: 'error'
      });
    }
  };

  const deleteRequest = (requestId, requestName) => {
    openDeleteModal(requestId, requestName);
  };

  // Edit modal functions
  const openEditModal = (request) => {
    setEditModal({
      isOpen: true,
      request: request,
      newStatus: request.status
    });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, request: null, newStatus: '' });
  };

  const updateRequestStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/requests/${editModal.request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: editModal.newStatus })
      });

      if (!response.ok) {
        throw new Error('Error updating status');
      }

      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === editModal.request.id 
          ? { ...req, status: editModal.newStatus }
          : req
      ));
      
      closeEditModal();
    } catch (err) {
      setInfoModal({
        isOpen: true,
        title: 'Error Updating',
        message: 'Error: ' + err.message,
        type: 'error'
      });
    }
  };

  // Next status modal functions
  const openNextStatusModal = (request) => {
    const nextStatus = getNextStatus(request.status);
    if (nextStatus) {
      setNextStatusModal({
        isOpen: true,
        request: request,
        nextStatus: nextStatus
      });
    }
  };

  const closeNextStatusModal = () => {
    setNextStatusModal({ isOpen: false, request: null, nextStatus: '' });
  };

  const confirmNextStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/requests/${nextStatusModal.request.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatusModal.nextStatus })
      });

      if (!response.ok) {
        throw new Error('Error updating status');
      }

      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === nextStatusModal.request.id 
          ? { ...req, status: nextStatusModal.nextStatus }
          : req
      ));
      
      closeNextStatusModal();
    } catch (err) {
      setInfoModal({
        isOpen: true,
        title: 'Error Updating',
        message: 'Error: ' + err.message,
        type: 'error'
      });
    }
  };

  // Block scrolling when edit modal is open
  useEffect(() => {
    if (editModal.isOpen) {
      const scrollY = window.scrollY;
      
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [editModal.isOpen]);

  useEffect(() => {
    fetchRequests();
  }, [showMyRequests]); // eslint-disable-line react-hooks/exhaustive-deps

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) { // lg breakpoint
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply filtering and sorting
  const filteredRequests = requests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'created_at':
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case 'game_name':
        aValue = a.game_name?.toLowerCase() || '';
        bValue = b.game_name?.toLowerCase() || '';
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-white mt-4">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className={`max-w-full mx-auto px-4 sm:px-6 py-8 transition-opacity duration-300 ${switching ? 'opacity-50' : 'opacity-100'}`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Requests</h1>
          <p className="text-gray-400">
            {showMyRequests 
              ? 'Manage your game requests and their status'
              : 'All community game requests'
            }
          </p>
        </div>

        {/* Main Layout - Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Responsive Sidebar - Vertical Filter Menu */}
          <div className={`transition-all duration-300 space-y-6 ${
            sidebarCollapsed 
              ? 'hidden lg:block lg:w-64' 
              : 'w-full lg:w-64'
          }`}>
            {/* View Toggle */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowMyRequests(true)}
                  disabled={switching}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-500 flex items-center gap-3 cursor-pointer ${
                    showMyRequests
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:transform hover:scale-102'
                  } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {switching && showMyRequests ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  My Requests
                </button>
                <button
                  onClick={() => setShowMyRequests(false)}
                  disabled={switching}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-500 flex items-center gap-3 cursor-pointer ${
                    !showMyRequests
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:transform hover:scale-102'
                  } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {switching && !showMyRequests ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )}
                  All Requests
                </button>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Sort
              </h3>
              <div className="space-y-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="created_at">By Date</option>
                  <option value="game_name">By Name</option>
                  <option value="status">By Status</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {sortOrder === 'asc' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    )}
                  </svg>
                  {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                Filter
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-between cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    All
                  </span>
                  <span className="bg-gray-600 px-2 py-1 rounded-full text-xs">{requests.length}</span>
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-between cursor-pointer ${
                    filterStatus === 'pending'
                      ? 'bg-yellow-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pending
                  </span>
                  <span className="bg-yellow-700 px-2 py-1 rounded-full text-xs">{sortedRequests.filter(r => r.status === 'pending').length}</span>
                </button>
                <button
                  onClick={() => setFilterStatus('approved')}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-between cursor-pointer ${
                    filterStatus === 'approved'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Approved
                  </span>
                  <span className="bg-purple-700 px-2 py-1 rounded-full text-xs">{sortedRequests.filter(r => r.status === 'approved').length}</span>
                </button>
                <button
                  onClick={() => setFilterStatus('rejected')}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-between cursor-pointer ${
                    filterStatus === 'rejected'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Rejected
                  </span>
                  <span className="bg-red-700 px-2 py-1 rounded-full text-xs">{sortedRequests.filter(r => r.status === 'rejected').length}</span>
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-between cursor-pointer ${
                    filterStatus === 'completed'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h10a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z" />
                    </svg>
                    Available
                  </span>
                  <span className="bg-green-700 px-2 py-1 rounded-full text-xs">{sortedRequests.filter(r => r.status === 'completed').length}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Error State */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-8">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-medium text-red-300">Error Loading</h3>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar Toggle Button for mobile */}
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Filter {sidebarCollapsed ? 'anzeigen' : 'ausblenden'}
              </button>
            </div>

            {/* Responsive Requests Grid - Larger Cards */}
            {sortedRequests.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-medium text-gray-300 mb-2">
                  {showMyRequests ? 'No personal requests' : 'No requests available'}
                </h3>
                <p className="text-gray-400 mb-6">
                  {showMyRequests 
                    ? 'You haven\'t created any game requests yet.'
                    : 'No requests have been made yet.'
                  }
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Discover Games
                </button>
              </div>
            ) : (
              <div
                className="grid gap-4 sm:gap-5 lg:gap-6 justify-center"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(12.5rem, 14rem))' }}
              >
                {sortedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group w-full max-w-[14rem] min-w-[12.5rem] mx-auto"
                  >
                    {/* Game Cover - Smaller aspect ratio to leave more room for content */}
                    <div className="relative aspect-[3/3.5] overflow-hidden">
                      <img
                        src={
                          request.igdb_cover_url || 
                          `https://via.placeholder.com/300x350/374151/9CA3AF?text=${encodeURIComponent(request.game_name || 'Unknown Game')}`
                        }
                        alt={`${request.game_name} Cover`}
                        className="w-full h-full object-cover transition-all duration-300 opacity-60 brightness-75 group-hover:opacity-100 group-hover:brightness-110 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (request.igdb_id) navigate(`/game/${request.igdb_id}`);
                        }}
                      />
                    </div>

                    {/* Card Content - Always visible with flexible sizing */}
                    <div className="p-2 sm:p-3 lg:p-4 flex flex-col min-h-[180px] sm:min-h-[200px] lg:min-h-[220px]">
                      {/* Game Title - Always visible with fixed 2-line height */}
                      <h3 
                        className="font-bold text-xs sm:text-sm lg:text-base xl:text-lg mb-1 sm:mb-2 cursor-pointer hover:text-blue-400 transition-colors flex-shrink-0 h-8 sm:h-10 lg:h-12 flex items-start overflow-hidden"
                        style={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.2'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (request.igdb_id) navigate(`/game/${request.igdb_id}`);
                        }}
                      >
                        {request.game_name}
                      </h3>

                      {/* Request Info - Compact but always visible */}
                      <div className="space-y-1 text-xs sm:text-xs lg:text-sm text-gray-400 mb-2 sm:mb-3 flex-grow">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="truncate text-xs">{request.user?.username || 'Unknown user'}</span>
                        </div>

                        {/* Status as colored badge under user */}
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-full text-white ${
                            request.status === 'pending' ? 'bg-yellow-500' :
                            request.status === 'approved' ? 'bg-purple-500' :
                            request.status === 'rejected' ? 'bg-red-500' :
                            request.status === 'completed' ? 'bg-green-500' :
                            'bg-gray-500'
                          }`}>
                            <span className="text-xs">{getStatusIcon(request.status)}</span>
                            <span className="text-xs truncate">{getStatusText(request.status)}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="truncate text-xs">{formatDate(request.created_at)}</span>
                        </div>
                      </div>

                      {/* Action Buttons - Always visible, compact */}
                      <div className="space-y-1 sm:space-y-2 mt-auto flex-shrink-0">
                        {/* Admin Status Management Buttons */}
                        {user?.role === 'admin' && (
                          <div className="w-full flex rounded overflow-hidden">
                            {/* Next Status Button (2/3 width) */}
                            {request.status !== 'completed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openNextStatusModal(request);
                                }}
                                className={`flex-[2] text-white py-1.5 sm:py-2 px-2 sm:px-2 lg:px-3 transition-colors flex items-center justify-center gap-1 text-xs font-medium cursor-pointer ${getNextStatusColor(request.status)}`}
                              >
                                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                                </svg>
                                <span className="truncate hidden sm:inline">{getNextStatusText(request.status)}</span>
                              </button>
                            )}
                            
                            {/* Edit Button (1/3 width or full width if completed) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(request);
                              }}
                              className={`${request.status === 'completed' ? 'w-full' : 'flex-1'} bg-gray-600 hover:bg-gray-700 text-white py-1.5 sm:py-2 px-1 transition-colors flex items-center justify-center cursor-pointer ${request.status === 'completed' ? 'rounded' : ''}`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              {request.status === 'completed' && <span className="ml-1 hidden sm:inline text-xs">Edit</span>}
                            </button>
                          </div>
                        )}
                        
                        {/* Delete Button */}
                        {(showMyRequests || user?.role === 'admin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRequest(request.id, request.game_name);
                            }}
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white py-1.5 sm:py-2 px-2 sm:px-2 lg:px-3 rounded transition-colors flex items-center justify-center gap-1 text-xs font-medium cursor-pointer"
                          >
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="truncate hidden sm:inline">Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats Section */}
            {sortedRequests.length > 0 && (
              <div className="mt-12 bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{requests.length}</div>
                    <div className="text-sm text-gray-400">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{sortedRequests.filter(r => r.status === 'pending').length}</div>
                    <div className="text-sm text-gray-400">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{sortedRequests.filter(r => r.status === 'approved').length}</div>
                    <div className="text-sm text-gray-400">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{sortedRequests.filter(r => r.status === 'rejected').length}</div>
                    <div className="text-sm text-gray-400">Rejected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{sortedRequests.filter(r => r.status === 'completed').length}</div>
                    <div className="text-sm text-gray-400">Available</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Request"
        message={`Do you really want to delete the request for "${deleteModal.requestName}"? This action cannot be undone.`}
        confirmText="Yes, delete"
        cancelText="Cancel"
        confirmColor="red"
        icon="delete"
      />

      {/* Edit Request Status Modal */}
      {editModal.isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: '#1018287c' }}
        >
          <div className="bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-2xl max-w-md w-full mx-4 border border-gray-500/30">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 pb-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Edit Status</h3>
                <p className="text-sm text-gray-300">{editModal.request?.game_name}</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={editModal.newStatus}
                    onChange={(e) => setEditModal(prev => ({ ...prev, newStatus: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="pending">⏳ Pending</option>
                    <option value="approved">✅ Approved</option>
                    <option value="rejected">❌ Rejected</option>
                    <option value="completed">🎮 Available</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={updateRequestStatus}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Next Status Confirmation Modal */}
      <ConfirmModal
        isOpen={nextStatusModal.isOpen}
        onCancel={closeNextStatusModal}
        onConfirm={confirmNextStatus}
        title="Change Status"
        message={`Do you really want to set "${nextStatusModal.request?.game_name}" to "${getStatusText(nextStatusModal.nextStatus)}"?`}
        confirmText="Yes, change"
        cancelText="Cancel"
        confirmColor={nextStatusModal.nextStatus === 'approved' ? 'purple' : nextStatusModal.nextStatus === 'completed' ? 'green' : 'blue'}
        icon="arrow"
      />

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

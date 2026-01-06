import React, { useState, useEffect } from 'react';
import { authFetch } from '../api/auth';
import InfoModal from '../components/InfoModal';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logStats, setLogStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('info');

  // Load initial data
  useEffect(() => {
    loadLogs();
    loadLogStats();
  }, []);

  const loadLogs = async (lines = 100) => {
    try {
      setLoading(true);
      const response = await authFetch(`/api/logs/recent?lines=${lines}`);
      const data = await response.json();
      
      if (response.ok) {
        setLogs(data);
        setError('');
      } else {
        setError(data.detail || 'Error loading logs');
      }
    } catch (error) {
      setError('Network error loading logs');
      console.error('Load logs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogStats = async () => {
    try {
      const response = await authFetch('/api/logs/stats');
      const data = await response.json();
      
      if (response.ok) {
        setLogStats(data);
      }
    } catch (err) {
      console.error('Failed to load log stats:', err);
    }
  };

  const downloadLogFile = async (logType) => {
    try {
      const response = await authFetch(`/api/logs/download/${logType}`);
      
      if (response.ok) {
        // Get filename from Content-Disposition header or create default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `gamerequest_${logType}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
        
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) {
            filename = match[1];
          }
        }
        
        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setModalMessage(`${logType === 'application' ? 'Application' : 'Error'} logs downloaded successfully`);
        setModalType('success');
        setShowModal(true);
      } else {
        const data = await response.json();
        setModalMessage(data.detail || 'Error downloading');
        setModalType('error');
        setShowModal(true);
      }
    } catch (error) {
      setModalMessage('Network error downloading');
      setModalType('error');
      setShowModal(true);
      console.error('Download error:', error);
    }
  };

  const cleanupOldLogs = async () => {
    try {
      const response = await authFetch('/api/logs/cleanup', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        setModalMessage(data.message);
        setModalType('success');
        setShowModal(true);
        // Reload stats after cleanup
        loadLogStats();
      } else {
        setModalMessage(data.detail || 'Error during cleanup');
        setModalType('error');
        setShowModal(true);
      }
    } catch (error) {
      setModalMessage('Network error during cleanup');
      setModalType('error');
      setShowModal(true);
      console.error('Cleanup error:', error);
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'ERROR':
        return '🔴';
      case 'WARNING':
        return '🟡';
      case 'INFO':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-600';
      case 'WARNING':
        return 'text-yellow-600';
      case 'INFO':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="logs-page p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">System Logs</h1>
          <p className="text-gray-600">
            Overview of application activities and system events
          </p>
        </div>

        {/* Statistics Section */}
        {logStats && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Log Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-800">Gesamtanzahl Dateien</h3>
                <p className="text-2xl font-bold text-blue-600">{logStats.totalFiles}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-green-800">Total Size</h3>
                <p className="text-2xl font-bold text-green-600">{logStats.totalSizeMB}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-purple-800">Letzte Aktualisierung</h3>
                <p className="text-sm font-medium text-purple-600">
                  {logStats.files.length > 0 ? logStats.files[0].modified : 'No files'}
                </p>
              </div>
            </div>
            
            {/* File Details */}
            {logStats.files.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Log-Dateien</h3>
                <div className="space-y-2">
                  {logStats.files.map((file, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 rounded p-2">
                      <span className="font-mono text-sm">{file.name}</span>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">{file.size}</span>
                        <span className="text-xs text-gray-500 ml-2">{file.modified}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => loadLogs(50)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Load 50 entries
            </button>
            <button
              onClick={() => loadLogs(100)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Load 100 entries
            </button>
            <button
              onClick={() => loadLogs(200)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Load 200 entries
            </button>
            <button
              onClick={() => downloadLogFile('application')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 Download Application Logs
            </button>
            <button
              onClick={() => downloadLogFile('errors')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              📥 Download Error Logs
            </button>
            <button
              onClick={cleanupOldLogs}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              🧹 Clean up old logs
            </button>
          </div>
        </div>

        {/* Logs Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Current Log Entries</h2>
            {logs.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {logs.length} entries loaded (newest first)
              </p>
            )}
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Logs are being loaded...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={() => loadLogs()}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Erneut versuchen
                </button>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No log entries found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      log.level === 'ERROR'
                        ? 'bg-red-50 border-red-500'
                        : log.level === 'WARNING'
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getLevelIcon(log.level)}</span>
                          <span className={`font-medium ${getLevelColor(log.level)}`}>
                            {log.level}
                          </span>
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            {log.type}
                          </span>
                        </div>
                        <p className="text-gray-800 font-mono text-sm leading-relaxed">
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
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <InfoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === 'success' ? 'Success' : 'Error'}
        message={modalMessage}
        type={modalType}
      />
    </div>
  );
};

export default Logs;

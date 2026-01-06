import React from 'react';

export default function InfoModal({ isOpen, onClose, title, message, type = 'success' }) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500/10 border-green-500/30',
          iconBg: 'bg-green-500/20',
          button: 'bg-green-600 hover:bg-green-700'
        };
      case 'error':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          iconBg: 'bg-red-500/20',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30',
          iconBg: 'bg-blue-500/20',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      default:
        return {
          bg: 'bg-gray-500/10 border-gray-500/30',
          iconBg: 'bg-gray-500/20',
          button: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className={`${colors.bg} border rounded-lg p-4 mb-4`}>
          <div className="flex items-start">
            <div className={`${colors.iconBg} rounded-full p-2 mr-3`}>
              {getIcon()}
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-gray-300 text-sm">{message}</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-2 ${colors.button} text-white rounded-lg transition-colors font-medium`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

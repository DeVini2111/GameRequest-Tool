import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { importGamesFromText } from '../api/import';
import SmartGameImport from '../components/SmartGameImport';

export default function Library() {
  const { isAdmin } = useAuth();
  const [importStatus, setImportStatus] = useState('idle'); // idle, loading, success, error
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [importMode, setImportMode] = useState('bulk'); // 'bulk' or 'smart'
  
  // Text Import States
  const [textImportInput, setTextImportInput] = useState('');

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Handle Smart Import (individual game selection)
  const handleSmartImport = async (gameNames) => {
    setImportStatus('loading');
    setImportProgress(0);

    try {
      // Simulate progress while API call is running
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Call the actual API
      const result = await importGamesFromText(gameNames);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      // Store results for display
      setImportResults(result);
      setImportStatus('success');
      
    } catch (error) {
      setImportProgress(0);
      setImportStatus('error');
      setImportMessage(`Error during import: ${error.message}`);
    }
  };

  // Handle Text Import - create completed requests
  const handleTextImport = async () => {
    if (!textImportInput.trim()) {
      setImportStatus('error');
      setImportMessage('Please enter some games to import.');
      return;
    }

    setImportStatus('loading');
    setImportProgress(0);
    setImportMessage('Creating completed requests from text input...');

    // Parse input - nur Line-by-Line Format
    const gameNames = textImportInput.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (gameNames.length === 0) {
      setImportStatus('error');
      setImportMessage('No valid game names found in input.');
      return;
    }

    try {
      // Simulate progress while API call is running
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Call the actual API
      const result = await importGamesFromText(gameNames);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      // Store results for display
      setImportResults(result);
      setImportStatus('success');
      
      // Keep only failed games in the text input
      const failedGameNames = result.failed_games.map(game => game.name);
      setTextImportInput(failedGameNames.join('\n'));
      
    } catch (error) {
      setImportProgress(0);
      setImportStatus('error');
      setImportMessage(`Error during import: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">Library Import</h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Paste your backlog or curate it with smart search. Every imported title becomes a completed request, keeping your library and request history in sync without external connectors.
          </p>
        </div>

        {/* Text Import Focus */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700/60">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <h2 className="text-2xl font-bold text-white">Text Import</h2>
                  <p className="text-sm text-gray-400">Quickly add dozens of titles at once or curate one by one.</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-gray-700/60 px-3 py-1 rounded-full border border-gray-600/60">
                <span className="h-2 w-2 rounded-full bg-green-400"></span>
                Ready for bulk import
              </div>
            </div>

            {/* Import Mode Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setImportMode('bulk')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  importMode === 'bulk'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                📄 Bulk Import
              </button>
              <button
                onClick={() => setImportMode('smart')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  importMode === 'smart'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                🎯 Smart Import
              </button>
            </div>

            {/* Bulk Import Mode */}
            {importMode === 'bulk' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Game List (one title per line)
                    </label>
                    <textarea
                      value={textImportInput}
                      onChange={(e) => setTextImportInput(e.target.value)}
                      className="w-full h-64 px-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                      placeholder={`The Witcher 3: Wild Hunt\nCyberpunk 2077\nRed Dead Redemption 2\nGrand Theft Auto V\nElden Ring`}
                    />
                  </div>
                  <div className="bg-gray-700/60 border border-gray-600/60 rounded-lg p-4 text-sm text-gray-300 space-y-2">
                    <div className="flex items-center gap-2 text-white font-semibold text-base">
                      <span>✅</span> Import tips
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>One game per line, keep names clean.</li>
                      <li>We match via IGDB; include subtitles if needed.</li>
                      <li>Failed titles stay in the box for a quick retry.</li>
                    </ul>
                    <div className="pt-2 text-xs text-gray-400 border-t border-gray-600/60">
                      Each successful line becomes a completed request so your history stays consistent.
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleTextImport}
                    disabled={!textImportInput.trim() || importStatus === 'loading'}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>🚀</span> Create Completed Requests
                  </button>
                  <button
                    onClick={() => setTextImportInput('')}
                    disabled={!textImportInput.trim() || importStatus === 'loading'}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg transition-colors"
                  >
                    Clear list
                  </button>
                </div>
              </div>
            )}

            {/* Smart Import Mode */}
            {importMode === 'smart' && (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-300 mb-2">
                    Add games individually with autocomplete suggestions from IGDB. Perfect for small batches or curated picks.
                  </p>
                </div>
                
                <SmartGameImport 
                  onImport={handleSmartImport}
                  disabled={importStatus === 'loading'}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700/60">
              <h3 className="text-lg font-semibold text-white mb-2">What happens after import?</h3>
              <p className="text-sm text-gray-300 mb-3">
                Each matched title is added as a completed request. You can still edit or re-request it later. Failed matches remain in the textbox so you can tweak the name and retry.
              </p>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">•</span>
                  Duplicates are skipped by the API if already present.
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">•</span>
                  Progress updates show while IGDB lookups run.
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">•</span>
                  Partial successes still save the matches that worked.
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700/60">
              <h3 className="text-lg font-semibold text-white mb-2">Need a lighter touch?</h3>
              <p className="text-sm text-gray-300 mb-3">
                Use Smart Import for a handful of games with autocomplete and manual confirmation before creating completed requests.
              </p>
              <div className="text-xs text-gray-400">Switch modes above to try it.</div>
            </div>
          </div>
        </div>

        {/* Import Progress and Status */}
        {importStatus === 'loading' && (
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
              <span className="text-blue-300">
                Importing games... {importProgress}% complete
              </span>
            </div>
            <div className="mt-2 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {importStatus === 'success' && importResults && (
          <div className={`rounded-lg p-4 mb-8 ${
            importResults.successful_imports === importResults.total_games 
              ? 'bg-green-600/20 border border-green-500/30' // All successful - green
              : importResults.successful_imports > 0 
                ? 'bg-yellow-600/20 border border-yellow-500/30' // Partially successful - yellow
                : 'bg-red-600/20 border border-red-500/30' // None successful - red
          }`}>
            <div className="flex items-center space-x-3">
              <span className={`text-lg ${
                importResults.successful_imports === importResults.total_games 
                  ? 'text-green-400' 
                  : importResults.successful_imports > 0 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
              }`}>
                {importResults.successful_imports === importResults.total_games 
                  ? '✅' 
                  : importResults.successful_imports > 0 
                    ? '⚠️' 
                    : '❌'}
              </span>
              <span className={`font-medium ${
                importResults.successful_imports === importResults.total_games 
                  ? 'text-green-300' 
                  : importResults.successful_imports > 0 
                    ? 'text-yellow-300' 
                    : 'text-red-300'
              }`}>
                {importResults.successful_imports === importResults.total_games 
                  ? `Successfully imported all ${importResults.total_games} games!`
                  : importResults.successful_imports > 0 
                    ? `Successfully imported ${importResults.successful_imports} out of ${importResults.total_games} games!`
                    : `Failed to import any games. ${importResults.failed_imports} games could not be imported.`}
              </span>
            </div>
          </div>
        )}

        {importStatus === 'error' && (
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 mb-8">
            <div className="flex items-center space-x-3">
              <span className="text-red-400 text-lg">❌</span>
              <span className="text-red-300 font-medium">{importMessage}</span>
            </div>
          </div>
        )}

        {/* Import Results */}
        {importResults && importStatus === 'success' && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Import Results</h3>
            
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{importResults.successful_imports}</div>
                <div className="text-green-300 text-sm">Successfully Imported</div>
              </div>
              <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{importResults.failed_imports}</div>
                <div className="text-red-300 text-sm">Failed</div>
              </div>
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{importResults.total_games}</div>
                <div className="text-blue-300 text-sm">Total Processed</div>
              </div>
            </div>

            {/* Successful Imports */}
            {importResults.imported_games.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-green-400 mb-3">✅ Successfully Imported:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {importResults.imported_games.map((game, index) => (
                    <div key={index} className="bg-green-600/10 border border-green-500/30 rounded-lg p-3">
                      <div className="font-medium text-white">{game.igdb_name}</div>
                      {game.original_name !== game.igdb_name && (
                        <div className="text-xs text-gray-400">Original: {game.original_name}</div>
                      )}
                      {game.genres && (
                        <div className="text-xs text-green-300 mt-1">{game.genres}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Imports */}
            {importResults.failed_games.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-red-400 mb-3">❌ Failed to Import:</h4>
                <div className="space-y-2">
                  {importResults.failed_games.map((game, index) => (
                    <div key={index} className="bg-red-600/10 border border-red-500/30 rounded-lg p-3">
                      <div className="font-medium text-white">{game.name}</div>
                      <div className="text-sm text-red-300">{game.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => setImportResults(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close Results
              </button>
            </div>
          </div>
        )}

        {/* Import Progress */}
        {importStatus === 'loading' && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">Importing library...</span>
              <span className="text-gray-400">{importProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

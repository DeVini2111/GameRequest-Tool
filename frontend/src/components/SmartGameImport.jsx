import React, { useState } from 'react';
import GameAutocomplete from './GameAutocomplete';

const SmartGameInput = ({ 
  value = '', 
  onChange, 
  onRemove, 
  placeholder = 'Enter game name...', 
  showRemove = true,
  className = '' 
}) => {
  const [inputValue, setInputValue] = useState(value);

  const handleInputChange = (newValue) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleGameSelect = (game) => {
    setInputValue(game.name);
    onChange(game.name);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1">
        <GameAutocomplete
          value={inputValue}
          onChange={handleInputChange}
          onSelect={handleGameSelect}
          placeholder={placeholder}
          showDetails={true}
          maxSuggestions={5}
        />
      </div>
      
      {showRemove && (
        <button
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
          title="Remove this game"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

const SmartGameImport = ({ onImport, disabled = false }) => {
  const [gameInputs, setGameInputs] = useState(['']);

  const handleInputChange = (index, value) => {
    const newInputs = [...gameInputs];
    newInputs[index] = value;
    setGameInputs(newInputs);
  };

  const addGameInput = () => {
    setGameInputs([...gameInputs, '']);
  };

  const removeGameInput = (index) => {
    if (gameInputs.length > 1) {
      const newInputs = gameInputs.filter((_, i) => i !== index);
      setGameInputs(newInputs);
    }
  };

  const handleImport = () => {
    const gameNames = gameInputs.filter(name => name.trim().length > 0);
    if (gameNames.length > 0) {
      onImport(gameNames);
      // Clear inputs after import
      setGameInputs(['']);
    }
  };

  const hasValidGames = gameInputs.some(name => name.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {gameInputs.map((game, index) => (
          <SmartGameInput
            key={index}
            value={game}
            onChange={(value) => handleInputChange(index, value)}
            onRemove={() => removeGameInput(index)}
            placeholder={`Game ${index + 1} name...`}
            showRemove={gameInputs.length > 1}
          />
        ))}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={addGameInput}
          className="flex items-center gap-2 px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Another Game
        </button>

        <button
          onClick={handleImport}
          disabled={disabled || !hasValidGames}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
        >
          Import {gameInputs.filter(name => name.trim().length > 0).length} Games
        </button>
      </div>

      {hasValidGames && (
        <div className="text-xs text-gray-400">
          💡 Games will be created as completed requests in your system
        </div>
      )}
    </div>
  );
};

export default SmartGameImport;

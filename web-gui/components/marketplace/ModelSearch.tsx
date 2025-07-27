import React, { useState, useRef } from 'react';

interface ModelSearchProps {
  onSearchLocal: (query: string) => void;
  onSearchExternal: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

const ModelSearch: React.FC<ModelSearchProps> = ({
  onSearchLocal,
  onSearchExternal,
  placeholder = 'Search models...',
  defaultValue = '',
  className = ''
}) => {
  const [query, setQuery] = useState(defaultValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Auto-search local models as user types (debounced)
    if (value.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      onSearchLocal('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      onSearchLocal(query.trim());
      setShowSuggestions(false);
    } else {
      onSearchLocal('');
    }
  };

  const handleExternalSearch = () => {
    if (query.trim()) {
      onSearchExternal(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearchLocal('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const suggestions = [
    { text: 'code completion', category: 'Code Generation' },
    { text: 'chat assistant', category: 'Chat' },
    { text: 'text analysis', category: 'Analysis' },
    { text: 'creative writing', category: 'Creative Writing' },
    { text: 'image generation', category: 'Image Generation' },
    { text: 'question answering', category: 'Domain Specific' }
  ];

  const filteredSuggestions = suggestions.filter(s => 
    s.text.toLowerCase().includes(query.toLowerCase()) && 
    query.length > 0
  );

  return (
    <div className={`model-search relative ${className}`}>
      <div className="flex items-center space-x-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-muted-foreground">🔍</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onFocus={() => query.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          
          {/* Clear Button */}
          {query && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}

          {/* Search Suggestions */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50">
              <div className="py-2">
                {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(suggestion.text);
                      onSearchLocal(suggestion.text);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{suggestion.text}</span>
                      <span className="text-xs text-muted-foreground">{suggestion.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Buttons */}
        <button
          onClick={handleSearch}
          className="px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Search Local
        </button>
        
        <button
          onClick={handleExternalSearch}
          disabled={!query.trim()}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Search Hugging Face
        </button>
      </div>

      {/* Search Tips */}
      {!query && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span>💡 Tips: Search for model names, descriptions, or tags. Try "code", "chat", "creative", or "analysis"</span>
        </div>
      )}

      {/* Advanced Search Options */}
      {query && (
        <div className="mt-2 flex items-center space-x-4 text-xs">
          <button
            onClick={() => onSearchLocal(query + ' tag:multilingual')}
            className="text-blue-600 hover:text-blue-800"
          >
            + Multilingual
          </button>
          <button
            onClick={() => onSearchLocal(query + ' tag:fast')}
            className="text-green-600 hover:text-green-800"
          >
            + Fast Models
          </button>
          <button
            onClick={() => onSearchLocal(query + ' tag:quantized')}
            className="text-purple-600 hover:text-purple-800"
          >
            + Quantized
          </button>
        </div>
      )}
    </div>
  );
};

export default ModelSearch;
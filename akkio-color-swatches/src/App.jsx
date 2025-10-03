/**
 * Main App Component
 *
 * Orchestrates the Color Swatches application, managing state and coordinating
 * between the Controls and ColorGrid components. Implements efficient API
 * call strategy with error handling.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import Controls from './components/Controls';
import ColorGrid from './components/ColorGrid';
import { fetchDistinctColors } from './services/colorApi';
import './App.css';

function App() {
  const [colors, setColors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Handle changes from the Controls component (debounced)
  const handleValuesChange = useCallback(async ({ saturation, lightness }) => {
    // Validate inputs
    if (saturation === undefined || lightness === undefined) {
      console.warn('Invalid input values:', { saturation, lightness });
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      // Use optimized adaptive fetching strategy with abort support
      // This intelligently samples the color space and only fetches what's needed
      const distinctColors = await fetchDistinctColors(
        saturation,
        lightness,
        abortController.signal
      );

      // Check if this request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      if (!distinctColors || !Array.isArray(distinctColors)) {
        throw new Error('Invalid color data received from API');
      }

      setColors(distinctColors);
      setError(null); // Clear any previous errors
    } catch (err) {
      // Ignore abort errors - they're expected when user changes values quickly
      if (err.name === 'AbortError') {
        return;
      }

      console.error('Failed to fetch colors:', err);

      // Provide user-friendly error messages
      let errorMessage = 'Failed to load colors. ';
      if (err.message.includes('Failed to fetch')) {
        errorMessage += 'Please check your internet connection and try again.';
      } else if (err.message.includes('CORS')) {
        errorMessage += 'There was an issue connecting to the color service. Please try again.';
      } else {
        errorMessage += err.message || 'Please try again.';
      }

      setError(errorMessage);
    } finally {
      // Only clear loading if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load initial colors on mount
  useEffect(() => {
    handleValuesChange({ saturation: 50, lightness: 50 });
  }, [handleValuesChange]);

  return (
    <ErrorBoundary>
      <div className="app">
        <Controls onValuesChange={handleValuesChange} isLoading={isLoading} />

        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="error-dismiss"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <ColorGrid colors={colors} isLoading={isLoading} />
      </div>
    </ErrorBoundary>
  );
}

export default App;

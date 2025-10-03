/**
 * Controls Component
 *
 * Provides input controls for Saturation and Lightness with debouncing
 * to minimize API calls while maintaining responsive UI
 */

import { useState, useEffect, useRef } from 'react';
import './Controls.css';

const DEBOUNCE_DELAY = 500; // ms

function Controls({ onValuesChange, isLoading }) {
  const [saturation, setSaturation] = useState(50);
  const [lightness, setLightness] = useState(50);

  // Debounce timer ref
  const debounceTimer = useRef(null);

  // Debounced callback to parent component
  useEffect(() => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      onValuesChange({ saturation, lightness });
    }, DEBOUNCE_DELAY);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [saturation, lightness, onValuesChange]);

  const handleSaturationChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setSaturation(value);
  };

  const handleLightnessChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setLightness(value);
  };

  return (
    <div className="controls">
      <div className="controls-header">
        <h1>Color Swatches</h1>
        <p className="subtitle">Explore the HSL color spectrum</p>
      </div>

      <div className="controls-grid">
        {/* Saturation Control */}
        <div className="control-group">
          <label htmlFor="saturation">
            <span className="label-text">Saturation</span>
            <span className="label-value">{saturation}%</span>
          </label>
          <div className="input-group">
            <input
              id="saturation"
              type="range"
              min="0"
              max="100"
              value={saturation}
              onChange={handleSaturationChange}
              className="slider"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={saturation}
              onChange={handleSaturationChange}
              className="number-input"
            />
          </div>
        </div>

        {/* Lightness Control */}
        <div className="control-group">
          <label htmlFor="lightness">
            <span className="label-text">Lightness</span>
            <span className="label-value">{lightness}%</span>
          </label>
          <div className="input-group">
            <input
              id="lightness"
              type="range"
              min="0"
              max="100"
              value={lightness}
              onChange={handleLightnessChange}
              className="slider"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={lightness}
              onChange={handleLightnessChange}
              className="number-input"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

export default Controls;

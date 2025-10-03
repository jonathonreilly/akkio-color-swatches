/**
 * ColorGrid Component
 *
 * Displays a responsive grid of color swatches using virtualization
 * for optimal performance with large numbers of colors
 */

import { useState, useEffect, useMemo } from 'react';
import { Grid } from 'react-window';
import ColorSwatch from './ColorSwatch';
import './ColorGrid.css';

function ColorGrid({ colors, isLoading = false }) {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 180, // Account for header/controls
  });

  // Keep track of previous valid rowCount to prevent height jumping
  const [stableRowCount, setStableRowCount] = useState(1);

  // CRITICAL: Ensure colors is always an array and never null/undefined
  const safeColors = Array.isArray(colors) ? colors : [];

  // Early return if colors is null, undefined, or not an array
  if (!colors) {
    return (
      <div className="empty-state">
        <p>Loading colors...</p>
      </div>
    );
  }

  // Calculate grid layout based on window size
  const { columnCount, columnWidth, rowHeight } = useMemo(() => {
    const width = dimensions.width;
    const padding = 32; // Total horizontal padding
    const gap = 16; // Gap between items

    // Determine optimal column count based on viewport width
    let cols;
    if (width < 640) {
      cols = 2; // Mobile
    } else if (width < 1024) {
      cols = 3; // Tablet
    } else if (width < 1280) {
      cols = 4; // Small desktop
    } else if (width < 1536) {
      cols = 5; // Medium desktop
    } else {
      cols = 6; // Large desktop
    }

    const availableWidth = width - padding;
    const colWidth = (availableWidth - (gap * (cols - 1))) / cols;

    return {
      columnCount: cols,
      columnWidth: colWidth + gap,
      rowHeight: colWidth + 100 + gap, // Square preview + info section + gap
    };
  }, [dimensions.width]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 180,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate row count
  const rowCount = Math.max(1, Math.ceil(safeColors.length / columnCount));

  // Update stable row count only when not loading
  useEffect(() => {
    if (!isLoading && rowCount > 0) {
      setStableRowCount(rowCount);
    }
  }, [rowCount, isLoading]);

  // Cell renderer for react-window
  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * columnCount + columnIndex;
    const color = safeColors[index];

    if (index >= safeColors.length || !color) {
      return null;
    }

    return (
      <div style={style}>
        <div className="grid-item-wrapper">
          <ColorSwatch color={color} isLoading={false} />
        </div>
      </div>
    );
  };

  // Show loading state
  if (isLoading && safeColors.length === 0) {
    return (
      <div className="loading-state">
        <div className="loading-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <ColorSwatch key={i} color={null} isLoading={true} />
          ))}
        </div>
      </div>
    );
  }

  // Show empty state
  if (safeColors.length === 0 && !isLoading) {
    return (
      <div className="empty-state">
        <p>Adjust the Saturation and Lightness values to see colors</p>
      </div>
    );
  }

  // Final safety check before rendering Grid
  if (!safeColors || safeColors.length === 0) {
    return (
      <div className="empty-state">
        <p>No colors to display</p>
      </div>
    );
  }

  return (
    <div className="color-grid-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading colors...</div>
            <div className="loading-subtext">Discovering distinct hues</div>
          </div>
        </div>
      )}
      <Grid
        cellComponent={Cell}
        cellProps={{}}
        columnCount={columnCount}
        columnWidth={columnWidth}
        defaultHeight={dimensions.height}
        rowCount={isLoading ? stableRowCount : rowCount}
        rowHeight={rowHeight}
        defaultWidth={dimensions.width}
        className="color-grid"
      />
    </div>
  );
}

export default ColorGrid;

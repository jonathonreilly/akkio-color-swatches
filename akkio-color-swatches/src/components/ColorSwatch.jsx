/**
 * ColorSwatch Component
 *
 * Displays a single color swatch with its name and RGB values
 */

import './ColorSwatch.css';

function ColorSwatch({ color, isLoading }) {
  if (isLoading) {
    return (
      <div className="color-swatch loading">
        <div className="color-preview skeleton"></div>
        <div className="color-info">
          <div className="skeleton-text"></div>
          <div className="skeleton-text"></div>
        </div>
      </div>
    );
  }

  if (!color) {
    return null;
  }

  const { rgb, name, hue, hex } = color;
  const colorName = name || 'Unnamed';

  // Calculate contrasting text color for better readability
  const brightness = (rgb.red * 299 + rgb.green * 587 + rgb.blue * 114) / 1000;
  const textColor = brightness > 128 ? '#000000' : '#ffffff';

  return (
    <div className="color-swatch">
      <div
        className="color-preview"
        style={{
          backgroundColor: `rgb(${rgb.red}, ${rgb.green}, ${rgb.blue})`,
          color: textColor,
        }}
        title={`Hue: ${hue}°`}
      >
        <span className="hue-label">{hue}°</span>
      </div>
      <div className="color-info">
        <div className="color-name" title={colorName}>
          {colorName}
        </div>
        <div className="color-rgb">
          RGB({rgb.red}, {rgb.green}, {rgb.blue})
        </div>
        <div className="color-hex">{hex}</div>
      </div>
    </div>
  );
}

export default ColorSwatch;

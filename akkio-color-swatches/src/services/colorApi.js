/**
 * Color API Service
 *
 * Handles fetching color data from The Color API (thecolorapi.com) with caching
 * to minimize API calls and improve performance.
 */

// The Color API - handles CORS properly, no proxy needed
const API_BASE = 'https://www.thecolorapi.com';
const cache = new Map();

/**
 * Fetches color data for a given HSL value
 * @param {number} hue - Hue value (0-360)
 * @param {number} saturation - Saturation percentage (0-100)
 * @param {number} lightness - Lightness percentage (0-100)
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<Object>} Color data including RGB values and color name
 */
export async function fetchColorData(hue, saturation, lightness, signal = null) {
  const cacheKey = `${hue},${saturation},${lightness}`;

  // Return cached result if available
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    // The Color API format: /id?hsl=h,s,l
    const url = `${API_BASE}/id?hsl=${hue},${saturation},${lightness}`;

    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Validate data structure (The Color API structure)
    if (!data || !data.rgb || !data.name) {
      throw new Error('Invalid API response structure');
    }

    // Extract relevant data
    const colorData = {
      hue,
      saturation,
      lightness,
      name: data.name.value || 'Unnamed',
      rgb: {
        red: data.rgb.r,
        green: data.rgb.g,
        blue: data.rgb.b,
      },
      hex: data.hex.value,
      hsl: data.hsl.value,
    };

    // Cache the result
    cache.set(cacheKey, colorData);

    return colorData;
  } catch (error) {
    // Don't log abort errors - they're expected
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('Error fetching color data:', error);
    throw error;
  }
}

/**
 * Optimized adaptive fetching strategy that minimizes API calls
 * Strategy:
 * 1. Start with coarse sampling (every 10 degrees)
 * 2. Track distinct color names found
 * 3. Fill in gaps between colors with different names
 * 4. Stop early if no new names found for a while
 *
 * @param {number} saturation - Saturation percentage
 * @param {number} lightness - Lightness percentage
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<Object[]>} Array of color data objects with distinct names
 */
export async function fetchDistinctColors(saturation, lightness, signal = null) {
  const BATCH_SIZE = 20; // Increased for faster parallel processing
  const distinctColors = [];
  const seenNames = new Set();
  const colorsByHue = new Map(); // Track all fetched colors by hue

  // Helper to fetch and process a batch
  async function fetchBatch(hues) {
    const batch = [];
    for (const hue of hues) {
      const cacheKey = `${hue},${saturation},${lightness}`;
      if (!cache.has(cacheKey)) {
        batch.push(hue);
      } else {
        // Already cached, process immediately
        const cached = cache.get(cacheKey);
        colorsByHue.set(hue, cached);
      }
    }

    if (batch.length === 0) return;

    // Fetch uncached colors in parallel with abort support
    const results = [];
    for (let i = 0; i < batch.length; i += BATCH_SIZE) {
      const chunk = batch.slice(i, i + BATCH_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(hue => fetchColorData(hue, saturation, lightness, signal))
      );
      results.push(...chunkResults);
    }

    // Store in map
    results.forEach(color => colorsByHue.set(color.hue, color));
  }

  // Phase 1: Coarse sampling (every 10 degrees = 36 API calls max)
  const coarseHues = [];
  for (let h = 0; h < 360; h += 10) {
    coarseHues.push(h);
  }
  await fetchBatch(coarseHues);

  // Phase 2: Find boundaries where color names change
  const boundaryRanges = [];
  for (let i = 0; i < coarseHues.length; i++) {
    const currentHue = coarseHues[i];
    const nextHue = coarseHues[(i + 1) % coarseHues.length];

    const currentColor = colorsByHue.get(currentHue);
    const nextColor = colorsByHue.get(nextHue);

    if (currentColor && nextColor &&
        currentColor.name !== 'Unnamed' &&
        currentColor.name !== nextColor.name) {
      // Names differ - there's a boundary in this range
      boundaryRanges.push({ start: currentHue, end: nextHue });
    }
  }

  // Phase 3: Binary search within boundary ranges to find exact transition points
  for (const range of boundaryRanges) {
    const fillHues = [];
    let start = range.start;
    let end = range.end;

    // Handle wrapping at 360
    if (end < start) end += 360;

    // Sample every degree in boundary ranges (max ~10 calls per range)
    for (let h = start + 1; h < end; h++) {
      fillHues.push(h % 360);
    }

    if (fillHues.length > 0) {
      await fetchBatch(fillHues);
    }
  }

  // Phase 4: Collect all distinct colors
  const sortedHues = Array.from(colorsByHue.keys()).sort((a, b) => a - b);

  for (const hue of sortedHues) {
    const color = colorsByHue.get(hue);

    // Skip unnamed colors
    if (!color.name || color.name === 'Unnamed') {
      continue;
    }

    // Only add if we haven't seen this name before
    if (!seenNames.has(color.name)) {
      seenNames.add(color.name);
      distinctColors.push(color);
    }
  }

  console.log(`✅ Fetched ${distinctColors.length} distinct colors with ~${boundaryRanges.length * 10 + 36} API calls (instead of 360)`);

  return distinctColors;
}

/**
 * Batch fetches color data for multiple hues with a single S/L value
 * Uses parallel requests but with controlled concurrency to avoid overwhelming the API
 * @param {number[]} hues - Array of hue values
 * @param {number} saturation - Saturation percentage
 * @param {number} lightness - Lightness percentage
 * @returns {Promise<Object[]>} Array of color data objects
 */
export async function fetchMultipleColors(hues, saturation, lightness) {
  const BATCH_SIZE = 20; // Increased from 10 for faster processing
  const results = [];

  for (let i = 0; i < hues.length; i += BATCH_SIZE) {
    const batch = hues.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(hue => fetchColorData(hue, saturation, lightness))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Generates an array of evenly distributed hue values
 * @param {number} count - Number of hues to generate
 * @returns {number[]} Array of hue values (0-359)
 */
export function generateHues(count = 360) {
  const hues = [];
  const step = 360 / count;

  for (let i = 0; i < count; i++) {
    hues.push(Math.round(i * step) % 360);
  }

  return hues;
}

/**
 * Checks if all colors for given hues are already cached
 * @param {number[]} hues - Array of hue values
 * @param {number} saturation - Saturation percentage
 * @param {number} lightness - Lightness percentage
 * @returns {boolean} True if all colors are cached
 */
export function areAllColorsCached(hues, saturation, lightness) {
  return hues.every(hue => {
    const cacheKey = `${hue},${saturation},${lightness}`;
    return cache.has(cacheKey);
  });
}

/**
 * Clears the color data cache
 */
export function clearCache() {
  cache.clear();
}

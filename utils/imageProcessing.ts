/**
 * Checks if two colors match within a certain tolerance.
 */
function colorsMatch(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
  tolerance: number
): boolean {
  const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
  return diff < (tolerance * 3 * 2.55); // Tolerance is 0-100, maps to byte diff
}

/**
 * Applies a simple box blur to the alpha channel to smooth edges.
 */
function applyAlphaSmoothing(data: Uint8ClampedArray, width: number, height: number, strength: number) {
  if (strength <= 0) return;

  // We need a copy to read from while writing to the original
  const originalData = new Uint8ClampedArray(data);

  const passes = Math.ceil(strength / 2); // Map 0-10 to 0-5 passes

  for (let p = 0; p < passes; p++) {
    // Read from current state (data), write to buffer, then swap? 
    // For simplicity in single pass JS, we can just read neighbors from originalData
    // But to propagate blur, iterative is better.
    // Let's just do a single pass 3x3 kernel weighted by strength for performance
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Skip fully transparent pixels that are far from edge (optimization)
        // If current is 0 and all neighbors are 0, skip.
        // But for smoothing 'sharp' edges, we care about the boundary.
        
        const alpha = originalData[idx + 3];
        
        // Simple 3x3 Box Blur on Alpha
        let sumAlpha = 0;
        let count = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
             const nIdx = ((y + dy) * width + (x + dx)) * 4;
             sumAlpha += originalData[nIdx + 3];
             count++;
          }
        }
        
        const avgAlpha = sumAlpha / count;
        
        // Blend current alpha with average alpha based on strength
        // Simple blend: new = avg
        data[idx + 3] = avgAlpha;
      }
    }
    
    // Update originalData for next pass if needed (not strictly necessary for simple blur but better)
    if (p < passes - 1) {
        originalData.set(data);
    }
  }
}

/**
 * Smart Background Removal Algorithm
 * 1. Scans corners to find dominant background color.
 * 2. Performs a flood fill from edges to remove background.
 * 3. Optionally smoothes the alpha channel.
 */
export const removeBackgroundSmart = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tolerance: number = 20,
  smoothing: number = 0
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const visited = new Uint8Array(width * height); // 0 = unvisited, 1 = visited

  // Helper to get pixel index
  const getIdx = (x: number, y: number) => (y * width + x) * 4;

  // 1. Identify Background Color Candidates (Corners)
  const corners = [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: 0, y: height - 1 },
    { x: width - 1, y: height - 1 }
  ];

  const queue: { x: number, y: number }[] = [];

  // Initialize queue with valid corners
  corners.forEach(p => {
    queue.push(p);
  });

  // Get Reference Color from Top-Left (Primary assumption)
  const idx0 = getIdx(0, 0);
  const bgR = data[idx0];
  const bgG = data[idx0 + 1];
  const bgB = data[idx0 + 2];

  // Flood Fill (BFS)
  while (queue.length > 0) {
    const { x, y } = queue.pop()!;
    const pixelIndex = y * width + x;

    if (visited[pixelIndex]) continue;
    visited[pixelIndex] = 1;

    const dataIdx = pixelIndex * 4;
    const r = data[dataIdx];
    const g = data[dataIdx + 1];
    const b = data[dataIdx + 2];

    // Check if current pixel matches the starting background color
    if (colorsMatch(r, g, b, bgR, bgG, bgB, tolerance)) {
      // Make transparent
      data[dataIdx + 3] = 0;

      // Add neighbors
      if (x > 0) queue.push({ x: x - 1, y });
      if (x < width - 1) queue.push({ x: x + 1, y });
      if (y > 0) queue.push({ x, y: y - 1 });
      if (y < height - 1) queue.push({ x, y: y + 1 });
    }
  }

  // Apply Smoothing if requested
  if (smoothing > 0) {
    applyAlphaSmoothing(data, width, height, smoothing);
  }

  // Put data back
  ctx.putImageData(imageData, 0, 0);
};

export const applyManualEraser = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
) => {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { removeBackgroundSmart } from '../utils/imageProcessing';

interface WorkspaceProps {
  originalImage: HTMLImageElement;
  brushSize: number;
  tolerance: number;
  smoothing: number;
  triggerAutoRemove: number;
  triggerUndo: number;
  triggerManualApply: number;
  manualMaskPreview: boolean; // TRUE = Preview Result, FALSE = Show Red Mask
  processedImageOverride: string | null;
  onProcessedImageUpdate: (dataUrl: string) => void;
}

const ImageWorkspace: React.FC<WorkspaceProps> = ({
  originalImage,
  brushSize,
  tolerance,
  smoothing,
  triggerAutoRemove,
  triggerUndo,
  triggerManualApply,
  manualMaskPreview,
  processedImageOverride,
  onProcessedImageUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Backing Canvases (Layers)
  const baseLayerRef = useRef<HTMLCanvasElement | null>(null); // Committed processed image
  const maskLayerRef = useRef<HTMLCanvasElement | null>(null); // Current manual strokes (Red)

  const historyRef = useRef<ImageData[]>([]);
  
  // State
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const [showCursor, setShowCursor] = useState(false);
  
  // --- Render Loop ---
  const renderCanvas = useCallback(() => {
     if (!displayCanvasRef.current || !baseLayerRef.current || !maskLayerRef.current) return;
     const ctx = displayCanvasRef.current.getContext('2d');
     if (!ctx) return;

     const w = displayCanvasRef.current.width;
     const h = displayCanvasRef.current.height;

     ctx.clearRect(0, 0, w, h);

     // 1. Draw Base Layer (The current processed image)
     ctx.globalCompositeOperation = 'source-over';
     ctx.drawImage(baseLayerRef.current, 0, 0);

     // 2. Draw Mask Layer based on mode
     if (manualMaskPreview) {
        // Preview Mode: The mask acts as an eraser to show the final result
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskLayerRef.current, 0, 0);
     } else {
        // Edit Mode: The mask is shown as a semi-transparent red overlay
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.6; // Transparency
        ctx.drawImage(maskLayerRef.current, 0, 0);
        ctx.globalAlpha = 1.0;
     }
     
     // Reset GCO
     ctx.globalCompositeOperation = 'source-over';

  }, [manualMaskPreview]);

  // --- Initialization ---
  useEffect(() => {
    if (!originalImage || !containerRef.current || !displayCanvasRef.current) return;

    // Create Offscreen Layers
    const w = originalImage.width;
    const h = originalImage.height;

    // Base Layer
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = w;
    baseCanvas.height = h;
    const baseCtx = baseCanvas.getContext('2d');
    baseCtx?.drawImage(originalImage, 0, 0);
    baseLayerRef.current = baseCanvas;

    // Mask Layer
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    maskLayerRef.current = maskCanvas;

    // Display Canvas
    displayCanvasRef.current.width = w;
    displayCanvasRef.current.height = h;

    // Reset History
    if (baseCtx) {
       historyRef.current = [baseCtx.getImageData(0, 0, w, h)];
    }

    // Calc Scale
    const fitScale = Math.min(
      containerRef.current.clientWidth / w,
      containerRef.current.clientHeight / h
    );
    setScale(fitScale * 0.9);

    renderCanvas();
    onProcessedImageUpdate(baseCanvas.toDataURL('image/png'));
  }, [originalImage]);

  // --- Rerender when preview mode changes ---
  useEffect(() => {
     renderCanvas();
  }, [manualMaskPreview, renderCanvas]);


  // --- Handle AI Override ---
  useEffect(() => {
    if (processedImageOverride && baseLayerRef.current) {
        const img = new Image();
        img.onload = () => {
            const ctx = baseLayerRef.current!.getContext('2d');
            const w = baseLayerRef.current!.width;
            const h = baseLayerRef.current!.height;
            
            // Allow resizing if AI image is different? Assuming same size for now or scaling
            ctx?.clearRect(0, 0, w, h);
            ctx?.drawImage(img, 0, 0, w, h);
            
            // Clear mask
            const maskCtx = maskLayerRef.current?.getContext('2d');
            maskCtx?.clearRect(0, 0, w, h);

            // Update History
            if (ctx) historyRef.current = [ctx.getImageData(0, 0, w, h)];

            renderCanvas();
            onProcessedImageUpdate(baseLayerRef.current!.toDataURL('image/png'));
        };
        img.src = processedImageOverride;
    }
  }, [processedImageOverride]);

  // --- Handle Auto Remove ---
  useEffect(() => {
    if (triggerAutoRemove === 0 || !originalImage || !baseLayerRef.current) return;
    
    const ctx = baseLayerRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const w = baseLayerRef.current.width;
    const h = baseLayerRef.current.height;

    // Reset to original before algo
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(originalImage, 0, 0);

    removeBackgroundSmart(ctx, w, h, tolerance, smoothing);
    
    // Clear mask on auto-remove? Yes, usually start fresh.
    const maskCtx = maskLayerRef.current?.getContext('2d');
    maskCtx?.clearRect(0, 0, w, h);

    // Save history
    historyRef.current = [ctx.getImageData(0, 0, w, h)];

    renderCanvas();
    onProcessedImageUpdate(baseLayerRef.current.toDataURL('image/png'));

  }, [triggerAutoRemove, originalImage, tolerance, smoothing]);

  // --- Handle Undo ---
  useEffect(() => {
     if (triggerUndo === 0 || !baseLayerRef.current) return;
     
     if (historyRef.current.length > 0) {
        // Pop last state? If we want undo, we go back to previous.
        // Current state is history[length-1]. 
        // We need to pop current, and use the one before.
        if (historyRef.current.length > 1) {
            historyRef.current.pop(); // Remove current
            const prevState = historyRef.current[historyRef.current.length - 1];
            
            const ctx = baseLayerRef.current.getContext('2d');
            ctx?.putImageData(prevState, 0, 0);
            
            // We do NOT clear mask on Undo of base image, unless we track mask history too.
            // For simplicity, let's keep mask. User might want to apply same mask to old state.
            
            renderCanvas();
            onProcessedImageUpdate(baseLayerRef.current.toDataURL('image/png'));
        }
     }
  }, [triggerUndo]);

  // --- Handle Manual Apply ---
  useEffect(() => {
      if (triggerManualApply === 0 || !baseLayerRef.current || !maskLayerRef.current) return;

      const baseCtx = baseLayerRef.current.getContext('2d');
      const maskCtx = maskLayerRef.current.getContext('2d');
      if (!baseCtx || !maskCtx) return;

      // Apply mask to base layer
      baseCtx.globalCompositeOperation = 'destination-out';
      baseCtx.drawImage(maskLayerRef.current, 0, 0);
      baseCtx.globalCompositeOperation = 'source-over'; // Reset

      // Clear mask layer
      maskCtx.clearRect(0, 0, maskLayerRef.current.width, maskLayerRef.current.height);

      // Save new state to history
      historyRef.current.push(baseCtx.getImageData(0, 0, baseLayerRef.current.width, baseLayerRef.current.height));
      if (historyRef.current.length > 20) historyRef.current.shift();

      renderCanvas();
      onProcessedImageUpdate(baseLayerRef.current.toDataURL('image/png'));

  }, [triggerManualApply]);


  // --- Mouse Events for Mask Drawing ---
  const getMousePos = (e: React.MouseEvent) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const drawOnMask = (x: number, y: number) => {
      const ctx = maskLayerRef.current?.getContext('2d');
      if (ctx) {
          ctx.beginPath();
          ctx.arc(x, y, brushSize, 0, Math.PI * 2);
          ctx.fillStyle = '#ff0000'; // Pure red for mask data
          ctx.fill();
          renderCanvas();
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const { x, y } = getMousePos(e);
    drawOnMask(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorX(e.clientX);
    setCursorY(e.clientY);
    if (!isDrawing) return;
    const { x, y } = getMousePos(e);
    drawOnMask(x, y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex-1 flex gap-4 p-6 h-full overflow-hidden bg-gray-900 relative">
      
      {/* Custom Cursor */}
      {showCursor && (
        <div 
          className="fixed pointer-events-none border-2 border-pink-500 rounded-full z-50 bg-pink-500/10"
          style={{
             left: cursorX,
             top: cursorY,
             width: brushSize * 2 * scale,
             height: brushSize * 2 * scale,
             transform: 'translate(-50%, -50%)'
          }}
        ></div>
      )}

      {/* Original Image View */}
      <div className="flex-1 flex flex-col min-w-0">
        <h3 className="text-gray-400 mb-2 font-medium text-center uppercase text-sm tracking-wider">Original</h3>
        <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center p-4 overflow-hidden shadow-inner">
             <img 
                src={originalImage.src} 
                style={{ 
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    maxWidth: 'none',
                    maxHeight: 'none'
                }}
                className="shadow-2xl"
                alt="Original" 
             />
        </div>
      </div>

      {/* Processed Canvas View */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className="text-purple-400 font-medium text-center uppercase text-sm tracking-wider">Output</h3>
            {manualMaskPreview ? (
                <span className="text-[10px] bg-green-900/50 px-2 py-0.5 rounded text-green-300 border border-green-800">Preview Mode</span>
            ) : (
                <span className="text-[10px] bg-pink-900/50 px-2 py-0.5 rounded text-pink-300 border border-pink-800">Editing Mask</span>
            )}
        </div>
        
        <div 
            ref={containerRef}
            className="flex-1 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center p-4 overflow-hidden relative shadow-inner"
        >
            <canvas
                ref={displayCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseUp(); setShowCursor(false); }}
                onMouseEnter={() => setShowCursor(true)}
                style={{ 
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                }}
                className="z-10 cursor-none" 
            />
        </div>
      </div>
    </div>
  );
};

export default ImageWorkspace;

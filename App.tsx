import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import Toolbar from './components/Toolbar';
import ImageWorkspace from './components/ImageWorkspace';
import { AppState } from './types';
import { removeBackgroundWithAi } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    originalImage: null,
    processedImage: null,
    fileName: 'ibr-photo',
    isProcessing: false,
    brushSize: 30,
    tolerance: 15,
    smoothing: 0,
    manualMaskPreview: false,
    manualToolMode: 'ADD',
    hasManualEdits: false,
    algorithm: 'FLOOD_FILL',
  });

  const [triggerAutoRemove, setTriggerAutoRemove] = useState(0);
  const [triggerUndo, setTriggerUndo] = useState(0);
  const [triggerManualApply, setTriggerManualApply] = useState(0);
  const [processedImageOverride, setProcessedImageOverride] = useState<string | null>(null);

  const generateTimestampName = () => {
    const d = new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString();
    return `ibr-photo-${yy}${mm}${dd}.${h}${m}${s}${ms}`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setState(prev => ({
            ...prev,
            originalImage: img,
            processedImage: null, // Reset processed
            fileName: generateTimestampName(),
            manualMaskPreview: false,
            manualToolMode: 'ADD',
            hasManualEdits: false,
          }));
          setProcessedImageOverride(null);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoRemove = () => {
    setState(prev => ({ ...prev, isProcessing: true }));
    // Small timeout to let UI show loading state before blocking main thread with canvas ops
    setTimeout(() => {
        setTriggerAutoRemove(prev => prev + 1);
        setProcessedImageOverride(null); // Clear any AI override
        setState(prev => ({ ...prev, isProcessing: false }));
    }, 100);
  };

  const handleAiRemove = async () => {
    if (!state.originalImage) return;
    setState(prev => ({ ...prev, isProcessing: true }));
    
    try {
        const aiResult = await removeBackgroundWithAi(state.originalImage.src);
        if (aiResult) {
            setProcessedImageOverride(aiResult);
        }
    } catch (e) {
        alert("Failed to remove background with AI. Please check API Key or try again.");
    } finally {
        setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleUndo = () => {
      setTriggerUndo(prev => prev + 1);
  };

  const handleManualApply = () => {
      setTriggerManualApply(prev => prev + 1);
  };

  // Keyboard shortcut for Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleProcessedImageUpdate = useCallback((dataUrl: string) => {
    setState(prev => ({ ...prev, processedImage: dataUrl }));
  }, []);

  const handleManualMaskChange = useCallback((hasEdits: boolean) => {
    setState(prev => ({ ...prev, hasManualEdits: hasEdits }));
  }, []);

  const handleDownload = () => {
    if (state.processedImage) {
      const link = document.createElement('a');
      link.download = `${state.fileName}.png`;
      link.href = state.processedImage;
      link.click();
    }
  };

  // Drag and Drop handlers
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
       if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setState(prev => ({
                    ...prev,
                    originalImage: img,
                    processedImage: null,
                    fileName: generateTimestampName(),
                    manualMaskPreview: false,
                    manualToolMode: 'ADD',
                    hasManualEdits: false,
                }));
                setProcessedImageOverride(null);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
  };


  if (!state.originalImage) {
    return (
      <div 
        className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-x-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Background Image & Effects - Fixed to viewport */}
        <div className="fixed inset-0 z-0">
            {/* High quality abstract background */}
            <img 
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
                alt="Abstract Background" 
                className="w-full h-full object-cover opacity-30"
            />
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-950/90 to-gray-950"></div>
        </div>

        {/* Ambient Bloom Effects - Fixed to viewport */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
             <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"></div>
             <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
        </div>

        {/* Content Container - Scrollable */}
        <div className="z-10 w-full max-w-4xl flex flex-col items-center">
            
            {/* Big Header Section */}
            <div className="text-center mb-16 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700 text-xs text-gray-400 mb-6 backdrop-blur-sm shadow-lg">
                    <Sparkles size={12} className="text-yellow-400" />
                    <span>Powered by Gemini 2.5</span>
                </div>
                <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight drop-shadow-2xl">
                    Image Background<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Remover</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 font-light tracking-wide max-w-2xl mx-auto drop-shadow-md">
                    Effortless Precision. Instantly Transparent.
                </p>
            </div>

            {/* Upload Card */}
            <div className={`
                max-w-xl w-full bg-gray-900/60 backdrop-blur-2xl rounded-3xl border border-gray-700/50 p-12 text-center transition-all shadow-2xl relative z-10 group mb-12
                ${isDragging ? 'border-purple-500 bg-gray-800/80 scale-105' : 'hover:border-gray-600 hover:bg-gray-900/70'}
            `}>
                <div className="w-20 h-20 bg-gray-800/50 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-gray-700 group-hover:scale-110 transition-transform duration-300">
                    <ImageIcon className="text-gray-400 w-10 h-10 group-hover:text-white transition-colors" />
                </div>
                
                <h2 className="text-2xl font-semibold text-white mb-2">Upload an Image</h2>
                <p className="text-gray-400 mb-8">
                    Drag & drop your file here, or click to browse.<br/>
                    <span className="text-sm opacity-60">Supports PNG, JPG, WebP</span>
                </p>
                
                <label className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-4 px-10 rounded-xl cursor-pointer transition-all hover:scale-105 shadow-lg shadow-purple-900/20 active:scale-95">
                    <Upload className="w-5 h-5" />
                    <span>Select Image</span>
                    <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                    />
                </label>
            </div>
            
            <div className="text-gray-500 text-sm z-10 pb-8">
                Privacy First • Local Processing Available • AI Enhanced
            </div>
        </div>
      </div>
    );
  }

  // Second Screen: Editor
  // Use fixed inset-0 to prevent body scrolling interfering with canvas interactions
  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 overflow-hidden">
      {/* Minimal Header */}
      <header className="h-14 bg-gray-950 border-b border-gray-800 flex items-center px-6 justify-between shrink-0 z-20 relative">
          <div className="flex items-center gap-3 select-none">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
                <ImageIcon className="text-white w-5 h-5" />
             </div>
             <span className="font-bold text-lg text-gray-200 tracking-tight">Image Background Remover</span>
          </div>
          
          <button 
             onClick={() => setState(prev => ({...prev, originalImage: null}))}
             className="text-xs text-gray-400 hover:text-white transition-colors"
          >
             Back to Home
          </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ImageWorkspace
            originalImage={state.originalImage}
            brushSize={state.brushSize}
            tolerance={state.tolerance}
            smoothing={state.smoothing}
            algorithm={state.algorithm}
            triggerAutoRemove={triggerAutoRemove}
            triggerUndo={triggerUndo}
            triggerManualApply={triggerManualApply}
            manualMaskPreview={state.manualMaskPreview}
            manualToolMode={state.manualToolMode}
            processedImageOverride={processedImageOverride}
            onProcessedImageUpdate={handleProcessedImageUpdate}
            onManualMaskChange={handleManualMaskChange}
        />
        
        <Toolbar 
            state={state}
            onAutoRemove={handleAutoRemove}
            onAiRemove={handleAiRemove}
            onDownload={handleDownload}
            onUndo={handleUndo}
            onManualApply={handleManualApply}
            onBrushSizeChange={(val) => setState(prev => ({...prev, brushSize: val}))}
            onToleranceChange={(val) => setState(prev => ({...prev, tolerance: val}))}
            onSmoothingChange={(val) => setState(prev => ({...prev, smoothing: val}))}
            onAlgorithmChange={(val) => setState(prev => ({...prev, algorithm: val}))}
            onManualMaskPreviewChange={(val) => setState(prev => ({...prev, manualMaskPreview: val}))}
            onManualToolModeChange={(mode) => setState(prev => ({...prev, manualToolMode: mode}))}
            onUploadClick={() => setState(prev => ({ ...prev, originalImage: null }))}
        />
      </div>
    </div>
  );
};

export default App;
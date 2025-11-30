import React, { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import Toolbar from './components/Toolbar';
import ImageWorkspace from './components/ImageWorkspace';
import { AppState } from './types';
import { analyzeImageForNaming, removeBackgroundWithAi } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    originalImage: null,
    processedImage: null,
    fileName: 'processed_image',
    isProcessing: false,
    brushSize: 30,
    tolerance: 15,
    smoothing: 0,
    aiSuggestedName: null,
    isAnalysing: false,
  });

  const [triggerAutoRemove, setTriggerAutoRemove] = useState(0);
  const [processedImageOverride, setProcessedImageOverride] = useState<string | null>(null);

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
            fileName: file.name.split('.')[0],
            isAnalysing: false
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

  const handleProcessedImageUpdate = useCallback((dataUrl: string) => {
    setState(prev => {
        // Only trigger Gemini analysis if we haven't yet and it's a fresh process
        if (!prev.isAnalysing && !prev.aiSuggestedName && prev.originalImage) {
            triggerGeminiAnalysis(dataUrl);
            return { ...prev, processedImage: dataUrl, isAnalysing: true };
        }
        return { ...prev, processedImage: dataUrl };
    });
  }, []);

  const triggerGeminiAnalysis = async (dataUrl: string) => {
      const suggestedName = await analyzeImageForNaming(dataUrl);
      setState(prev => ({
          ...prev,
          fileName: suggestedName,
          aiSuggestedName: suggestedName,
          isAnalysing: false
      }));
  };

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
                    fileName: file.name.split('.')[0],
                    isAnalysing: false,
                    aiSuggestedName: null
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
        className="min-h-screen bg-gray-900 flex items-center justify-center p-4"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`
            max-w-xl w-full bg-gray-800 rounded-2xl border-2 border-dashed p-12 text-center transition-all
            ${isDragging ? 'border-purple-500 bg-gray-800/80 scale-105' : 'border-gray-700'}
        `}>
          <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <ImageIcon className="text-gray-400 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Background Remover Pro</h1>
          <p className="text-gray-400 mb-8 text-lg">
            Upload an image to smart-remove the background. <br />
            Includes Gemini 2.5 AI Tools.
          </p>
          
          <label className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-8 rounded-xl cursor-pointer transition-transform hover:scale-105 shadow-lg shadow-purple-900/30">
            <Upload className="w-6 h-6" />
            <span>Select Image</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
            />
          </label>
          <p className="mt-4 text-sm text-gray-500">or drag and drop here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      <ImageWorkspace
        originalImage={state.originalImage}
        brushSize={state.brushSize}
        tolerance={state.tolerance}
        smoothing={state.smoothing}
        triggerAutoRemove={triggerAutoRemove}
        processedImageOverride={processedImageOverride}
        onProcessedImageUpdate={handleProcessedImageUpdate}
      />
      
      <Toolbar 
        state={state}
        onAutoRemove={handleAutoRemove}
        onAiRemove={handleAiRemove}
        onDownload={handleDownload}
        onBrushSizeChange={(val) => setState(prev => ({...prev, brushSize: val}))}
        onToleranceChange={(val) => setState(prev => ({...prev, tolerance: val}))}
        onSmoothingChange={(val) => setState(prev => ({...prev, smoothing: val}))}
        onUploadClick={() => setState(prev => ({ ...prev, originalImage: null }))}
      />
    </div>
  );
};

export default App;

import React, { useState } from 'react';
import { Eraser, Wand2, Download, Sparkles, Loader2, Upload, Bot, Zap, BrainCircuit, RotateCcw, Eye, EyeOff, Check, Brush, ScanLine, Layers } from 'lucide-react';
import { AppState } from '../types';

interface ToolbarProps {
  state: AppState;
  onAutoRemove: () => void;
  onAiRemove: () => void;
  onDownload: () => void;
  onUndo: () => void;
  onManualApply: () => void;
  onBrushSizeChange: (size: number) => void;
  onToleranceChange: (val: number) => void;
  onSmoothingChange: (val: number) => void;
  onAlgorithmChange: (val: 'FLOOD_FILL' | 'GRABCUT') => void;
  onManualMaskPreviewChange: (val: boolean) => void;
  onManualToolModeChange: (mode: 'ADD' | 'SUBTRACT') => void;
  onUploadClick: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  state,
  onAutoRemove,
  onAiRemove,
  onDownload,
  onUndo,
  onManualApply,
  onBrushSizeChange,
  onToleranceChange,
  onSmoothingChange,
  onAlgorithmChange,
  onManualMaskPreviewChange,
  onManualToolModeChange,
  onUploadClick
}) => {
  const [activeTab, setActiveTab] = useState<'ALGO' | 'AI'>('ALGO');

  return (
    <div className="h-full bg-gray-800 border-l border-gray-700 flex flex-col p-4 w-80 space-y-6 overflow-y-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles className="text-purple-400 w-5 h-5" />
          Editor Tools
        </h2>
        <p className="text-gray-400 text-sm">Refine your image</p>
      </div>

      {/* Upload New */}
      <div className="pb-4 border-b border-gray-700">
         <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
        >
          <Upload size={16} />
          <span>New Image</span>
        </button>
      </div>

      {/* Removal Method Section */}
      <div className="pb-4 border-b border-gray-700">
         <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3 block">
            Removal Method
         </label>

         {/* Tabs */}
         <div className="flex p-1 bg-gray-900/50 rounded-lg mb-4 border border-gray-700">
            <button
               onClick={() => setActiveTab('ALGO')}
               className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                   activeTab === 'ALGO' 
                   ? 'bg-gray-700 text-white shadow-sm ring-1 ring-gray-600' 
                   : 'text-gray-400 hover:text-gray-200'
               }`}
            >
               <Zap size={14} />
               Fast Mode
            </button>
            <button
               onClick={() => setActiveTab('AI')}
               className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${
                   activeTab === 'AI' 
                   ? 'bg-gradient-to-r from-blue-900/40 to-purple-900/40 text-blue-200 shadow-sm ring-1 ring-blue-500/30' 
                   : 'text-gray-400 hover:text-gray-200'
               }`}
            >
               <BrainCircuit size={14} />
               AI Model
            </button>
         </div>

         {/* Content - Algorithmic */}
         {activeTab === 'ALGO' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-3 bg-gray-700/30 p-3 rounded-lg border border-gray-700">
                    
                    {/* Algorithm Select */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 block mb-1">Algorithm</label>
                        <div className="relative">
                            <select 
                                value={state.algorithm}
                                onChange={(e) => onAlgorithmChange(e.target.value as 'FLOOD_FILL' | 'GRABCUT')}
                                className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded-md py-2 px-2 appearance-none focus:ring-1 focus:ring-purple-500 outline-none"
                            >
                                <option value="FLOOD_FILL">Flood Fill (Default)</option>
                                <option value="GRABCUT">GrabCut (Border Model)</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
                                <ScanLine size={12} />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 pt-1">
                            {state.algorithm === 'FLOOD_FILL' 
                                ? 'Best for solid backgrounds connected to edges.' 
                                : 'Removes background colors globally. Good for "holes".'}
                        </p>
                    </div>

                    <div className="w-full h-px bg-gray-600/50 my-2"></div>

                    {/* Tolerance */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Color Tolerance</span>
                            <span>{state.tolerance}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={state.tolerance}
                            onChange={(e) => onToleranceChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>

                    {/* Smoothing */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Smooth Edges</span>
                            <span>{state.smoothing > 0 ? state.smoothing : 'Off'}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            value={state.smoothing}
                            onChange={(e) => onSmoothingChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <button
                        onClick={onAutoRemove}
                        disabled={state.isProcessing}
                        className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-medium transition-all text-sm mt-2"
                    >
                        <Wand2 size={16} />
                        <span>Apply Removal</span>
                    </button>
                </div>
            </div>
         )}

         {/* Content - AI */}
         {activeTab === 'AI' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-3 rounded-lg border border-blue-500/20 space-y-3">
                     <p className="text-[10px] text-blue-200/70 leading-relaxed">
                        Uses <strong>Gemini 2.5</strong> to intelligently understand the scene and separate the subject from the background. Best for complex images.
                     </p>
                     
                     <button
                        onClick={onAiRemove}
                        disabled={state.isProcessing}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium transition-all shadow-lg"
                    >
                        {state.isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        <span>Process with Gemini</span>
                    </button>
                </div>
             </div>
         )}
      </div>

      {/* Manual Tools */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <Eraser size={14} /> Manual Touch-up
            </label>
            
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onManualToolModeChange('ADD')}
                    title="Mark to Remove"
                    className={`p-1.5 rounded transition-colors ${state.manualToolMode === 'ADD' ? 'bg-pink-600 text-white' : 'hover:bg-gray-700 text-gray-400 hover:text-white'}`}
                >
                    <Brush size={14} />
                </button>
                <button
                    onClick={() => onManualToolModeChange('SUBTRACT')}
                    title="Clean Mask (Un-mark)"
                    className={`p-1.5 rounded transition-colors ${state.manualToolMode === 'SUBTRACT' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-400 hover:text-white'}`}
                >
                    <Eraser size={14} />
                </button>
                <div className="w-px h-4 bg-gray-600 mx-1"></div>
                <button 
                    onClick={onUndo}
                    title="Undo (Ctrl+Z)"
                    className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                    <RotateCcw size={14} />
                </button>
            </div>
        </div>
        
        <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 space-y-4">
          <p className="text-[10px] text-gray-400 mb-2">
             {state.manualToolMode === 'ADD' ? 'Drawing RED marks area to remove.' : 'Using eraser to clean up the mask.'}
          </p>
          
          {/* Brush Size Control */}
          <div className="flex items-center gap-4">
             <div className="flex-1 space-y-1">
                 <div className="flex justify-between text-xs text-gray-400">
                    <span>Size</span>
                    <span>{state.brushSize}px</span>
                </div>
                <input
                    type="range"
                    min="5"
                    max="30"
                    value={state.brushSize}
                    onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                    className={`w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer ${state.manualToolMode === 'ADD' ? 'accent-pink-500' : 'accent-blue-500'}`}
                />
             </div>
             
             {/* Visual Indicator on the Right */}
             <div className="w-12 h-12 flex-shrink-0 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden relative">
                 <div 
                    className={`rounded-full ${state.manualToolMode === 'ADD' ? 'bg-pink-500' : 'bg-blue-500'}`}
                    style={{ 
                        width: Math.min(state.brushSize, 40), 
                        height: Math.min(state.brushSize, 40),
                        // Visual scaling for very large brushes to fit icon box
                        transform: state.brushSize > 40 ? `scale(${state.brushSize / 40})` : 'scale(1)'
                    }}
                 ></div>
             </div>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
             <button
                onClick={() => onManualMaskPreviewChange(!state.manualMaskPreview)}
                disabled={!state.hasManualEdits}
                title={!state.hasManualEdits ? "Draw on the image to preview changes" : "Toggle preview of manual changes"}
                className={`flex items-center justify-center gap-2 py-2 px-2 rounded-md text-xs font-medium transition-all border ${
                    !state.hasManualEdits 
                    ? 'bg-gray-800/50 border-gray-700 text-gray-600 cursor-not-allowed opacity-50' 
                    : state.manualMaskPreview
                        ? 'bg-pink-900/40 border-pink-500/50 text-pink-200'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
             >
                {state.manualMaskPreview ? <Eye size={14} /> : <EyeOff size={14} />}
                {state.manualMaskPreview ? 'View Result' : 'View Mask'}
             </button>

             <button
                onClick={onManualApply}
                disabled={!state.hasManualEdits}
                title={!state.hasManualEdits ? "Draw on the image to enable apply" : "Apply manual changes to the image"}
                className={`flex items-center justify-center gap-2 py-2 px-2 rounded-md text-xs font-medium transition-all shadow-lg ${
                    !state.hasManualEdits 
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50' 
                    : 'bg-pink-600 hover:bg-pink-700 text-white'
                }`}
             >
                <Check size={14} />
                Apply
             </button>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-gray-700 pt-6">
        <div className="mb-4">
            <p className="text-xs font-mono text-gray-400 mb-1">Filename:</p>
            <div className="bg-gray-900 px-3 py-2 rounded text-sm text-green-400 font-mono truncate border border-gray-700">
                {state.fileName}.png
            </div>
        </div>
        <button
          onClick={onDownload}
          disabled={!state.processedImage}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-bold transition-all"
        >
          <Download size={18} />
          <span>Save PNG</span>
        </button>
      </div>

    </div>
  );
};

export default Toolbar;

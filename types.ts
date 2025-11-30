export interface Point {
  x: number;
  y: number;
}

export interface ProcessingOptions {
  tolerance: number; // 0-100
  feather: number;
}

export enum ToolMode {
  ERASE = 'ERASE',
  RESTORE = 'RESTORE', // Future proofing
}

export interface AppState {
  originalImage: HTMLImageElement | null;
  processedImage: string | null; // Data URL
  fileName: string;
  isProcessing: boolean;
  brushSize: number;
  tolerance: number;
  smoothing: number; // 0-10
  manualMaskPreview: boolean;
}

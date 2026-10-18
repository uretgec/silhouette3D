import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, Box, Eye, Sliders, RotateCcw, Image as ImageIcon, Eraser, Loader2, Sparkles, Crop, CheckCircle, Info } from 'lucide-react';
import { removeBackground as aiRemoveBackground } from '@imgly/background-removal';
import STLViewer from './components/STLViewer';
import { extractSilhouetteAsImageData, SilhouetteData } from './utils/silhouette';
import { generateSTL, generateOBJ, generate3MF, downloadFile } from './utils/stlGenerator';

function App() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<HTMLImageElement | null>(null);
  const [silhouetteData, setSilhouetteData] = useState<SilhouetteData | null>(null);
  const [silhouetteCanvas, setSilhouetteCanvas] = useState<HTMLCanvasElement | null>(null);
  const [threshold, setThreshold] = useState(128);
  const [thickness, setThickness] = useState(3);
  const [pixelScale, setPixelScale] = useState(0.05);
  const [resolution, setResolution] = useState(600);
  const [meshMode, setMeshMode] = useState<'none' | 'smooth' | 'simplify'>('none');
  const [exportFormat, setExportFormat] = useState<'stl' | 'obj' | '3mf'>('stl');
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null);
  const [showSilhouette, setShowSilhouette] = useState(true);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState('');
  const [cropMode, setCropMode] = useState(false);
  const [cropBox, setCropBox] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = useCallback((img: HTMLImageElement, thresh: number, res: number) => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = extractSilhouetteAsImageData(img, thresh, res);
      setSilhouetteData(result.result);
      setSilhouetteCanvas(result.canvas);
      setIsProcessing(false);
    }, 50);
  }, []);

  useEffect(() => {
    const imgToProcess = processedImage || originalImage;
    if (imgToProcess) {
      processImage(imgToProcess, threshold, resolution);
    }
  }, [originalImage, processedImage, threshold, resolution, processImage]);

  useEffect(() => {
    if (silhouetteData) {
      const buffer = generateSTL(silhouetteData, thickness, pixelScale, meshMode);
      setStlBuffer(buffer);
      
      // Show toast notification with file size
      const modeNames = {
        'none': 'None',
        'smooth': 'Smooth',
        'simplify': 'Simplify'
      };
      
      const sizeMB = (buffer.byteLength / 1024 / 1024).toFixed(2);
      
      setToast({
        message: `${modeNames[meshMode]} applied - STL: ${sizeMB} MB`,
        type: 'success'
      });
      
      // Auto-hide toast after 3 seconds
      setTimeout(() => setToast(null), 3000);
    }
  }, [silhouetteData, thickness, pixelScale, meshMode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setProcessedImage(null);
        setBgRemoved(false);
        setCropBox(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setProcessedImage(null);
        setBgRemoved(false);
        setCropBox(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBg = async () => {
    if (!originalImage) return;
    
    setIsRemovingBg(true);
    setBgProgress('Initializing AI model...');

    try {
      const response = await fetch(originalImage.src);
      const imageBlob = await response.blob();

      setBgProgress('Downloading AI model (first time only)...');

      const resultBlob = await aiRemoveBackground(imageBlob, {
        progress: (key, current, total) => {
          const percent = Math.round((current / total) * 100);
          if (key.includes('download')) {
            setBgProgress(`Downloading model: ${percent}%`);
          } else if (key.includes('compute')) {
            setBgProgress(`Processing image: ${percent}%`);
          }
        },
        output: {
          format: 'image/png',
          quality: 1,
        }
      });

      setBgProgress('Creating processed image...');

      const resultUrl = URL.createObjectURL(resultBlob);
      const processedImg = new Image();
      processedImg.onload = () => {
        setProcessedImage(processedImg);
        setBgRemoved(true);
        setIsRemovingBg(false);
        setBgProgress('');
      };
      processedImg.src = resultUrl;
    } catch (error) {
      console.error('Background removal failed:', error);
      setBgProgress('Error: ' + (error as Error).message);
      setIsRemovingBg(false);
      setTimeout(() => setBgProgress(''), 3000);
    }
  };

  const handleRestoreBg = () => {
    setProcessedImage(null);
    setBgRemoved(false);
  };

  const handleDownload = (format: 'stl' | 'obj' | '3mf') => {
    if (!silhouetteData) return;
    
    if (format === 'stl') {
      if (stlBuffer) {
        const stlBlob = new Blob([stlBuffer], { type: 'application/octet-stream' });
        downloadFile(stlBlob, 'silhouette_3d.stl', 'application/octet-stream');
      }
    } else if (format === 'obj') {
      const objContent = generateOBJ(silhouetteData, thickness, pixelScale);
      downloadFile(objContent, 'silhouette_3d.obj', 'text/plain');
    } else if (format === '3mf') {
      const blob3mf = generate3MF(silhouetteData, thickness, pixelScale);
      downloadFile(blob3mf, 'silhouette_3d.3mf', 'application/xml');
    }
    
    setToast({
      message: `Downloaded ${format.toUpperCase()} file`,
      type: 'success'
    });
    setShowDownloadDropdown(false);
    setTimeout(() => setToast(null), 3000);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setSilhouetteData(null);
    setSilhouetteCanvas(null);
    setStlBuffer(null);
    setBgRemoved(false);
    setCropBox(null);
    setCropMode(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Crop functionality
  useEffect(() => {
    if (cropMode && cropCanvasRef.current) {
      const canvas = cropCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }, [cropMode]);

  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode || !cropCanvasRef.current) return;
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDragging(true);
    setDragStart({ x, y });
    setCropBox(null);
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !cropCanvasRef.current) return;
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cropX = Math.min(dragStart.x, x);
    const cropY = Math.min(dragStart.y, y);
    const cropW = Math.abs(x - dragStart.x);
    const cropH = Math.abs(y - dragStart.y);
    
    setCropBox({ x: cropX, y: cropY, w: cropW, h: cropH });
  };

  const handleCropMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const applyCrop = () => {
    if (!cropBox || !displayImage || !cropCanvasRef.current) return;
    
    const canvas = cropCanvasRef.current;
    
    // Get the actual displayed image dimensions
    const displayRect = canvas.getBoundingClientRect();
    const imgElement = canvas.previousElementSibling as HTMLImageElement;
    
    if (!imgElement) return;
    
    // Calculate how the image is displayed (object-contain)
    const imgNaturalWidth = displayImage.naturalWidth;
    const imgNaturalHeight = displayImage.naturalHeight;
    const containerWidth = displayRect.width;
    const containerHeight = displayRect.height;
    
    // Calculate the actual image display size and offset
    const imgAspect = imgNaturalWidth / imgNaturalHeight;
    const containerAspect = containerWidth / containerHeight;
    
    let displayWidth: number, displayHeight: number, offsetX: number, offsetY: number;
    
    if (imgAspect > containerAspect) {
      // Image is wider than container
      displayWidth = containerWidth;
      displayHeight = containerWidth / imgAspect;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // Image is taller than container
      displayHeight = containerHeight;
      displayWidth = containerHeight * imgAspect;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }
    
    // Calculate scale from display coordinates to natural image coordinates
    const scaleX = imgNaturalWidth / displayWidth;
    const scaleY = imgNaturalHeight / displayHeight;
    
    // Adjust crop box coordinates (remove offset)
    const adjustedX = (cropBox.x - offsetX) * scaleX;
    const adjustedY = (cropBox.y - offsetY) * scaleY;
    const adjustedW = cropBox.w * scaleX;
    const adjustedH = cropBox.h * scaleY;
    
    // Create cropped image
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.round(adjustedW);
    cropCanvas.height = Math.round(adjustedH);
    const cropCtx = cropCanvas.getContext('2d')!;
    
    cropCtx.drawImage(
      displayImage,
      adjustedX,
      adjustedY,
      adjustedW,
      adjustedH,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );
    
    const croppedImg = new Image();
    croppedImg.onload = () => {
      if (bgRemoved) {
        setProcessedImage(croppedImg);
      } else {
        setOriginalImage(croppedImg);
      }
      setCropBox(null);
      setCropMode(false);
    };
    croppedImg.src = cropCanvas.toDataURL();
  };

  const cancelCrop = () => {
    setCropBox(null);
    setCropMode(false);
  };

  const filledPixels = silhouetteData ? silhouetteData.filledPixels : 0;
  const totalPixels = silhouetteData ? silhouetteData.width * silhouetteData.height : 0;
  const estimatedSize = stlBuffer ? (stlBuffer.byteLength / 1024 / 1024).toFixed(2) : '0';

  const displayImage = processedImage || originalImage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Silhouette3D
              </h1>
              <p className="text-xs text-gray-400">Image to 3D Printer File</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfoPopup(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Tips & Information"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Info</span>
            </button>
            {originalImage && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!originalImage ? (
          /* Upload Area */
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-lg p-12 border-2 border-dashed border-white/30 rounded-2xl 
                         hover:border-blue-400 hover:bg-white/5 transition-all cursor-pointer
                         flex flex-col items-center gap-6 group"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 
                              rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-10 h-10 text-blue-400" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Upload Image</h2>
                <p className="text-gray-400">
                  Drag & drop or click to select an image
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  PNG, JPG, WEBP supported
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ImageIcon className="w-4 h-4" />
                High contrast images give the best results
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-3xl">
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <Sparkles className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="font-semibold mb-1">AI Background Removal</h3>
                <p className="text-sm text-gray-400">Advanced AI removes backgrounds with precision</p>
              </div>
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <Crop className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="font-semibold mb-1">Crop Tool</h3>
                <p className="text-sm text-gray-400">Select and crop specific areas of your image</p>
              </div>
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <Download className="w-8 h-8 text-green-400 mb-3" />
                <h3 className="font-semibold mb-1">STL Download</h3>
                <p className="text-sm text-gray-400">Ready-to-print STL file for your 3D printer</p>
              </div>
            </div>
          </div>
        ) : (
          /* Main Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - Controls */}
            <div className="lg:col-span-3 space-y-4">
              {/* Original Image */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  {bgRemoved ? 'BG Removed' : 'Original Image'}
                </h3>
                <div className="aspect-square bg-black/30 rounded-lg overflow-hidden flex items-center justify-center relative">
                  {displayImage && (
                    <img
                      src={displayImage.src}
                      alt={bgRemoved ? "Background removed" : "Original"}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                  {cropMode && (
                    <>
                      <canvas
                        ref={cropCanvasRef}
                        className="absolute inset-0 w-full h-full cursor-crosshair z-10"
                        onMouseDown={handleCropMouseDown}
                        onMouseMove={handleCropMouseMove}
                        onMouseUp={handleCropMouseUp}
                        onMouseLeave={handleCropMouseUp}
                      />
                      {cropBox && (
                        <div
                          className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/20 pointer-events-none z-20"
                          style={{
                            left: cropBox.x,
                            top: cropBox.y,
                            width: cropBox.w,
                            height: cropBox.h
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="mt-3 space-y-2">
                  {!cropMode ? (
                    <>
                      {!bgRemoved ? (
                        <button
                          onClick={handleRemoveBg}
                          disabled={isRemovingBg}
                          className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 
                                     hover:from-orange-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700
                                     rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
                        >
                          {isRemovingBg ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Remove Background (AI)
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={handleRestoreBg}
                          className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg 
                                     font-medium text-sm transition-all flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore Original
                        </button>
                      )}
                      <button
                        onClick={() => setCropMode(true)}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 
                                   hover:from-purple-600 hover:to-indigo-600
                                   rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <Crop className="w-4 h-4" />
                        Crop Image
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={applyCrop}
                        disabled={!cropBox}
                        className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 
                                   hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700
                                   rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <Crop className="w-4 h-4" />
                        Apply Crop
                      </button>
                      <button
                        onClick={cancelCrop}
                        className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg 
                                   font-medium text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
                
                {bgProgress && (
                  <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300 text-center">{bgProgress}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {cropMode
                    ? 'Draw a rectangle to crop'
                    : bgRemoved
                    ? '✓ AI background removal complete'
                    : 'Uses AI to precisely remove background'}
                </p>
              </div>

              {/* Silhouette Preview */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-400" />
                    Silhouette
                  </h3>
                  <button
                    onClick={() => setShowSilhouette(!showSilhouette)}
                    className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/20"
                  >
                    {showSilhouette ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showSilhouette && silhouetteCanvas && (
                  <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={silhouetteCanvas.toDataURL()}
                      alt="Silhouette"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                {silhouetteData && (
                  <div className="mt-3 text-xs text-gray-400 space-y-1">
                    <p>Size: {silhouetteData.width} × {silhouetteData.height}px</p>
                    <p>Filled pixels: {filledPixels.toLocaleString()} / {totalPixels.toLocaleString()}</p>
                    <p>Coverage: %{((filledPixels / totalPixels) * 100).toFixed(1)}</p>
                  </div>
                )}
              </div>

              {/* New Image Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 
                           transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload New Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Center - 3D Viewer */}
            <div className="lg:col-span-6">
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 h-full">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Box className="w-4 h-4 text-green-400" />
                  3D Preview
                  {isProcessing && (
                    <span className="text-xs text-yellow-400 ml-auto animate-pulse">Processing...</span>
                  )}
                </h3>
                <div className="h-[500px]">
                  <STLViewer
                    silhouette={silhouetteData}
                    thickness={thickness}
                    scale={pixelScale}
                    meshMode={meshMode}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>Drag to rotate • Scroll to zoom</span>
                  <span>STL size: {estimatedSize} MB</span>
                </div>
              </div>
            </div>

            {/* Right Panel - Settings */}
            <div className="lg:col-span-3 space-y-4">
              {/* Threshold Control */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-yellow-400" />
                  Settings
                </h3>

                <div className="space-y-5">
                  <div>
                    <label className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-300">Resolution</span>
                    </label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value={300} className="bg-gray-800">Low (300px) - Fast, ~10MB</option>
                      <option value={600} className="bg-gray-800">Medium (600px) - Balanced, ~40MB</option>
                      <option value={1200} className="bg-gray-800">High (1200px) - Detailed, ~160MB</option>
                      <option value={2000} className="bg-gray-800">Ultra (2000px) - Maximum, ~450MB</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Higher = more detail, larger file</p>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-300">Mesh Smoothing</span>
                    </label>
                    <select
                      value={meshMode}
                      onChange={(e) => setMeshMode(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="none" className="bg-gray-800">None (Original)</option>
                      <option value="smooth" className="bg-gray-800">Smooth (Visual only)</option>
                      <option value="simplify" className="bg-gray-800">Simplify (Reduce size ⭐)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Reduces file size & improves smoothness</p>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-300">Threshold</span>
                      <span className="text-blue-400 font-mono">{threshold}</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="245"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer text-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Low: More detail • High: Less detail</p>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-300">Thickness (mm)</span>
                      <span className="text-purple-400 font-mono">{thickness.toFixed(1)}</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="20"
                      step="0.5"
                      value={thickness}
                      onChange={(e) => setThickness(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer text-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Height of the 3D model</p>
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-300">Pixel Size</span>
                      <span className="text-green-400 font-mono">{pixelScale.toFixed(2)}</span>
                    </label>
                    <input
                      type="range"
                      min="0.02"
                      max="1"
                      step="0.01"
                      value={pixelScale}
                      onChange={(e) => setPixelScale(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer text-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Physical size of each pixel (mm)</p>
                  </div>
                </div>
              </div>

              {/* Model Info */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                <h3 className="font-semibold mb-3 text-sm">Model Info</h3>
                {silhouetteData && (
                  <div className="space-y-2 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Width:</span>
                      <span className="text-white">{(silhouetteData.width * pixelScale).toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Height:</span>
                      <span className="text-white">{(silhouetteData.height * pixelScale).toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thickness:</span>
                      <span className="text-white">{thickness.toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Resolution:</span>
                      <span className="text-white">{silhouetteData.width} × {silhouetteData.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Triangles:</span>
                      <span className="text-white">{(stlBuffer ? stlBuffer.byteLength / 50 : 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>STL Size:</span>
                      <span className="text-white">{estimatedSize} MB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Download Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                  disabled={!stlBuffer}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 
                             hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700
                             rounded-xl font-semibold transition-all flex items-center justify-center gap-2
                             shadow-lg shadow-green-500/20 disabled:shadow-none"
                >
                  <Download className="w-5 h-5" />
                  Download 3D File
                  <svg className={`w-4 h-4 transition-transform ${showDownloadDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDownloadDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50">
                    <button
                      onClick={() => handleDownload('stl')}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center justify-between border-b border-white/10"
                    >
                      <div>
                        <div className="font-semibold text-sm">STL</div>
                        <div className="text-xs text-gray-400">Standard format • Most compatible</div>
                      </div>
                      <div className="text-sm text-green-400 font-mono">{estimatedSize} MB</div>
                    </button>
                    <button
                      onClick={() => handleDownload('obj')}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center justify-between border-b border-white/10"
                    >
                      <div>
                        <div className="font-semibold text-sm">OBJ</div>
                        <div className="text-xs text-gray-400">With colors & textures</div>
                      </div>
                      <div className="text-sm text-blue-400 font-mono">~{(parseFloat(estimatedSize) * 1.2).toFixed(2)} MB</div>
                    </button>
                    <button
                      onClick={() => handleDownload('3mf')}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-sm">3MF ⭐</div>
                        <div className="text-xs text-gray-400">Compressed • Modern format</div>
                      </div>
                      <div className="text-sm text-purple-400 font-mono">~{(parseFloat(estimatedSize) * 0.4).toFixed(2)} MB</div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Info Popup */}
      {showInfoPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInfoPopup(false)}>
          <div className="bg-gray-900 border border-white/20 rounded-2xl max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                Tips & Information
              </h2>
              <button
                onClick={() => setShowInfoPopup(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">💡 Getting Started</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Upload a high-contrast image for best results</li>
                  <li>• Use "Remove Background (AI)" to clean up the image</li>
                  <li>• Use "Crop" to select specific areas</li>
                  <li>• Adjust threshold to fine-tune the silhouette</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-green-400 mb-2">🖨️ 3D Printing</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Min. 2mm thickness recommended for printing</li>
                  <li>• Lower resolution = smaller file size</li>
                  <li>• Use "Simplify" mesh mode to reduce file size</li>
                  <li>• STL file opens in all common slicers</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-purple-400 mb-2">📦 Export Formats</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• <span className="font-mono text-green-400">STL</span> - Standard format, most compatible</li>
                  <li>• <span className="font-mono text-blue-400">OBJ</span> - Supports colors and textures</li>
                  <li>• <span className="font-mono text-purple-400">3MF</span> - Modern, compressed, smallest size</li>
                </ul>
              </div>
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs text-gray-500 text-center">
                  All processing happens locally in your browser. No data is uploaded to any server.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border ${
            toast.type === 'success' 
              ? 'bg-green-500/90 border-green-400 text-white' 
              : 'bg-blue-500/90 border-blue-400 text-white'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>Silhouette3D - Image to 3D Printer File Generator</p>
          <p className="mt-1">Your images are processed locally in your browser. Nothing is uploaded to any server.</p>
          <p className="mt-3">
            <a 
              href="https://github.com/uretgec/silhouette3D" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

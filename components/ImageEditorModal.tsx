import React, { useState, useEffect, useRef } from 'react';
import { Level } from '@/lib/levels';
import { getHexColor } from '@/lib/colors';

interface ImageEditorModalProps {
  file: File;
  onCancel: () => void;
  onCreate: (level: Level) => void;
}

export function ImageEditorModal({ file, onCancel, onCreate }: ImageEditorModalProps) {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(50);
  const [panY, setPanY] = useState(50);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [customGridSize, setCustomGridSize] = useState<number>(8);
  const gridSizes = [8, 16, 32, 64, 96, 128];
  const gridSizeIndex = gridSizes.indexOf(customGridSize);
  const [customMaxColors, setCustomMaxColors] = useState<number>(20);
  const [pixelPreview, setPixelPreview] = useState<string[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Bigger slider for mobile
  const sliderClass = "w-full h-8 bg-white border-2 border-black rounded-none appearance-none cursor-pointer touch-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-black [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-none [&::-webkit-slider-thumb]:rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        setImageObj(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [file]);

  useEffect(() => {
    if (!imageObj || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const size = canvas.width;
    
    ctx.clearRect(0, 0, size, size);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    
    const imgRatio = imageObj.width / imageObj.height;
    let drawW = size;
    let drawH = size;
    if (imgRatio > 1) {
       drawW = size * imgRatio;
    } else {
       drawH = size / imgRatio;
    }
    drawW *= zoom;
    drawH *= zoom;
    
    const maxPanX = Math.max(0, drawW - size);
    const maxPanY = Math.max(0, drawH - size);
    
    const dx = - (panX / 100) * maxPanX;
    const dy = - (panY / 100) * maxPanY;

    const offsetX = Math.max(0, (size - drawW) / 2);
    const offsetY = Math.max(0, (size - drawH) / 2);

    ctx.drawImage(imageObj, dx + offsetX, dy + offsetY, drawW, drawH);
    
    // Generate preview
    setIsProcessing(true);
    const timeoutId = setTimeout(() => {
      import('@/lib/imageProcessor').then(({ processImageToLevelData }) => {
        try {
          const target = processImageToLevelData(previewCanvasRef.current!, customGridSize, customMaxColors);
          setPixelPreview(target);
        } catch(e) {
          console.error(e);
        } finally {
          setIsProcessing(false);
        }
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [imageObj, zoom, panX, panY, brightness, contrast, saturation, customGridSize, customMaxColors]);

  const handleCreate = () => {
    if (!pixelPreview) return;
    const newLevel: Level = {
      id: Date.now(),
      name: "Photo",
      gridSize: customGridSize,
      target: pixelPreview
    };
    onCreate(newLevel);
  };

  if (!imageObj) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80">
      <div className="min-h-screen flex items-start sm:items-center justify-center p-0 lg:p-4 pb-12 sm:pb-4">
        <div className="relative bg-[#F3F0E8] border-0 sm:border-4 border-black p-4 md:p-8 max-w-6xl w-full shadow-none sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-6 min-h-screen sm:min-h-0">
          
          {/* Header & Actions */}
          <div className="flex justify-between items-center sm:items-end border-b-2 sm:border-0 border-black pb-4 sm:pb-0 sticky top-0 z-20 bg-[#F3F0E8] pt-4 sm:pt-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            <h2 className="text-xl sm:text-2xl font-black uppercase text-left break-words max-w-[50%] leading-tight sm:leading-none">Picture Settings</h2>
            
            <div className="flex gap-2 sm:gap-4 shrink-0">
              <button 
                onClick={onCancel}
                className="px-3 sm:px-4 py-2 border-2 border-black font-bold uppercase tracking-widest hover:bg-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 bg-white sm:bg-transparent text-[10px] sm:text-xs"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={isProcessing || !pixelPreview}
                className="px-3 sm:px-4 py-2 border-2 border-black bg-black text-white font-bold uppercase tracking-widest hover:bg-[#FF3E3E] hover:text-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs"
              >
                Create
              </button>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8">
             <div className="w-full lg:w-1/2 shrink-0 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 sticky top-[4.5rem] sm:top-0 z-10 bg-[#F3F0E8] py-2 sm:py-0 border-b-2 border-black sm:border-0 -mx-4 px-4 sm:mx-0 sm:px-0 shadow-sm sm:shadow-none">
                  <div className="flex flex-col gap-2">
                     <canvas ref={previewCanvasRef} width={256} height={256} className="w-full aspect-square border-2 sm:border-4 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] object-contain" />
                     <p className="text-center text-[8px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60">Source Preview</p>
                  </div>
                  <div className="flex flex-col gap-2">
                     <div 
                        className={`w-full aspect-square border-2 sm:border-4 border-black bg-white grid shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-opacity ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
                        style={{
                          gridTemplateColumns: `repeat(${customGridSize}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${customGridSize}, minmax(0, 1fr))`
                        }}
                     >
                        {pixelPreview?.map((colorKey, i) => (
                           <div key={i} className="w-full h-full" style={{ backgroundColor: colorKey ? getHexColor(colorKey) : 'transparent' }} />
                        ))}
                     </div>
                     <p className="text-center text-[8px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60">Result {isProcessing && '(Processing...)'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-2 sm:mt-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold uppercase tracking-widest flex justify-between">
                      <span>Grid Size</span>
                      <span>{customGridSize}x{customGridSize}</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="5" 
                      step="1" 
                      value={gridSizeIndex} 
                      onChange={(e) => setCustomGridSize(gridSizes[Number(e.target.value)])} 
                      className={sliderClass} 
                    />
                    <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-2">Larger grids are harder to parse correctly.</p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold uppercase tracking-widest flex justify-between">
                      <span>Color Palette</span>
                      <span>{customMaxColors} colors</span>
                    </label>
                    <input type="range" min="5" max="20" value={customMaxColors} onChange={(e) => setCustomMaxColors(Number(e.target.value))} className={sliderClass} />
                  </div>
                </div>
             </div>

             <div className="w-full lg:w-1/2 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex justify-between">
                    <span>Zoom</span>
                    <span>{zoom.toFixed(1)}x</span>
                  </label>
                  <input type="range" min="0.1" max="5" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className={sliderClass} />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex justify-between">
                    <span>Pan X</span>
                  </label>
                  <input type="range" min="0" max="100" step="1" value={panX} onChange={(e) => setPanX(Number(e.target.value))} className={sliderClass} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex justify-between">
                    <span>Pan Y</span>
                  </label>
                  <input type="range" min="0" max="100" step="1" value={panY} onChange={(e) => setPanY(Number(e.target.value))} className={sliderClass} />
                </div>
                
                <hr className="border-black border-2 my-2" />

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex justify-between">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </label>
                  <input type="range" min="0" max="200" step="1" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className={sliderClass} />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex justify-between">
                    <span>Contrast</span>
                    <span>{contrast}%</span>
                  </label>
                  <input type="range" min="0" max="200" step="1" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className={sliderClass} />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex justify-between">
                    <span>Saturation</span>
                    <span>{saturation}%</span>
                  </label>
                  <input type="range" min="0" max="200" step="1" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className={sliderClass} />
                </div>

             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

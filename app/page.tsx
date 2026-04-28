"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, CheckCircle2, ArrowRight, ArrowLeft, Lock, Trash2, Download, Edit2, AlertTriangle, Camera, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BASE_COLORS, getHexColor } from '@/lib/colors';
import { LEVELS, Level } from '@/lib/levels';
import { colorDistance } from '@/lib/imageProcessor';
import { ImageEditorModal } from '@/components/ImageEditorModal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { LevelOptionsModal } from '@/components/LevelOptionsModal';

const LevelPreview = React.memo(({ level, isCompleted }: { level: Level, isCompleted: boolean }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cellSize = size / level.gridSize;

    ctx.clearRect(0, 0, size, size);

    level.target.forEach((colorKey, i) => {
      const x = (i % level.gridSize) * cellSize;
      const y = Math.floor(i / level.gridSize) * cellSize;
      
      if (!colorKey) {
        ctx.fillStyle = isCompleted ? '#ffffff' : 'transparent';
        ctx.fillRect(x, y, cellSize, cellSize);
      } else {
        ctx.fillStyle = isCompleted ? getHexColor(colorKey) : '#A3A3A3';
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    });

  }, [level, isCompleted]);

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={200} 
      className="w-full h-full border-2 border-black object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  );
});
LevelPreview.displayName = 'LevelPreview';

const PlayingCanvas = React.memo(({ level, unlockedColors, isCompleted, showWin }: { level: Level, unlockedColors: string[], isCompleted: boolean, showWin: boolean }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const unlockTimes = React.useRef<Record<string, number>>({});
  const currentLevelIdRef = React.useRef<number | null>(null);
  const winStartTimeRef = React.useRef<number | null>(null);

  // Compute ordered unique colors for the final radial animation
  const animationColorsRef = React.useRef<string[]>([]);

  useEffect(() => {
    if (currentLevelIdRef.current !== level.id) {
       unlockTimes.current = {};
       winStartTimeRef.current = null;
       currentLevelIdRef.current = level.id;
       const colors = new Set<string>();
       level.target.forEach(val => { if (val) colors.add(getHexColor(val)); });
       animationColorsRef.current = Array.from(colors).sort();
    }
    
    const now = performance.now();
    
    if (isCompleted && !showWin && !unlockTimes.current['COMPLETED_ANIM']) {
      unlockTimes.current['COMPLETED_ANIM'] = now;
    }

    if (showWin && !winStartTimeRef.current) {
      winStartTimeRef.current = now;
    }

    unlockedColors.forEach(c => {
      if (!unlockTimes.current[c]) {
        unlockTimes.current[c] = now;
      }
    });

    let animationFrameId: number;

    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const cellSize = size / level.gridSize;
      const cx = (level.gridSize - 1) / 2;
      const cy = (level.gridSize - 1) / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);

      ctx.clearRect(0, 0, size, size);

      let needsNextFrame = false;

      level.target.forEach((colorKey, i) => {
        const gridX = i % level.gridSize;
        const gridY = Math.floor(i / level.gridSize);
        const x = gridX * cellSize;
        const y = gridY * cellSize;

        if (!colorKey) {
          if (isCompleted) {
             const compTime = unlockTimes.current['COMPLETED_ANIM'] || time;
             const elapsed = time - compTime;
             const stableRand = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
             const staggerDelay = stableRand * 800;
             let progress = 0;
             if (elapsed > staggerDelay) {
               progress = Math.min(1, (elapsed - staggerDelay) / 400);
             }
             if (progress < 1) needsNextFrame = true;
             
             ctx.fillStyle = '#ffffff';
             ctx.globalAlpha = Math.max(0, progress);
             ctx.fillRect(x, y, cellSize, cellSize);
             ctx.globalAlpha = 1.0;
          } else {
             ctx.fillStyle = 'transparent';
             ctx.fillRect(x, y, cellSize, cellSize);
          }
          return;
        }

        const hex = getHexColor(colorKey);
        const isUnlocked = isCompleted || unlockedColors.includes(hex);
        
        let progress = 0;
        
        if (showWin && winStartTimeRef.current) {
             const elapsed = Math.max(0, time - winStartTimeRef.current - 500); // 500ms initial rest after resize starts
             const colorIdx = animationColorsRef.current.indexOf(hex);
             const totalColors = animationColorsRef.current.length || 1;
             
             // Time allocation: colors staggered sequentially
             // Give each color 800ms of exclusive 'radial' time, maybe overlap slightly
             const colorStartTime = colorIdx * 500; 
             
             // Radial delay based on distance to center
             const dist = Math.sqrt(Math.pow(gridX - cx, 2) + Math.pow(gridY - cy, 2));
             const normalizedDist = dist / (maxDist || 1);
             const radialDelay = normalizedDist * 800;
             
             const pixelStartTime = colorStartTime + radialDelay;
             const pixelElapsed = elapsed - pixelStartTime;
             
             if (pixelElapsed > 0) {
               progress = Math.min(1, pixelElapsed / 400); // 400ms to scale up
             }
             if (progress < 1) needsNextFrame = true;
        } else if (isUnlocked) {
           const isOverallCompleteAnim = isCompleted && !showWin; 
           const uTime = isOverallCompleteAnim ? unlockTimes.current['COMPLETED_ANIM'] : unlockTimes.current[hex];
           const startTime = uTime || time;
           const elapsed = time - startTime;
           
           // Progressive unveiling top-to-bottom, left-to-right
           const progressIndex = (gridY / level.gridSize) + (gridX / level.gridSize) * 0.2; // cascade
           const maxStagger = isOverallCompleteAnim ? 1500 : 800;
           const staggerDelay = progressIndex * maxStagger * 0.8;
           
           if (elapsed > staggerDelay) {
             progress = Math.min(1, (elapsed - staggerDelay) / 300);
           }
           if (progress < 1) needsNextFrame = true;
        }
        
        if (progress < 1) {
            ctx.fillStyle = '#EEE';
            ctx.fillRect(x, y, cellSize, cellSize);
            if (cellSize > 10 && !showWin && !isCompleted) {
                 ctx.fillStyle = '#CCC';
                 ctx.font = `bold ${Math.floor(cellSize * 0.6)}px monospace`;
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText('?', x + cellSize/2, y + cellSize/2);
            }
        }
        
        if (progress > 0) {
            ctx.fillStyle = hex;
            if (progress < 1) {
                const sz = cellSize * progress;
                const offset = (cellSize - sz) / 2;
                ctx.fillRect(x + offset, y + offset, sz, sz);
            } else {
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
      });

      if (needsNextFrame) {
         animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);

  }, [level, unlockedColors, isCompleted, showWin]);

  return (
    <canvas 
      ref={canvasRef} 
      width={1024} 
      height={1024} 
      className={cn(
        "border-4 border-black bg-white object-contain transition-all duration-700 ease-in-out",
        showWin ? "w-full h-full max-w-[80vh] max-h-[80vh]" : "w-full h-full aspect-square"
      )}
      style={{ imageRendering: 'pixelated' }}
    />
  );
});
PlayingCanvas.displayName = 'PlayingCanvas';

const GalleryCard = React.memo(({ 
  lvl, 
  index, 
  isCompleted, 
  isCustom,
  onPlay,
  onDownload,
  onDelete,
  onUpdateName
}: { 
  lvl: Level, 
  index: number, 
  isCompleted: boolean, 
  isCustom: boolean,
  onPlay: (index: number) => void,
  onDownload: (e: React.MouseEvent, lvl: Level) => void,
  onDelete: (e: React.MouseEvent, lvl: Level) => void,
  onUpdateName: (id: number, name: string) => void
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(lvl.name);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onPlay(index)}
      className="flex flex-col group transition-all cursor-pointer relative"
    >
      <div className="aspect-square bg-[#EAE8E0] border-4 border-black p-4 flex items-center justify-center relative mb-4 transition-all duration-300 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden ring-inset ring-black/5 ring-4">
        <div className="w-full h-full bg-white border-2 border-black/10 shadow-inner relative flex items-center justify-center p-1">
          <LevelPreview level={lvl} isCompleted={isCompleted} />
        </div>
        
        {/* Actions - Always visible on mobile if needed, but here we use group-hover for refinement */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(e, lvl);
            }}
            className="w-8 h-8 md:w-10 md:h-10 bg-white border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            title="Download PNG"
          >
            <Download className="w-4 h-4 md:w-5 md:h-5 text-black" />
          </button>
          
          {isCustom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(e, lvl);
              }}
              className="w-8 h-8 md:w-10 md:h-10 bg-[#FF3E3E] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              title="Suppress Image"
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-black" />
            </button>
          )}
        </div>

        {isCompleted && (
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-[#FFD73E] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">
            <Check className="w-4 h-4 text-black" strokeWidth={4} />
          </div>
        )}
      </div>

      <div className="flex flex-col px-1">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[9px] font-mono font-bold opacity-30 uppercase tracking-tighter">REF_{String(lvl.id % 9999).padStart(4, '0')}</div>
          {isCompleted ? (
             <span className="text-[8px] font-black uppercase text-green-600 tracking-widest bg-green-50 px-1 border border-green-200 leading-tight">Restored</span>
          ) : (
             <span className="text-[8px] font-black uppercase text-black/30 tracking-widest leading-tight">Missing</span>
          )}
        </div>
        
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editingName.trim()) {
                onUpdateName(lvl.id, editingName.trim());
              }
              setIsEditing(false);
            }}
            onClick={e => e.stopPropagation()}
            className="w-full"
          >
            <input 
              autoFocus
              className="font-black uppercase text-sm border-b-2 border-black bg-transparent outline-none w-full"
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              onBlur={() => setIsEditing(false)}
            />
          </form>
        ) : (
          <div className="flex items-center justify-between gap-2 overflow-hidden">
            <div className="font-black uppercase text-base tracking-tight truncate flex items-center gap-2 min-w-0">
              <span className="truncate group-hover:text-[#3E98FF] transition-colors">{lvl.name}</span>
              {isCustom && (
                <Edit2 
                  className="w-3 h-3 opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-pointer shrink-0 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                    setEditingName(lvl.name);
                  }}
                />
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <div className="text-[9px] uppercase font-bold opacity-50 flex items-center gap-2">
            <span className="px-1 border border-black/20 rounded-[1px]">{lvl.gridSize}x{lvl.gridSize}</span>
            <span>{isCustom ? "Experimental" : "Classical"}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
GalleryCard.displayName = 'GalleryCard';

export default function ColorMixApp() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [viewState, setViewState] = useState<'gallery' | 'playing'>('gallery');
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [customLevels, setCustomLevels] = useState<Level[]>([]);
  const [levelToDelete, setLevelToDelete] = useState<Level | null>(null);
  const [selectedLevelForOptions, setSelectedLevelForOptions] = useState<{lvl: Level, index: number} | null>(null);
  
  type Tool = { type: 'source', id: string } | { type: 'eraser' } | null;

  const downloadPixelatedImage = (e: React.MouseEvent, lvl: Level) => {
    e.stopPropagation();
    const canvas = document.createElement('canvas');
    const renderSize = 512;
    canvas.width = renderSize;
    canvas.height = renderSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, renderSize, renderSize);

    const cellSize = renderSize / lvl.gridSize;
    
    lvl.target.forEach((colorKey, i) => {
      if (colorKey) {
        const x = (i % lvl.gridSize) * cellSize;
        const y = Math.floor(i / lvl.gridSize) * cellSize;
        ctx.fillStyle = getHexColor(colorKey);
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    });

    const link = document.createElement('a');
    link.download = `${lvl.name.replace(/\s+/g, '_').toLowerCase()}_chromatica.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const [paletteBlobs, setPaletteBlobs] = useState<string[][]>([[], [], [], [], [], [], []]);
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [unlockedColors, setUnlockedColors] = useState<string[]>([]);
  const [showWin, setShowWin] = useState(false);

  const allLevels = useMemo(() => [...LEVELS, ...customLevels], [customLevels]);

  const handlePlay = React.useCallback((i: number) => {
    setSelectedLevelForOptions({ lvl: allLevels[i], index: i });
  }, [allLevels]);

  const handleStartLevel = (index: number) => {
    setCurrentLevelIdx(index);
    setViewState('playing');
  };

  const handleDownload = React.useCallback((e: React.MouseEvent, targetLvl: Level) => {
    downloadPixelatedImage(e, targetLvl);
  }, []); // Safe as downloadPixelatedImage doesn't rely on reactive state

  const handleDeleteRequest = React.useCallback((e: React.MouseEvent, targetLvl: Level) => {
    e.stopPropagation();
    setLevelToDelete(targetLvl);
  }, []);

  const confirmDelete = () => {
    if (!levelToDelete) return;
    setCustomLevels(prev => {
      const next = prev.filter((c: Level) => c.id !== levelToDelete.id);
      localStorage.setItem('chromatica_custom', JSON.stringify(next));
      return next;
    });
    setLevelToDelete(null);
  };

  const handleUpdateName = React.useCallback((id: number, name: string) => {
    setCustomLevels(prev => {
      const next = prev.map(c => c.id === id ? { ...c, name } : c);
      localStorage.setItem('chromatica_custom', JSON.stringify(next));
      return next;
    });
  }, []);

  // Load progress on mount
  useEffect(() => {
    const saved = localStorage.getItem('chromatica_completed');
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCompletedLevels(JSON.parse(saved));
      } catch(e) {}
    }
    const savedCustom = localStorage.getItem('chromatica_custom');
    if (savedCustom) {
      try {
        setCustomLevels(JSON.parse(savedCustom));
      } catch(e) {}
    }
    setIsMounted(true);
  }, []);

  // Save progress
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('chromatica_completed', JSON.stringify(completedLevels));
    }
  }, [completedLevels, isMounted]);

  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingPhoto(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handlePhotoCreate = (newLevel: Level) => {
    const updated = [...customLevels, newLevel];
    setCustomLevels(updated);
    localStorage.setItem('chromatica_custom', JSON.stringify(updated));
    setCurrentLevelIdx(allLevels.length - 1 + 1); // point to the new custom level
    setViewState('playing');
    setPendingPhoto(null);
  };

  const level = allLevels[currentLevelIdx] || allLevels[0] || null;

  // Extract unique required target colors
  const targetColors = useMemo(() => {
    if (!level) return [];
    const distinct = new Set<string>();
    level.target.forEach(val => {
      if (val) distinct.add(getHexColor(val));
    });
    return Array.from(distinct);
  }, [level]);

  // Initialize/Reset when level changes
  useEffect(() => {
    const t = setTimeout(() => {
      setPaletteBlobs([[], [], [], [], [], [], []]);
      setActiveTool(null);
      setUnlockedColors([]);
      setShowWin(false);
    }, 0);
    return () => clearTimeout(t);
  }, [currentLevelIdx, level?.id, viewState]);

  // Auto-unlock logic
  useEffect(() => {
    let changed = false;
    const newUnlocked = new Set(unlockedColors);
    
    paletteBlobs.forEach(blob => {
      if (blob.length === 0) return;
      const hex = getHexColor(blob);
      if (targetColors.includes(hex) && !newUnlocked.has(hex)) {
        newUnlocked.add(hex);
        changed = true;
      } else {
        // Check for colors within a tolerance
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        
        targetColors.forEach(tc => {
          if (!newUnlocked.has(tc)) {
            const tcR = parseInt(tc.slice(1,3), 16);
            const tcG = parseInt(tc.slice(3,5), 16);
            const tcB = parseInt(tc.slice(5,7), 16);
            
            // OKLAB distance of 0.04 is stricter, keeping colors tighter
            if (colorDistance(r, g, b, tcR, tcG, tcB) < 0.04) {
              newUnlocked.add(tc);
              changed = true;
            }
          }
        });
      }
    });

    if (changed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnlockedColors(Array.from(newUnlocked));
    }
  }, [paletteBlobs, targetColors, unlockedColors]);

  // Check Win condition
  useEffect(() => {
    if (targetColors.length > 0 && unlockedColors.length === targetColors.length && !showWin) {
      const t = setTimeout(() => {
        setShowWin(true);
        if (level) {
          setCompletedLevels(prev => Array.from(new Set([...prev, level.id])));
        }
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [unlockedColors, targetColors, showWin, level, level?.id]);

  const handleNextLevel = () => {
    if (currentLevelIdx < allLevels.length - 1) {
      setCurrentLevelIdx(prev => prev + 1);
    } else {
      setViewState('gallery');
    }
  };

  const handlePaletteBlobClick = (index: number) => {
    if (activeTool?.type === 'source') {
      // Pour a drop of color
      setPaletteBlobs(prev => {
        const newBlobs = [...prev];
        if (newBlobs[index].length < 20) {
          newBlobs[index] = [...newBlobs[index], activeTool.id].sort();
        }
        return newBlobs;
      });
    } else if (activeTool?.type === 'eraser') {
      // Clean blob
      setPaletteBlobs(prev => {
        const newBlobs = [...prev];
        newBlobs[index] = [];
        return newBlobs;
      });
    }
  };

  let activeLabel = "Sys: EMPTY_HAND";
  let activeColor = "transparent";
  
  if (activeTool?.type === 'source') {
    activeLabel = `Sys: LOADED_[${BASE_COLORS[activeTool.id].name.toUpperCase()}]`;
    activeColor = BASE_COLORS[activeTool.id].hex;
  } else if (activeTool?.type === 'eraser') {
    activeLabel = `Sys: ACTIVE_RAG`;
  }

  if (!isMounted) return <div className="min-h-screen bg-[#F3F0E8]" />;

  return (
    <div className={cn("bg-[#F3F0E8] font-sans text-[#1A1A1A] flex flex-col", viewState === 'playing' ? "h-[100dvh] overflow-hidden" : "min-h-screen")}>
      {/* Header */}
      <header className={cn("border-b-2 border-black flex justify-between items-end bg-[#F3F0E8] shrink-0", viewState === 'gallery' ? "p-6 sm:p-8 sticky top-0 z-50" : "p-2 sm:p-4 z-50")}>
        <div className="flex-1 min-w-0">
          <h1 className={cn("font-black tracking-tighter leading-none uppercase text-black cursor-pointer truncate", viewState === 'gallery' ? "text-4xl sm:text-5xl md:text-7xl" : "text-xl sm:text-2xl")} onClick={() => setViewState('gallery')}>CHROMATICA</h1>
          <p className="font-serif italic text-xs sm:text-sm mt-1 truncate">
            {viewState === 'gallery' ? "The Gallery" : level?.name}
          </p>
        </div>
        <div className="flex gap-2 sm:gap-6 text-right items-center shrink-0 ml-4">
          {viewState === 'playing' ? (
            <>
              <button 
                onClick={() => setViewState('gallery')}
                className="flex items-center gap-1 sm:gap-2 text-[10px] font-bold uppercase tracking-widest border-2 border-black px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
              >
                <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Gallery</span>
              </button>
            </>
          ) : (
            <div>
              <span className="block text-[10px] uppercase tracking-widest font-bold opacity-50">Restored</span>
              <span className="text-2xl sm:text-4xl font-mono font-bold italic">{String(completedLevels.filter(id => allLevels.some(l => l.id === id)).length).padStart(2, '0')}/{String(allLevels.length).padStart(2, '0')}</span>
            </div>
          )}
        </div>
      </header>

      {viewState === 'gallery' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-10 flex flex-col bg-[#F3F0E8]">
          <div className="mb-12 border-b-4 border-black pb-4 flex justify-between items-end">
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tight leading-none italic">The Archive</h2>
              <p className="text-xs uppercase font-bold opacity-40 mt-1 tracking-widest">Selected Works & Rediscovered Masterpieces</p>
            </div>
            <div className="hidden sm:flex gap-4">
              <div className="text-right">
                <span className="block text-[8px] uppercase font-black opacity-30">Status</span>
                <span className="text-lg font-mono font-bold">{Math.round((completedLevels.length / allLevels.length) * 100)}% Restored</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 sm:gap-10">
            {allLevels.map((lvl, index) => {
              const isCompleted = completedLevels.includes(lvl.id);
              const isCustom = customLevels.some(c => c.id === lvl.id);

              return (
                <GalleryCard
                  key={lvl.id}
                  lvl={lvl}
                  index={index}
                  isCompleted={isCompleted}
                  isCustom={isCustom}
                  onPlay={handlePlay}
                  onDownload={handleDownload}
                  onDelete={handleDeleteRequest}
                  onUpdateName={handleUpdateName}
                />
              );
            })}
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: allLevels.length * 0.05 }}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col group transition-all cursor-pointer"
            >
              <div className="aspect-square bg-white border-4 border-dashed border-black/20 p-2 flex items-center justify-center relative mb-4 transition-all duration-300 hover:border-black hover:bg-[#3E98FF]/10 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-1 group-hover:translate-y-1">
                 <div className="font-black uppercase text-center flex flex-col items-center">
                    <Upload className="w-8 h-8 mb-2 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] tracking-widest font-bold">Upload<br/>File</span>
                 </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (allLevels.length + 1) * 0.05 }}
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col group transition-all cursor-pointer"
            >
              <div className="aspect-square bg-white border-4 border-dashed border-black/20 p-2 flex items-center justify-center relative mb-4 transition-all duration-300 hover:border-black hover:bg-[#FFD73E]/10 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-1 group-hover:translate-y-1">
                 <div className="font-black uppercase text-center flex flex-col items-center">
                    <Camera className="w-8 h-8 mb-2 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] tracking-widest font-bold">Take<br/>Photo</span>
                 </div>
              </div>
              <input type="file" ref={cameraInputRef} onChange={handleImageUpload} accept="image/*" capture="environment" className="hidden" />
            </motion.div>
          </div>
        </main>
      ) : (
        <main className="flex-1 w-full max-w-4xl mx-auto p-2 md:p-4 flex flex-col gap-2 md:gap-4 bg-[#F3F0E8] relative min-h-0">
          {/* Top Block: Target Palette + Canvas */}
          <section className="flex flex-row gap-2 md:gap-4 flex-1 min-h-0">
            {/* Target Palette */}
            <div className="bg-[#FAF9F6] p-2 md:p-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-y-auto w-24 sm:w-28 md:w-32 shrink-0">
              <h3 className="text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest border-b-2 border-black pb-1 md:pb-2 mb-2 w-full text-center leading-tight">Target</h3>
              <div className="grid grid-cols-2 gap-1.5 md:gap-2 justify-items-center">
                {targetColors.map((hex, i) => {
                  const unlocked = unlockedColors.includes(hex);
                  return (
                    <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 md:w-10 md:h-10 border-2 border-black relative shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex shrink-0" style={{ backgroundColor: hex }}>
                      {unlocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                           <Check className="text-white drop-shadow-md w-4 h-4 md:w-5 md:h-5" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pixel Canvas */}
            <div className="bg-[#FAF9F6] border-2 border-black p-2 md:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col flex-1 relative min-h-0 min-w-0">
              <div className="flex items-center justify-between border-b-2 border-black pb-1 md:pb-2 mb-2 shrink-0">
                <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Pixel Canvas</h3>
              </div>
               
              <div className="flex justify-center flex-1 items-center min-h-0 overflow-hidden py-1 px-1">
                <div className="w-full h-full flex items-center justify-center min-h-0 min-w-0">
                  <PlayingCanvas 
                    level={level} 
                    unlockedColors={unlockedColors} 
                    isCompleted={showWin} 
                    showWin={showWin}
                  />
                </div>
              </div>

              {/* Win Overlay */}
              <AnimatePresence>
                {showWin && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20 backdrop-blur-md p-4 sm:p-8"
                  >
                    <motion.h2 
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 sm:mb-8 text-center text-black drop-shadow-[2px_2px_0px_white]"
                    >
                      {level.name}
                    </motion.h2>
                    
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                      className="w-full max-w-[400px] md:max-w-[500px] aspect-square shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white border-4 border-black p-2 mb-8"
                    >
                      <PlayingCanvas 
                        level={level} 
                        unlockedColors={unlockedColors} 
                        isCompleted={true} 
                        showWin={false}
                      />
                    </motion.div>

                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="flex gap-4"
                    >
                      <button 
                        onClick={() => setViewState('gallery')}
                        className="px-4 py-2 border-4 border-black font-bold uppercase transition-all bg-[#FAF9F6] text-black hover:bg-black hover:text-white"
                      >
                        Gallery
                      </button>
                      <button 
                        onClick={handleNextLevel}
                        className="px-4 py-2 bg-[#FFD73E] border-4 border-black font-bold uppercase hover:-translate-y-1 hover:translate-x-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all flex items-center justify-center min-w-[160px]"
                      >
                        {currentLevelIdx < allLevels.length - 1 ? 'Next Masterpiece' : 'Finish'} 
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </section>

          {/* Mixing Chamber */}
          <section className="bg-white border-2 border-black p-2 md:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0 h-24 sm:h-28 md:h-32 flex flex-col">
            <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-2 shrink-0">
              <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Mixing Chamber</h3>
              <span className="text-[8px] opacity-70 uppercase font-mono hidden sm:block">1. Mix here 2. Select mixed</span>
            </div>
            
            <div className="flex-1 grid grid-cols-7 gap-1 sm:gap-2 min-h-0 items-center justify-items-center w-full max-w-[320px] sm:max-w-lg mx-auto">
              {paletteBlobs.map((blob, i) => {
                const hexColor = getHexColor(blob);
                const hasColor = blob.length > 0;
                const isMatched = targetColors.includes(hexColor);
                
                const blobCounts = blob.reduce((acc, c) => {
                  acc[c] = (acc[c] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                return (
                  <motion.div 
                    key={i}
                    onClick={() => handlePaletteBlobClick(i)}
                    className={cn(
                      "w-full aspect-square border-2 flex flex-col justify-end p-1 cursor-pointer transition-all relative group overflow-hidden mix-blob rounded-sm",
                      hasColor ? "border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none" : "border-dashed border-black/30 bg-[#EEE] hover:border-black",
                      isMatched && !showWin && "ring-2 md:ring-4 ring-green-500 ring-offset-1 md:ring-offset-2 animate-pulse"
                    )}
                    style={{ backgroundColor: hasColor ? hexColor : 'transparent' }}
                  >
                    {!hasColor && <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] text-black/20 font-bold pointer-events-none uppercase">Empty</span>}
                    
                    {/* Ingredients display */}
                    {hasColor && (
                      <div className="absolute top-0.5 left-0.5 right-0.5 sm:top-1 sm:left-1 sm:right-1 flex h-1 sm:h-2 rounded-[1px] overflow-hidden shadow-inner border border-black/20 bg-white group-hover:opacity-100 opacity-60 transition-opacity">
                        {Object.entries(blobCounts).map(([c, count]) => (
                          <div 
                            key={c} 
                            style={{ 
                              width: `${(count / blob.length) * 100}%`, 
                              backgroundColor: BASE_COLORS[c]?.hex 
                            }} 
                            title={`${BASE_COLORS[c]?.name}: ${Math.round((count / blob.length) * 100)}%`}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Source Pigments & Current Tool */}
          <section className="flex flex-row gap-2 md:gap-4 h-24 sm:h-28 md:h-32 shrink-0">
            <div className="flex-1 bg-[#FAF9F6] p-2 md:p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-y-auto w-0">
              <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest border-b-2 border-black pb-1 mb-2 shrink-0">Source Pigments</h3>
              <div className="flex flex-wrap gap-4 items-center justify-start flex-1 min-h-0 overflow-y-auto">
                {Object.values(BASE_COLORS).map(color => {
                  const isSelected = activeTool?.type === 'source' && activeTool.id === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => setActiveTool({ type: 'source', id: color.id })}
                      className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 shrink-0 border-2 border-black transition-all group flex flex-col focus:outline-none relative",
                        isSelected
                          ? "shadow-none translate-x-[1px] translate-y-[1px] ring-2 ring-black ring-offset-1" 
                          : "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                      )}
                    >
                      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: color.hex }} />
                    </button>
                  )
                })}
                <div className="w-px h-6 border-l-2 border-black border-dashed mx-1" />
                <button
                  onClick={() => setActiveTool({ type: 'eraser' })}
                  className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 shrink-0 border-2 border-black bg-white transition-all flex items-center justify-center focus:outline-none text-[6px] sm:text-[8px] font-bold uppercase ring-offset-[#FAF9F6] relative",
                    activeTool?.type === 'eraser'
                       ? "shadow-none translate-x-[1px] translate-y-[1px] ring-2 ring-black ring-offset-1 bg-black text-white" 
                       : "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none hover:bg-black hover:text-white"
                  )}
                  title="Eraser / Clean Rag"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute w-2/3 h-0.5 bg-red-600 rotate-45" />
                    <div className="absolute w-2/3 h-0.5 bg-red-600 -rotate-45" />
                  </div>
                  RAG
                </button>
              </div>
            </div>

            <div className="w-20 sm:w-28 md:w-36 bg-[#FAF9F6] p-2 md:p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center shrink-0">
              <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2 w-full text-center shrink-0 border-b-2 border-black pb-1">Tool</h3>
              <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
                <button 
                  onClick={() => setActiveTool(null)}
                  className={cn(
                    "relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border-2 border-black flex shrink-0 items-center justify-center transition-all bg-white",
                    !activeTool ? "shadow-none translate-x-[1px] translate-y-[1px] bg-black/5" : "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                  )}
                >
                  {!activeTool && <div className="text-[6px] sm:text-[8px] font-bold opacity-30 uppercase">None</div>}
                  {activeTool?.type === 'eraser' && <span className="text-[6px] sm:text-[8px] font-bold">RAG</span>}
                  {activeTool && activeTool.type !== 'eraser' && activeColor !== 'transparent' && (
                    <div className="absolute inset-0" style={{ backgroundColor: activeColor }} />
                  )}
                </button>
                {activeTool !== null && (
                  <button 
                    onClick={() => setActiveTool(null)}
                    className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mt-1 hover:text-[#FF3E3E] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </section>

        </main>
      )}

      {pendingPhoto && (
        <ImageEditorModal
          file={pendingPhoto}
          onCancel={() => setPendingPhoto(null)}
          onCreate={handlePhotoCreate}
        />
      )}

      <ConfirmationModal
        isOpen={!!levelToDelete}
        title="Destroy Masterpiece?"
        message={`This action will permanently erase "${levelToDelete?.name}" from your collection. This cannot be undone.`}
        confirmLabel="Erase Forever"
        cancelLabel="Keep It"
        onConfirm={confirmDelete}
        onCancel={() => setLevelToDelete(null)}
        variant="danger"
      />

      <LevelOptionsModal
        isOpen={!!selectedLevelForOptions}
        level={selectedLevelForOptions?.lvl || null}
        isCustom={selectedLevelForOptions ? customLevels.some(c => c.id === selectedLevelForOptions.lvl.id) : false}
        onClose={() => setSelectedLevelForOptions(null)}
        onPlay={() => handleStartLevel(selectedLevelForOptions!.index)}
        onDownload={() => {
          if (selectedLevelForOptions) {
            // Create a fake event for compatibility with downloadPixelatedImage
            const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
            downloadPixelatedImage(fakeEvent, selectedLevelForOptions.lvl);
          }
        }}
        onDelete={() => {
          if (selectedLevelForOptions) {
            setLevelToDelete(selectedLevelForOptions.lvl);
          }
        }}
      />
      
      <footer className="h-12 border-t-2 border-black bg-black text-white flex items-center px-4 sm:px-8 justify-between text-[10px] font-mono uppercase tracking-[0.2em] sm:tracking-[0.3em]">
        <div className="hidden sm:block">User: Guest User</div>
        <button 
          onClick={() => {
            if(confirm('Reset all gallery progress?')) {
              setCompletedLevels([]);
              localStorage.removeItem('chromatica_completed');
            }
          }}
          className="hover:text-[#FF3E3E] transition-colors"
        >
          Reset Progress
        </button>
      </footer>
    </div>
  );
}


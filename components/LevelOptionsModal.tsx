'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Download, Trash2, X } from 'lucide-react';
import { Level } from '@/lib/levels';

interface LevelOptionsModalProps {
  isOpen: boolean;
  level: Level | null;
  onClose: () => void;
  onPlay: () => void;
  onDownload: () => void;
  onDelete: () => void;
  isCustom: boolean;
}

export function LevelOptionsModal({
  isOpen,
  level,
  onClose,
  onPlay,
  onDownload,
  onDelete,
  isCustom
}: LevelOptionsModalProps) {
  if (!isOpen || !level) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#F3F0E8] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-black text-white p-4 flex justify-between items-center">
            <h3 className="font-black uppercase tracking-tighter text-xl truncate pr-4">
              {level.name}
            </h3>
            <button 
              onClick={onClose}
              className="hover:text-[#FF3E3E] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 flex flex-col gap-4">
            <button
              onClick={() => {
                onPlay();
                onClose();
              }}
              className="flex items-center gap-4 bg-[#FFD73E] border-4 border-black p-4 font-black uppercase tracking-tight hover:-translate-y-1 hover:translate-x-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
            >
              <div className="w-10 h-10 bg-black flex items-center justify-center rounded-full shrink-0">
                <Play className="w-5 h-5 text-[#FFD73E] fill-[#FFD73E] ml-1" />
              </div>
              <div className="text-left">
                <div className="text-lg leading-none">Play / Restore</div>
                <div className="text-[10px] font-bold opacity-60 normal-case tracking-normal">Start color-mixing process</div>
              </div>
            </button>

            <button
              onClick={() => {
                onDownload();
                onClose();
              }}
              className="flex items-center gap-4 bg-white border-4 border-black p-4 font-black uppercase tracking-tight hover:-translate-y-1 hover:translate-x-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
            >
              <div className="w-10 h-10 border-2 border-black flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-black" />
              </div>
              <div className="text-left">
                <div className="text-lg leading-none">Export PNG</div>
                <div className="text-[10px] font-bold opacity-60 normal-case tracking-normal">Download hi-res blueprint</div>
              </div>
            </button>

            {isCustom && (
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="flex items-center gap-4 bg-[#FF3E3E]/10 border-4 border-black p-4 font-black uppercase tracking-tight hover:bg-[#FF3E3E] hover:text-white transition-all group"
              >
                <div className="w-10 h-10 border-2 border-black flex items-center justify-center shrink-0 group-hover:border-white">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-lg leading-none">Destroy</div>
                  <div className="text-[10px] font-bold opacity-60 group-hover:opacity-100 normal-case tracking-normal">Remove from archives</div>
                </div>
              </button>
            )}

            <button
              onClick={onClose}
              className="mt-2 text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

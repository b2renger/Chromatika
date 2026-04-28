import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-[#F3F0E8] border-4 border-black p-6 md:p-8 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-10"
          >
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-3 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                variant === 'danger' ? 'bg-[#FF3E3E]' : variant === 'warning' ? 'bg-[#FFD73E]' : 'bg-[#3E98FF]'
              }`}>
                <AlertTriangle className="w-8 h-8 text-black" />
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tight leading-none pt-2">
                {title}
              </h2>

              <p className="font-medium text-black/70">
                {message}
              </p>

              <div className="grid grid-cols-2 gap-4 w-full pt-4">
                <button
                  onClick={onCancel}
                  className="px-4 py-3 border-2 border-black font-bold uppercase tracking-widest hover:bg-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 bg-white"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`px-4 py-3 border-2 border-black text-black font-bold uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 ${
                    variant === 'danger' ? 'bg-[#FF3E3E] hover:bg-[#FF1A1A]' : variant === 'warning' ? 'bg-[#FFD73E] hover:bg-[#FFCC00]' : 'bg-[#3E98FF] hover:bg-[#1A77FF]'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

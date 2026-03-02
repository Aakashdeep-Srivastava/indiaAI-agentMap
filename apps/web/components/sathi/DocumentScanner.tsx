"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DocumentScannerProps {
  onFileSelect: (file: File) => void;
  onSkip: () => void;
  verifying: boolean;
  uploadedFile: File | null;
}

export default function DocumentScanner({
  onFileSelect,
  onSkip,
  verifying,
  uploadedFile,
}: DocumentScannerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }

  if (verifying || uploadedFile) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl border border-brand-200 bg-brand-50/30 p-6">
        {verifying && <div className="scan-line" />}
        <div className="flex flex-col items-center gap-3 text-center">
          {verifying ? (
            <>
              <svg className="h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium text-brand-500">
                Scanning with Sarvam Vision...
              </p>
            </>
          ) : (
            <>
              <svg className="h-8 w-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-sm font-medium text-emerald-600">
                {uploadedFile?.name} verified
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <p className="text-center text-xs font-medium text-surface-500">
        Upload your Udyam certificate for verification
      </p>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all ${
            dragActive
              ? "border-brand-500 bg-brand-50"
              : "border-surface-300 bg-surface-50/50 hover:border-brand-400 hover:bg-brand-50/30"
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <svg
            className="h-10 w-10 text-surface-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-brand-900">
              Drop file or click to upload
            </p>
            <p className="mt-0.5 text-[11px] text-surface-400">
              Udyam / GST / PAN (Image or PDF)
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={onSkip}
        className="mx-auto block text-xs text-surface-400 transition-colors hover:text-surface-600"
      >
        Skip for now
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

"use client";

import { useCallback, useState, useRef } from "react";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sessionIdAtom, uploadMetaAtom, mappingsConfirmedAtom } from "@/store/atoms";
import { uploadCSV } from "@/lib/api";

export default function FileUpload() {
  const [, setSessionId] = useAtom(sessionIdAtom);
  const [, setUploadMeta] = useAtom(uploadMetaAtom);
  const [, setMappingsConfirmed] = useAtom(mappingsConfirmedAtom);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx")) {
        setError("Please upload a CSV or XLSX file");
        return;
      }
      setError(null);
      setFileName(file.name);
      setUploading(true);
      setUploadPct(0);
      setProcessing(false);

      try {
        const uploadStart = Date.now();
        const data = await uploadCSV(file, (pct) => {
          setUploadPct(pct);
          if (pct >= 100) setProcessing(true);
        });

        // Ensure the processing state is visible for at least 600ms
        // so users get feedback even on fast local uploads
        const elapsed = Date.now() - uploadStart;
        const minDisplay = 600;
        if (elapsed < minDisplay) {
          setProcessing(true);
          await new Promise((r) => setTimeout(r, minDisplay - elapsed));
        }

        setSessionId(data.session_id as string);
        setUploadMeta(data as never);
        setMappingsConfirmed(false);
        router.push(`/preview?session=${data.session_id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setUploading(false);
        setProcessing(false);
      }
    },
    [setSessionId, setUploadMeta, setMappingsConfirmed, router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`
        relative rounded-xl border p-10 text-center transition-all duration-200
        ${uploading ? "" : "cursor-pointer"}
        ${
          dragOver
            ? "border-indigo-400 bg-indigo-50/80 shadow-lg shadow-indigo-500/10"
            : "card hover:border-zinc-300 hover:shadow-[0_2px_8px_-2px_rgb(0_0_0/0.08)]"
        }
      `}
      whileHover={uploading ? {} : { scale: 1.01, y: -2 }}
      whileTap={uploading ? {} : { scale: 0.99 }}
      transition={{ duration: 0.2 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        onChange={onFileSelect}
        className="hidden"
      />

      {uploading ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-zinc-700">
            {processing ? `Processing ${fileName}...` : `Uploading ${fileName}...`}
          </p>

          {/* Progress bar */}
          <div className="w-full max-w-xs mx-auto">
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              {processing ? (
                <div className="h-full rounded-full bg-indigo-500 progress-indeterminate" />
              ) : (
                <motion.div
                  className="h-full rounded-full bg-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadPct}%` }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              {processing ? "Analyzing columns..." : `${uploadPct}%`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="mx-auto w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center">
            <svg
              className="text-zinc-500"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="text-zinc-700 text-sm font-medium">Drop your CSV or XLSX file here</p>
            <p className="text-zinc-400 text-sm mt-1">or click to browse</p>
            <p className="text-zinc-400 text-xs mt-2">
              Max file size: 50 MB &middot; Up to 500k rows
            </p>
          </div>
        </div>
      )}

      {error && (
        <motion.p
          className="mt-3 text-sm text-red-500"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}

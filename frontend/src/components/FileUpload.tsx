"use client";

import { useCallback, useState, useRef } from "react";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { sessionIdAtom } from "@/store/atoms";
import { uploadCSV } from "@/lib/api";

export default function FileUpload() {
  const [, setSessionId] = useAtom(sessionIdAtom);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setError("Please upload a CSV file");
        return;
      }
      setError(null);
      setFileName(file.name);
      setUploading(true);

      try {
        const data = await uploadCSV(file);
        setSessionId(data.session_id);
        router.push(`/arena?session=${data.session_id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setUploading(false);
      }
    },
    [setSessionId, router]
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
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all
        ${
          dragOver
            ? "border-blue-500 bg-blue-500/5"
            : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={onFileSelect}
        className="hidden"
      />

      {uploading ? (
        <div className="space-y-3">
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">
            Uploading {fileName}...
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <svg
            className="mx-auto text-zinc-600"
            width="48"
            height="48"
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
          <div>
            <p className="text-zinc-300 font-medium">
              Drop your CSV file here
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              or click to browse
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

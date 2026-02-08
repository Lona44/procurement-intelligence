"use client";

import FileUpload from "@/components/FileUpload";
import SessionList from "@/components/SessionList";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            Agent Arena
            <span className="text-blue-500"> Battle</span>
          </h1>
          <p className="text-zinc-400 text-lg">
            3 AI agents race to find the best procurement savings.
            <br />
            Upload your spend data and watch them compete.
          </p>
        </div>

        <FileUpload />

        <SessionList />

        <div className="text-center space-y-2">
          <p className="text-zinc-600 text-xs">
            Accepts CSV files with columns: Date, Vendor, Category, Amount, Department
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Conservative
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Aggressive
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Balanced
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

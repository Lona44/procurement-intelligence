"use client";

import FileUpload from "@/components/FileUpload";
import SessionList from "@/components/SessionList";
import Link from "next/link";
import { motion } from "framer-motion";
import { EASE, ANIM } from "@/lib/constants";

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-grid flex flex-col items-center justify-start pt-4 px-4">
      <div className="max-w-xl w-full space-y-10">
        <motion.div
          className="text-center space-y-4"
          {...ANIM.fadeInUp}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cdn.dribbble.com/userupload/22227114/file/original-d1dff1c5d28f4206fe0382935e4c2d4a.gif"
            alt="Agent Arena"
            className="w-80 h-80 mx-auto object-contain rounded-2xl mix-blend-multiply -mb-4 opacity-0"
            style={{ animation: "fade-in 1.2s ease 0.3s forwards" }}
          />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 border border-zinc-200 bg-white rounded-full px-3 py-1 mb-2 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] hover:border-zinc-300 hover:shadow-[0_1px_3px_0_rgb(0_0_0/0.06)] transition-all"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Multi-agent analysis
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Agent Arena</h1>
          <p className="text-zinc-500 text-base leading-relaxed max-w-md mx-auto text-balance">
            Three AI agents analyze your procurement spend data with different risk strategies, then
            surface actionable savings.
          </p>
        </motion.div>

        <motion.div {...ANIM.fadeInUp} transition={{ duration: 0.5, delay: 0.15, ease: EASE }}>
          <FileUpload />
        </motion.div>

        <motion.div {...ANIM.fadeInUp} transition={{ duration: 0.5, delay: 0.3, ease: EASE }}>
          <SessionList />
        </motion.div>

        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
        >
          <p className="text-zinc-400 text-sm">
            Accepts CSV or XLSX files with columns: Date, Vendor, Category, Amount, Department
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Conservative
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Aggressive
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Balanced
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sessionIdAtom, dataSummaryAtom, arenaStartedAtom } from "@/store/atoms";
import { getDataSummary } from "@/lib/api";
import { EASE, ANIM } from "@/lib/constants";
import DataOverview from "@/components/DataOverview";
import LoadingSpinner from "@/components/LoadingSpinner";

function PreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useAtom(sessionIdAtom);
  const [, setDataSummary] = useAtom(dataSummaryAtom);
  const [, setArenaStarted] = useAtom(arenaStartedAtom);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const paramSession = searchParams.get("session");
    if (paramSession && paramSession !== sessionId) {
      setSessionId(paramSession);
    }
    if (!paramSession && !sessionId) {
      router.push("/upload");
    }
  }, [searchParams, sessionId, setSessionId, router]);

  useEffect(() => {
    const sid = sessionId || searchParams.get("session");
    if (!sid) return;
    setLoading(true);
    getDataSummary(sid)
      .then((data) => {
        setDataSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load data summary:", err);
        setError("Failed to load data summary");
        setLoading(false);
      });
  }, [sessionId, searchParams, setDataSummary]);

  const handleConfirm = () => {
    const sid = sessionId || searchParams.get("session");
    if (!sid) return;
    setArenaStarted(false);
    router.push(`/arena?session=${sid}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Loading data preview..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => router.push("/upload")}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-grid p-6 lg:p-8 max-w-[1400px] mx-auto">
      <motion.div
        className="flex items-center justify-between mb-8"
        {...ANIM.fadeInUp}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Data Preview
          </h1>
          <p className="text-base text-zinc-500 mt-1.5">
            Review your data before starting agent analysis
          </p>
        </div>
        <motion.button
          onClick={() => router.push("/upload")}
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-all px-4 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] hover:shadow-[0_2px_4px_0_rgb(0_0_0/0.06)]"
          {...ANIM.buttonTap}
        >
          Back
        </motion.button>
      </motion.div>

      <motion.div {...ANIM.fadeInUp} transition={{ duration: 0.5, delay: 0.15, ease: EASE }}>
        <DataOverview />
      </motion.div>

      <motion.div
        className="card p-6 mt-2"
        {...ANIM.fadeInUp}
        transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-zinc-800">Ready to analyze?</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Three AI agents will analyze your data with different strategies. This will use API
              credits.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => router.push("/upload")}
              className="text-sm text-zinc-500 hover:text-zinc-700 transition-all px-4 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]"
              {...ANIM.buttonTap}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleConfirm}
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all px-5 py-2 rounded-lg shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/25"
              {...ANIM.buttonTap}
            >
              Start Analysis
            </motion.button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-zinc-500">
          Loading preview...
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}

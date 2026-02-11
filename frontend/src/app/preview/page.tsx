"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useAtom } from "jotai";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  sessionIdAtom,
  dataSummaryAtom,
  arenaStartedAtom,
  uploadMetaAtom,
  mappingsConfirmedAtom,
} from "@/store/atoms";
import { getDataSummary, confirmMappings } from "@/lib/api";
import { EASE, ANIM } from "@/lib/constants";
import DataOverview from "@/components/DataOverview";
import ColumnMapping from "@/components/ColumnMapping";
import DataQualityTable from "@/components/DataQualityTable";
import LoadingSpinner from "@/components/LoadingSpinner";

function PreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useAtom(sessionIdAtom);
  const [, setDataSummary] = useAtom(dataSummaryAtom);
  const [, setArenaStarted] = useAtom(arenaStartedAtom);
  const [uploadMeta] = useAtom(uploadMetaAtom);
  const [mappingsConfirmed, setMappingsConfirmed] = useAtom(mappingsConfirmedAtom);
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
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

  // If mappings already confirmed (returning to page), load summary
  useEffect(() => {
    if (!mappingsConfirmed) return;
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
  }, [mappingsConfirmed, sessionId, searchParams, setDataSummary]);

  // Returning from session list: no uploadMeta, but backend may have a summary
  useEffect(() => {
    if (mappingsConfirmed || uploadMeta) return;
    const sid = sessionId || searchParams.get("session");
    if (!sid) return;
    setLoading(true);
    getDataSummary(sid)
      .then((data) => {
        setDataSummary(data);
        setMappingsConfirmed(true);
        setLoading(false);
      })
      .catch(() => {
        // No summary yet — session exists but mappings not confirmed; redirect to upload
        setLoading(false);
        router.push("/upload");
      });
  }, [
    sessionId,
    searchParams,
    uploadMeta,
    mappingsConfirmed,
    setDataSummary,
    setMappingsConfirmed,
    router,
  ]);

  const handleConfirmMappings = useCallback(
    async (mappings: Record<string, string>) => {
      const sid = sessionId || searchParams.get("session");
      if (!sid) return;
      setConfirmLoading(true);
      setError(null);
      try {
        const summary = await confirmMappings(sid, mappings);
        setDataSummary(summary);
        setMappingsConfirmed(true);
      } catch (err) {
        console.error("Failed to confirm mappings:", err);
        setError(err instanceof Error ? err.message : "Failed to confirm mappings");
      } finally {
        setConfirmLoading(false);
      }
    },
    [sessionId, searchParams, setDataSummary, setMappingsConfirmed]
  );

  const handleStartAnalysis = () => {
    const sid = sessionId || searchParams.get("session");
    if (!sid) return;
    setArenaStarted(false);
    router.push(`/arena?session=${sid}`);
  };

  const handleBackToMapping = () => {
    setMappingsConfirmed(false);
    setDataSummary(null);
  };

  // Phase 1: Column Mapping (not yet confirmed)
  if (!mappingsConfirmed) {
    if (!uploadMeta) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-sm text-zinc-500">No upload data found.</p>
            <button
              onClick={() => router.push("/upload")}
              className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Upload a file
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
              Column Mapping
            </h1>
            <p className="text-base text-zinc-500 mt-1.5">
              Map your columns and review data quality for{" "}
              <span className="font-medium text-zinc-700">{uploadMeta.filename}</span> (
              {uploadMeta.row_count.toLocaleString()} rows)
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

        <motion.div
          className="space-y-4"
          {...ANIM.fadeInUp}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
        >
          <ColumnMapping
            columns={uploadMeta.columns}
            suggestedMappings={uploadMeta.suggested_mappings}
            onConfirm={handleConfirmMappings}
            loading={confirmLoading}
          />

          <DataQualityTable stats={uploadMeta.column_stats} rowCount={uploadMeta.row_count} />
        </motion.div>

        {error && (
          <motion.p
            className="mt-4 text-sm text-red-500 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}
      </main>
    );
  }

  // Phase 2: Data Overview (mappings confirmed)
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
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleBackToMapping}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-all px-4 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] hover:shadow-[0_2px_4px_0_rgb(0_0_0/0.06)]"
            {...ANIM.buttonTap}
          >
            Back to mapping
          </motion.button>
          <motion.button
            onClick={() => router.push("/upload")}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-all px-4 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] hover:shadow-[0_2px_4px_0_rgb(0_0_0/0.06)]"
            {...ANIM.buttonTap}
          >
            New Upload
          </motion.button>
        </div>
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
              onClick={handleStartAnalysis}
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

"use client";

import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sessionIdAtom, arenaStartedAtom } from "@/store/atoms";
import { getSessions } from "@/lib/api";

interface Session {
  session_id: string;
  filename: string;
  created_at: string;
  row_count: number;
  total_spend: number;
  vote_count: number;
}

export default function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [, setSessionId] = useAtom(sessionIdAtom);
  const [, setArenaStarted] = useAtom(arenaStartedAtom);
  const router = useRouter();

  useEffect(() => {
    getSessions()
      .then((data) => setSessions(data.sessions))
      .catch((err) => console.warn("[SessionList] Failed to load sessions:", err));
  }, []);

  if (sessions.length === 0) return null;

  const handleRerun = (session: Session) => {
    setArenaStarted(false);
    setSessionId(session.session_id);
    router.push(`/preview?session=${session.session_id}`);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
        Previous analyses
      </h2>
      <div className="space-y-1.5">
        {sessions.map((s, i) => (
          <motion.button
            key={s.session_id}
            onClick={() => handleRerun(s)}
            className="w-full text-left bg-white border border-zinc-200 rounded-lg px-4 py-3 transition-all duration-150 group shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] hover:shadow-[0_2px_8px_-2px_rgb(0_0_0/0.08)] hover:border-zinc-300"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            whileHover={{ x: 4 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-700 font-medium group-hover:text-zinc-900 truncate transition-colors">
                {s.filename}
              </span>
              <svg
                className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0 ml-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-zinc-500">
              <span>{s.row_count} rows</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span>${s.total_spend.toLocaleString()}</span>
              {s.vote_count > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span className="text-indigo-500">
                    {s.vote_count} {s.vote_count === 1 ? "vote" : "votes"}
                  </span>
                </>
              )}
              <span className="ml-auto">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

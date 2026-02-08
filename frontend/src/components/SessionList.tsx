"use client";

import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
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
      .catch(() => {});
  }, []);

  if (sessions.length === 0) return null;

  const handleRerun = (session: Session) => {
    setArenaStarted(false);
    setSessionId(session.session_id);
    router.push(`/arena?session=${session.session_id}`);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-zinc-400 text-center">
        Previous Analyses
      </h2>
      <div className="space-y-2">
        {sessions.map((s) => (
          <button
            key={s.session_id}
            onClick={() => handleRerun(s)}
            className="w-full text-left bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg px-4 py-3 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-200 font-medium group-hover:text-white truncate">
                {s.filename}
              </span>
              <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                Re-run
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
              <span>{s.row_count} rows</span>
              <span>${s.total_spend.toLocaleString()}</span>
              {s.vote_count > 0 && (
                <span className="text-amber-500">
                  {s.vote_count} {s.vote_count === 1 ? "vote" : "votes"} saved
                </span>
              )}
              <span className="ml-auto">
                {new Date(s.created_at).toLocaleString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

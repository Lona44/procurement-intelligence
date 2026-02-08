"use client";

import { useAtom } from "jotai";
import { sessionIdAtom, votesAtom, votedRecsAtom } from "@/store/atoms";
import { castVote } from "@/lib/api";
import type { AgentType, Recommendation, Votes } from "@/types";

interface VotePanelProps {
  agentType: AgentType;
  accentColor: string;
  recommendation: Recommendation;
}

export default function VotePanel({
  agentType,
  accentColor,
  recommendation,
}: VotePanelProps) {
  const [sessionId] = useAtom(sessionIdAtom);
  const [, setVotes] = useAtom(votesAtom);
  const [votedRecs, setVotedRecs] = useAtom(votedRecsAtom);

  const alreadyVoted = votedRecs.some(
    (v) => v.recommendationId === recommendation.id && v.agentType === agentType
  );

  const handleVote = async () => {
    if (!sessionId || alreadyVoted) return;
    try {
      const res = await castVote(
        sessionId,
        agentType,
        recommendation.id,
        recommendation.title,
        recommendation.description
      );
      setVotes(res.votes as Votes);
      setVotedRecs((prev) => [
        ...prev,
        { agentType, recommendationId: recommendation.id },
      ]);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={alreadyVoted}
      title={alreadyVoted ? "Already voted" : "Vote for this recommendation"}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-default hover:scale-105 active:scale-95 shrink-0"
      style={{
        backgroundColor: alreadyVoted ? `${accentColor}30` : `${accentColor}15`,
        color: accentColor,
        borderWidth: 1,
        borderColor: alreadyVoted ? accentColor : `${accentColor}30`,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill={alreadyVoted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 10v12" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
      </svg>
      {alreadyVoted ? "Voted" : "Vote"}
    </button>
  );
}

"use client";

import { useAtom } from "jotai";
import { sessionIdAtom, votesAtom, votedRecsAtom } from "@/store/atoms";
import { castVote } from "@/lib/api";
import type { AgentType, Recommendation, Votes } from "@/types";

interface VotePanelProps {
  agentType: AgentType;
  recommendation: Recommendation;
}

export default function VotePanel({ agentType, recommendation }: VotePanelProps) {
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
      setVotedRecs((prev) => [...prev, { agentType, recommendationId: recommendation.id }]);
    } catch (err) {
      console.warn("[VotePanel] Vote failed:", err);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={alreadyVoted}
      title={alreadyVoted ? "Already voted" : "Upvote this recommendation"}
      className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium transition-all
        disabled:cursor-default
        ${
          alreadyVoted
            ? "bg-zinc-100 text-zinc-400 border border-zinc-200"
            : "bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] hover:shadow-[0_1px_3px_0_rgb(0_0_0/0.06)]"
        }
      `}
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
        <path d="m18 15-6-6-6 6" />
      </svg>
      {alreadyVoted ? "Voted" : "Upvote"}
    </button>
  );
}

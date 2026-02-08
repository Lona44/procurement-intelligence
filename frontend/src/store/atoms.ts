import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { AgentState, AgentType, Votes, VotedRec } from "@/types";

export const sessionIdAtom = atom<string | null>(null);

const defaultAgentState = (type: AgentType): AgentState => ({
  type,
  status: "idle",
  progress: 0,
  steps: [],
  recommendations: [],
  total_savings: 0,
  summary: "",
});

export const agentAtomFamily = atomFamily((type: AgentType) =>
  atom<AgentState>(defaultAgentState(type))
);

export const votesAtom = atom<Votes>({
  conservative: 0,
  aggressive: 0,
  balanced: 0,
});

export const arenaStartedAtom = atom<boolean>(false);

export const votedRecsAtom = atom<VotedRec[]>([]);

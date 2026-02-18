import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { AgentState, AgentType, Votes, VotedRec, DataSummary, UploadResponse } from "@/types";

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

export const dataSummaryAtom = atom<DataSummary | null>(null);

export const uploadMetaAtom = atom<UploadResponse | null>(null);

export const mappingsConfirmedAtom = atom<boolean>(false);

/** Tracks whether the backend returned mock results (and why). */
export const mockModeAtom = atom<{ active: boolean; reason: string }>({
  active: false,
  reason: "",
});

/** Derived atom — true when all three agents have status "complete". */
export const allAgentsCompleteAtom = atom<boolean>((get) => {
  const types: AgentType[] = ["conservative", "aggressive", "balanced"];
  return types.every((t) => get(agentAtomFamily(t)).status === "complete");
});

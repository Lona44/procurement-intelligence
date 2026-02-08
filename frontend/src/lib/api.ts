const API_BASE = "http://localhost:8000";

export async function uploadCSV(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

export async function castVote(
  sessionId: string,
  agentType: string,
  recommendationId: string,
  recommendationTitle: string,
  recommendationDescription: string
) {
  const res = await fetch(`${API_BASE}/api/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      agent_type: agentType,
      recommendation_id: recommendationId,
      recommendation_title: recommendationTitle,
      recommendation_description: recommendationDescription,
    }),
  });

  if (!res.ok) throw new Error("Vote failed");
  return res.json();
}

export async function getVotes(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/votes/${sessionId}`);
  if (!res.ok) throw new Error("Failed to get votes");
  return res.json();
}

export async function getSessions() {
  const res = await fetch(`${API_BASE}/api/sessions`);
  if (!res.ok) throw new Error("Failed to get sessions");
  return res.json();
}

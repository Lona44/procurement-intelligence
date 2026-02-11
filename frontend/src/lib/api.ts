import type { AgentResult } from "@/types";
import { API_BASE } from "./constants";

export async function uploadCSV(
  file: File,
  onProgress?: (pct: number) => void
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.detail || "Upload failed"));
        }
      } catch {
        reject(new Error("Upload failed"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));

    xhr.open("POST", `${API_BASE}/api/upload`);
    xhr.send(formData);
  });
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

export async function deleteSession(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete session");
  return res.json();
}

export async function getDataSummary(sessionId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/api/summary/${sessionId}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to get data summary");
  return res.json();
}

export async function confirmMappings(sessionId: string, mappings: Record<string, string>) {
  const res = await fetch(`${API_BASE}/api/confirm-mappings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, mappings }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Mapping failed" }));
    throw new Error(err.detail || "Failed to confirm mappings");
  }

  return res.json();
}

export async function exportReport(
  sessionId: string,
  agents: AgentResult[],
  votedRecommendationIds: string[]
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_BASE}/api/report/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agents,
      voted_recommendation_ids: votedRecommendationIds,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Report generation failed" }));
    throw new Error(err.detail || "Failed to generate report");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="(.+?)"/);
  const filename = match ? match[1] : "procurement_report.pdf";

  return { blob, filename };
}

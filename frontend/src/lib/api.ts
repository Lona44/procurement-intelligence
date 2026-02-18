import type { DataSummary, Votes } from "@/types";
import { API_BASE } from "./constants";

/** Typed fetch wrapper — sends JSON and returns parsed JSON. */
async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  errorMsg = "Request failed"
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(errorMsg);
  return res.json() as Promise<T>;
}

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

export async function startDemo(): Promise<{ session_id: string }> {
  return fetchJson<{ session_id: string }>(
    "/api/demo/start",
    { method: "POST" },
    "Demo start failed"
  );
}

export async function castVote(
  sessionId: string,
  agentType: string,
  recommendationId: string,
  recommendationTitle: string,
  recommendationDescription: string
) {
  return fetchJson<{ votes: Votes }>(
    "/api/vote",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        agent_type: agentType,
        recommendation_id: recommendationId,
        recommendation_title: recommendationTitle,
        recommendation_description: recommendationDescription,
      }),
    },
    "Vote failed"
  );
}

export async function getVotes(sessionId: string) {
  return fetchJson<{ votes: Votes }>(`/api/votes/${sessionId}`, undefined, "Failed to get votes");
}

export async function getSessions() {
  return fetchJson<{
    sessions: {
      session_id: string;
      filename: string;
      created_at: string;
      row_count: number;
      total_spend: number;
      vote_count: number;
      has_report: boolean;
    }[];
  }>(`/api/sessions`, undefined, "Failed to get sessions");
}

export async function deleteSession(sessionId: string) {
  return fetchJson<{ status: string }>(
    `/api/sessions/${sessionId}`,
    { method: "DELETE" },
    "Failed to delete session"
  );
}

export async function getDataSummary(sessionId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const qs = params.toString();
  return fetchJson<DataSummary>(
    `/api/summary/${sessionId}${qs ? `?${qs}` : ""}`,
    undefined,
    "Failed to get data summary"
  );
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

export async function exportReport(sessionId: string): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_BASE}/api/report/${sessionId}`);

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

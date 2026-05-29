import crypto from "crypto";
import { readJson, writeJson } from "./fileStore.js";

export async function trackEvent(analyticsPath, type, payload = {}) {
  const analytics = await readJson(analyticsPath, []);
  analytics.push({
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString()
  });
  await writeJson(analyticsPath, analytics.slice(-1000));
}

export function summarizeAnalytics(events) {
  const searches = events.filter((event) => event.type === "search");
  const requests = events.filter((event) => event.type === "request");

  const topQueries = {};
  searches.forEach((event) => {
    const q = event.payload?.q || "";
    topQueries[q] = (topQueries[q] || 0) + 1;
  });

  return {
    totalEvents: events.length,
    totalSearches: searches.length,
    totalRequests: requests.length,
    topQueries: Object.entries(topQueries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }))
  };
}

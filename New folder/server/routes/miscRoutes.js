import express from "express";
import crypto from "crypto";
import { readJson, writeJson, normalizeText } from "../services/fileStore.js";
import { trackEvent, summarizeAnalytics } from "../services/analytics.js";

export default function miscRoutes(paths) {
  const router = express.Router();

  router.get("/health", (req, res) => {
    res.json({ ok: true, service: "LearnSphere API", time: new Date().toISOString() });
  });

  router.get("/recommendations", async (req, res) => {
    const catalog = await readJson(paths.catalogPath, []);

    res.json({
      trending: [...catalog].sort((a, b) => b.trending_score - a.trending_score).slice(0, 5),
      highlyRated: [...catalog].sort((a, b) => b.rating - a.rating).slice(0, 5),
      studentMode: catalog.filter((item) => item.mode?.includes("student")).slice(0, 5),
      freeOrPublic: catalog.filter((item) =>
        normalizeText(item.access_type).includes("free") ||
        normalizeText(item.access_type).includes("public domain")
      ).slice(0, 5)
    });
  });

  router.post("/requests", async (req, res) => {
    const { title, note } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const requests = await readJson(paths.requestsPath, []);
    const newRequest = {
      id: crypto.randomUUID(),
      title,
      note: note || "",
      createdAt: new Date().toISOString()
    };

    requests.push(newRequest);
    await writeJson(paths.requestsPath, requests);
    await trackEvent(paths.analyticsPath, "request", { title, note });

    res.status(201).json(newRequest);
  });

  router.get("/requests", async (req, res) => {
    const requests = await readJson(paths.requestsPath, []);
    res.json({ count: requests.length, items: requests });
  });

  router.post("/analytics", async (req, res) => {
    await trackEvent(paths.analyticsPath, req.body.type || "custom", req.body.payload || {});
    res.json({ ok: true });
  });

  router.get("/analytics/summary", async (req, res) => {
    const analytics = await readJson(paths.analyticsPath, []);
    res.json(summarizeAnalytics(analytics));
  });

  router.get("/account/demo", (req, res) => {
    res.json({
      signedIn: false,
      message: "User accounts are a placeholder in V6. Add OAuth or email login later.",
      plannedFeatures: ["Bookmarks", "Reading lists", "Search history", "Saved learning paths"]
    });
  });

  router.get("/admin/demo", async (req, res) => {
    const catalog = await readJson(paths.catalogPath, []);
    const requests = await readJson(paths.requestsPath, []);
    const analytics = await readJson(paths.analyticsPath, []);
    res.json({
      message: "Admin dashboard placeholder.",
      counts: {
        catalogItems: catalog.length,
        requests: requests.length,
        analyticsEvents: analytics.length
      },
      nextAdminFeatures: ["Approve new sources", "Merge duplicate books", "Moderate requests", "Verify legal access"]
    });
  });

  return router;
}

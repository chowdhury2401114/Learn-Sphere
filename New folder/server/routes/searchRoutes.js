import express from "express";
import { readJson, normalizeText } from "../services/fileStore.js";
import { trackEvent } from "../services/analytics.js";
import {
  normalizeOpenLibrary,
  normalizeGoogleBook,
  normalizeWikipedia,
  normalizeGutenberg,
  makeWorldCatUrl
} from "../services/externalSources.js";
import { generateLocalAnswer } from "../services/aiAnswer.js";

export default function searchRoutes(paths, config) {
  const router = express.Router();

  function searchLocalCatalog(items, query, mode = "") {
    const q = normalizeText(query);

    return items.filter((item) => {
      const text = [
        item.title,
        item.authors?.join(" "),
        item.category,
        item.type,
        item.description,
        item.tags?.join(" "),
        item.sources?.join(" "),
        item.related_topics?.join(" "),
        item.access_type,
        item.trust_level,
        item.mode?.join(" ")
      ].join(" ").toLowerCase();

      const queryMatch = !q || text.includes(q);
      const modeMatch = !mode || item.mode?.includes(mode);

      return queryMatch && modeMatch;
    });
  }

  router.get("/catalog", async (req, res) => {
    const catalog = await readJson(paths.catalogPath, []);
    const q = req.query.q || "";
    const category = req.query.category || "";
    const type = req.query.type || "";
    const mode = req.query.mode || "";

    let results = searchLocalCatalog(catalog, q, mode);

    if (category) results = results.filter((item) => item.category === category);
    if (type) results = results.filter((item) => item.type === type);

    res.json({ count: results.length, items: results });
  });

  router.get("/suggest", async (req, res) => {
    const q = normalizeText(req.query.q || "");
    const catalog = await readJson(paths.catalogPath, []);

    if (!q) {
      return res.json({ items: catalog.slice(0, 8).map((item) => item.title) });
    }

    const suggestions = new Set();

    catalog.forEach((item) => {
      const fields = [
        item.title,
        ...(item.authors || []),
        item.category,
        item.type,
        ...(item.tags || []),
        ...(item.related_topics || [])
      ];

      fields.forEach((field) => {
        if (normalizeText(field).includes(q)) suggestions.add(field);
      });
    });

    res.json({ items: [...suggestions].slice(0, 10) });
  });

  router.get("/search", async (req, res) => {
    const q = req.query.q || "";
    const mode = req.query.mode || "";
    const sources = String(req.query.sources || "local,openlibrary,google,wikipedia,gutenberg")
      .split(",")
      .map((s) => s.trim().toLowerCase());

    if (!q) return res.status(400).json({ error: "Query parameter q is required." });

    await trackEvent(paths.analyticsPath, "search", { q, sources, mode });

    const results = [];
    const warnings = [];

    if (sources.includes("local")) {
      const catalog = await readJson(paths.catalogPath, []);
      const local = searchLocalCatalog(catalog, q, mode).map((item) => ({
        title: item.title,
        creator: item.authors.join(", "),
        description: item.description,
        sourceName: "Local Catalog",
        category: item.category,
        type: item.type,
        access: item.access_type,
        url: "/api/catalog",
        worldcatUrl: makeWorldCatUrl(item.title, item.authors.join(" ")),
        related: item.related_topics || item.tags || []
      }));
      results.push(...local);
    }

    if (sources.includes("openlibrary")) {
      try {
        const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8`);
        const data = await response.json();
        results.push(...(data.docs || []).slice(0, 8).map(normalizeOpenLibrary));
      } catch {
        warnings.push("Open Library search failed.");
      }
    }

    if (sources.includes("google")) {
      try {
        const keyPart = config.googleBooksApiKey ? `&key=${config.googleBooksApiKey}` : "";
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8${keyPart}`);
        const data = await response.json();
        results.push(...(data.items || []).slice(0, 8).map(normalizeGoogleBook));
      } catch {
        warnings.push("Google Books search failed.");
      }
    }

    if (sources.includes("wikipedia")) {
      try {
        const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*&srlimit=8`);
        const data = await response.json();
        results.push(...(data.query?.search || []).slice(0, 8).map(normalizeWikipedia));
      } catch {
        warnings.push("Wikipedia search failed.");
      }
    }

    if (sources.includes("gutenberg")) {
      try {
        const response = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(q)}`);
        const data = await response.json();
        results.push(...(data.results || []).slice(0, 8).map(normalizeGutenberg));
      } catch {
        warnings.push("Gutendex search failed.");
      }
    }

    res.json({
      query: q,
      mode,
      count: results.length,
      warnings,
      ai: generateLocalAnswer(q, results, warnings),
      items: results
    });
  });

  return router;
}

export function generateLocalAnswer(query, results, warnings = []) {
  if (!results.length) {
    return {
      title: `No strong match for "${query}"`,
      summary: "Try broader keywords or submit a request. In production, this should be stored as search demand.",
      legalGuide: "LearnSphere should not host pirated PDFs. It should guide users to official, library, public-domain, preview, or purchase/borrow options.",
      related: [],
      warnings
    };
  }

  const top = results[0];
  const sources = {};
  results.forEach((item) => {
    sources[item.sourceName || "Unknown"] = (sources[item.sourceName || "Unknown"] || 0) + 1;
  });

  return {
    title: `Best match for "${query}"`,
    summary: `${top.title} from ${top.sourceName || "a source"} is the strongest visible result. ${top.description || ""}`,
    legalGuide: "Prefer official sources, libraries, public-domain texts, legal previews, or buy/borrow options. Avoid pirated PDF mirrors.",
    sourceCoverage: sources,
    related: top.related || [],
    warnings
  };
}

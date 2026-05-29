function cleanHtml(html) {
  return String(html || "").replace(/<[^>]*>/g, "");
}

export function makeWorldCatUrl(title, creator = "") {
  return `https://www.worldcat.org/search?q=${encodeURIComponent(`${title} ${creator}`.trim())}`;
}

export function normalizeOpenLibrary(doc) {
  const title = doc.title || "Untitled";
  return {
    title,
    creator: (doc.author_name || []).slice(0, 3).join(", ") || "Unknown author",
    description: `First published: ${doc.first_publish_year || "Unknown"}. Editions: ${doc.edition_count || "Unknown"}.`,
    sourceName: "Open Library",
    category: "Book",
    type: "Book metadata",
    access: "Search / Borrow / Editions",
    url: doc.key ? `https://openlibrary.org${doc.key}` : "https://openlibrary.org",
    worldcatUrl: makeWorldCatUrl(title, (doc.author_name || []).join(" ")),
    related: [doc.subject?.[0], doc.subject?.[1], doc.language?.[0]].filter(Boolean)
  };
}

export function normalizeGoogleBook(volume) {
  const info = volume.volumeInfo || {};
  const title = info.title || "Untitled";
  const creator = (info.authors || []).join(", ") || "Unknown author";

  return {
    title,
    creator,
    description: info.description ? cleanHtml(info.description).slice(0, 280) : "Google Books metadata result.",
    sourceName: "Google Books",
    category: (info.categories || ["Book"])[0],
    type: "Book metadata / Preview",
    access: info.previewLink ? "Preview available" : "Metadata only",
    url: info.previewLink || info.infoLink || "https://books.google.com",
    worldcatUrl: makeWorldCatUrl(title, creator),
    related: [...(info.categories || []), info.publisher, info.publishedDate].filter(Boolean)
  };
}

export function normalizeWikipedia(item) {
  return {
    title: item.title,
    creator: "Wikipedia",
    description: item.snippet ? cleanHtml(item.snippet) : "Wikipedia search result.",
    sourceName: "Wikipedia",
    category: "Reference",
    type: "Encyclopedia article",
    access: "Free article",
    url: `https://en.wikipedia.org/?curid=${item.pageid}`,
    worldcatUrl: "",
    related: ["Reference", "Citations", "Encyclopedia"]
  };
}

export function normalizeGutenberg(book) {
  const title = book.title || "Untitled";
  const creator = (book.authors || []).map((a) => a.name).join(", ") || "Unknown author";

  return {
    title,
    creator,
    description: `Public-domain ebook. Downloads: ${book.download_count || 0}.`,
    sourceName: "Project Gutenberg / Gutendex",
    category: "Public Domain",
    type: "Ebook",
    access: "Free public-domain text",
    url: book.formats?.["text/html"] || book.formats?.["application/epub+zip"] || `https://www.gutenberg.org/ebooks/${book.id}`,
    worldcatUrl: makeWorldCatUrl(title, creator),
    related: [...(book.subjects || []).slice(0, 3), ...(book.bookshelves || []).slice(0, 2)]
  };
}

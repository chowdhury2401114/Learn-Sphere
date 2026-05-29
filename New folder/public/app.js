const cards = document.getElementById("cards");
const statusBox = document.getElementById("status");
const aiAnswer = document.getElementById("aiAnswer");
const graphArea = document.getElementById("graphArea");
const requestList = document.getElementById("requestList");
const suggestionsBox = document.getElementById("suggestions");
const searchInput = document.getElementById("searchInput");

let lastResults = [];
let suggestTimer = null;
let currentMode = "";

function setStatus(message) { statusBox.textContent = message; }

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
}

if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");

function setMode(mode, btn) {
  currentMode = mode;
  document.querySelectorAll(".mode-tabs button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  if (searchInput.value.trim()) searchAll();
}

function getSelectedSources() {
  return [...document.querySelectorAll(".source-toggles input:checked")]
    .map((input) => input.value)
    .join(",");
}

searchInput.addEventListener("input", () => {
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(loadSuggestions, 180);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchAll();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-wrap")) suggestionsBox.style.display = "none";
});

async function loadSuggestions() {
  const q = searchInput.value.trim();
  if (!q) {
    suggestionsBox.style.display = "none";
    return;
  }

  const response = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
  const data = await response.json();

  if (!data.items || !data.items.length) {
    suggestionsBox.style.display = "none";
    return;
  }

  suggestionsBox.innerHTML = data.items.map((item) =>
    `<div class="suggestion-item" onclick="chooseSuggestion('${item.replaceAll("'", "\\'")}')">${item}</div>`
  ).join("");

  suggestionsBox.style.display = "block";
}

function chooseSuggestion(text) {
  searchInput.value = text;
  suggestionsBox.style.display = "none";
  searchAll();
}

async function searchAll() {
  const q = searchInput.value.trim();
  if (!q) {
    alert("Please enter a search term.");
    return;
  }

  setStatus("Searching selected sources...");
  cards.innerHTML = "";
  graphArea.innerHTML = "";
  suggestionsBox.style.display = "none";

  try {
    const sources = getSelectedSources();
    const response = await fetch(`/api/search?q=${encodeURIComponent(q)}&sources=${encodeURIComponent(sources)}&mode=${encodeURIComponent(currentMode)}`);
    const data = await response.json();

    lastResults = data.items || [];
    renderResults(lastResults);
    renderAnswer(data.ai || {}, q, lastResults, data.warnings || []);

    if (lastResults[0]) showGraph(lastResults[0]);

    setStatus(`Found ${data.count || 0} results${data.mode ? " in " + data.mode + " mode" : ""}.`);
    loadAnalytics();
  } catch {
    setStatus("Search failed. Check server logs.");
    aiAnswer.innerHTML = `<p>Something went wrong. Make sure the backend is running.</p>`;
  }
}

function renderResults(results) {
  cards.innerHTML = "";

  if (!results.length) {
    cards.innerHTML = `<div class="card"><h3>No result found</h3><p>Try broader keywords, switch mode, or request this item below.</p></div>`;
    return;
  }

  results.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <span class="badge">${item.category || "Knowledge"}</span>
      <span class="source">${item.sourceName || "Source"}</span>
      <h3>${item.title}</h3>
      <p><b>Creator:</b> ${item.creator || "Unknown"}</p>
      <p>${item.description || "No description available."}</p>
      <p><b>Access:</b> ${item.access || "Unknown"}</p>
      ${item.url ? `<a href="${item.url}" target="_blank">Open source</a>` : ""}
      ${item.worldcatUrl ? `<a href="${item.worldcatUrl}" target="_blank">Find in WorldCat</a>` : ""}
      <br><button onclick="showGraph(lastResults[${index}])">Show Graph</button>
    `;

    cards.appendChild(card);
  });
}

function renderAnswer(ai, query, results, warnings) {
  if (!results.length) {
    aiAnswer.innerHTML = `
      <h3>${ai.title || `No strong match for "${query}"`}</h3>
      <p>${ai.summary || "Try another keyword."}</p>
      <p><b>Legal guide:</b> ${ai.legalGuide || "Use legal sources only."}</p>
    `;
    return;
  }

  const sourceCoverage = ai.sourceCoverage || {};
  const sourceChips = Object.entries(sourceCoverage)
    .map(([name, count]) => `<span class="answer-chip">${name}: ${count}</span>`)
    .join("");

  const related = ai.related || [];

  aiAnswer.innerHTML = `
    <div class="answer-grid">
      <div>
        <h3>${ai.title || `Best answer for "${query}"`}</h3>
        <p>${ai.summary || ""}</p>
        <p><b>Legal-first guide:</b> ${ai.legalGuide || "Use official and legal sources."}</p>
        ${warnings.length ? `<p><b>Warnings:</b> ${warnings.join("; ")}</p>` : ""}
      </div>
      <div>
        <h4>Source coverage</h4>
        <p>${sourceChips || "No source breakdown available."}</p>
        <h4>Explore next</h4>
        <p>${related.slice(0, 8).map((r) => `<span class="answer-chip">${r}</span>`).join("") || "No related terms available."}</p>
      </div>
    </div>
  `;
}

function showGraph(item) {
  graphArea.innerHTML = "";

  const main = document.createElement("div");
  main.className = "node main";
  main.textContent = item.title;
  graphArea.appendChild(main);

  const related = item.related?.length ? item.related : [item.creator, item.category, item.sourceName].filter(Boolean);

  related.slice(0, 10).forEach((topic) => {
    const node = document.createElement("div");
    node.className = "node";
    node.textContent = topic;
    node.onclick = () => {
      searchInput.value = topic;
      searchAll();
    };
    graphArea.appendChild(node);
  });
}

async function loadRecommendations() {
  const response = await fetch("/api/recommendations");
  const data = await response.json();

  renderMini("trendingBox", data.trending || []);
  renderMini("ratedBox", data.highlyRated || []);
  renderMini("studentBox", data.studentMode || []);
  renderMini("freeBox", data.freeOrPublic || []);
}

function renderMini(id, list) {
  const box = document.getElementById(id);
  box.innerHTML = list.map((item) => `
    <div class="mini-item" onclick="quickSearch('${item.title.replaceAll("'", "\\'")}')">
      <b>${item.title}</b><br><span>${item.category} • Rating ${item.rating}</span>
    </div>
  `).join("");
}

function quickSearch(title) {
  searchInput.value = title;
  searchAll();
}

async function saveRequest() {
  const title = document.getElementById("reqTitle").value.trim();
  const note = document.getElementById("reqNote").value.trim();

  if (!title) {
    alert("Please enter a title or topic.");
    return;
  }

  await fetch("/api/requests", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ title, note })
  });

  document.getElementById("reqTitle").value = "";
  document.getElementById("reqNote").value = "";
  loadRequests();
  loadAnalytics();
}

async function loadRequests() {
  const response = await fetch("/api/requests");
  const data = await response.json();

  requestList.innerHTML = (data.items || [])
    .map((item) => `<li>${item.title}${item.note ? " — " + item.note : ""}</li>`)
    .join("");
}

async function loadAnalytics() {
  const response = await fetch("/api/analytics/summary");
  const data = await response.json();

  document.getElementById("analyticsBox").innerHTML = `
    <p><b>Total events:</b> ${data.totalEvents}</p>
    <p><b>Total searches:</b> ${data.totalSearches}</p>
    <p><b>Total requests:</b> ${data.totalRequests}</p>
    <p><b>Top queries:</b></p>
    <ul>${(data.topQueries || []).map((q) => `<li>${q.query} — ${q.count}</li>`).join("") || "<li>No searches yet</li>"}</ul>
  `;
}

async function showAccountPlan() {
  const response = await fetch("/api/account/demo");
  const data = await response.json();
  alert(`${data.message}\n\nPlanned: ${data.plannedFeatures.join(", ")}`);
}

loadRecommendations();
loadRequests();
loadAnalytics();

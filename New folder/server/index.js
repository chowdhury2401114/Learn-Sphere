import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import searchRoutes from "./routes/searchRoutes.js";
import miscRoutes from "./routes/miscRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checkMode = process.argv.includes("--check");
const app = express();
const PORT = process.env.PORT || 3000;

const paths = {
  catalogPath: path.join(__dirname, "data", "catalog.json"),
  requestsPath: path.join(__dirname, "data", "requests.json"),
  analyticsPath: path.join(__dirname, "data", "analytics.json")
};

const config = {
  googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY || ""
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api", searchRoutes(paths, config));
app.use("/api", miscRoutes(paths));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

if (checkMode) {
  console.log("LearnSphere check passed.");
  process.exit(0);
}

app.listen(PORT, () => {
  console.log(`LearnSphere running at http://localhost:${PORT}`);
});

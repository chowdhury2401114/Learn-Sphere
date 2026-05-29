import fs from "fs/promises";

export async function readJson(filePath, fallback) {
  try {
    const file = await fs.readFile(filePath, "utf8");
    return JSON.parse(file);
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function normalizeText(value) {
  return String(value || "").toLowerCase();
}

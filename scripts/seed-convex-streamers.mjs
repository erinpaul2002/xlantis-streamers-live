import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import streamers from "../config/streamers.json" with { type: "json" };
import { api } from "../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");

function parseEnvLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  const commentIndex = value.indexOf(" #");

  if (commentIndex >= 0) {
    value = value.slice(0, commentIndex).trim();
  }

  value = value.replace(/^['"]|['"]$/g, "");

  return { key, value };
}

async function loadEnvFile(filePath) {
  try {
    const file = await fs.readFile(filePath, "utf8");

    for (const line of file.split(/\r?\n/)) {
      const entry = parseEnvLine(line);

      if (!entry || process.env[entry.key]) {
        continue;
      }

      process.env[entry.key] = entry.value;
    }
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

function summarizeCurrentRows(rows) {
  const legacyRows = rows.filter((row) => row.platform);
  const canonicalRows = rows.filter((row) => row.kick || row.youtube);

  return {
    totalRows: rows.length,
    legacyPlatformRows: legacyRows.length,
    canonicalRows: canonicalRows.length,
    targetCanonicalRows: streamers.length,
  };
}

function printSummary(summary) {
  console.log(`Current Convex rows: ${summary.totalRows}`);
  console.log(`Legacy platform rows: ${summary.legacyPlatformRows}`);
  console.log(`Canonical-style rows: ${summary.canonicalRows}`);
  console.log(`Target canonical rows: ${summary.targetCanonicalRows}`);
}

async function main() {
  await loadEnvFile(path.join(rootDir, ".env.local"));
  await loadEnvFile(path.join(rootDir, ".env"));

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required.");
  }

  const client = new ConvexHttpClient(convexUrl);
  const currentRows = await client.query(api.streamers.list, {});
  const summary = summarizeCurrentRows(currentRows);

  printSummary(summary);

  if (!shouldApply) {
    console.log("");
    console.log("Preview only. Re-run with --apply to back up the current table and replace it with canonical streamer rows.");
    return;
  }

  const backupDir = path.join(rootDir, "scripts", "backups");
  const backupName = `streamers-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const backupPath = path.join(backupDir, backupName);
  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(backupPath, JSON.stringify(currentRows, null, 2));

  const result = await client.mutation(api.streamers.replaceAll, {
    streamers,
  });

  console.log("");
  console.log(`Backup written to ${backupPath}`);
  console.log(`Deleted ${result.deleted} rows and inserted ${result.inserted} canonical streamers.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

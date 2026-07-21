import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "data-source");
const knowledgeDir = path.join(root, "knowledge");
const outDir = path.join(root, "data");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

async function readCsv(name) {
  const text = await readFile(path.join(sourceDir, name), "utf8");
  const rows = parseCsv(text);
  const [headers, ...records] = rows;
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), record[index]?.trim() ?? ""])),
  );
}

function number(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be a number: ${value}`);
  return parsed;
}

function list(value) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberList(value, field) {
  return list(value).map((item) => number(item, field));
}

function parseFrontmatter(markdown, file) {
  if (!markdown.startsWith("---\n")) {
    throw new Error(`${file} must start with YAML frontmatter`);
  }
  const end = markdown.indexOf("\n---", 4);
  if (end === -1) throw new Error(`${file} is missing closing frontmatter marker`);

  const frontmatter = markdown.slice(4, end).trim();
  const content = markdown.slice(end + 4).trim();
  const meta = {};
  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    meta[key.trim()] = rawValue.trim();
  }
  return { meta, content };
}

function parseTags(value) {
  const bracket = value.match(/^\[(.*)\]$/);
  const raw = bracket ? bracket[1] : value;
  return raw
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

async function buildPipeSizes() {
  return (await readCsv("pipe-sizes.csv")).map((row) => ({
    dn: row.dn,
    outerDiameter: number(row.outerDiameter, "outerDiameter"),
    commonWallThickness: numberList(row.commonWallThickness, "commonWallThickness"),
    materialOptions: list(row.materialOptions),
    standard: row.standard,
    application: row.application,
    remark: row.remark,
  }));
}

async function buildFittingSizes() {
  return (await readCsv("fitting-sizes.csv")).map((row) => ({
    fittingType: row.fittingType,
    dn: row.dn,
    matchedPipeOuterDiameter: number(row.matchedPipeOuterDiameter, "matchedPipeOuterDiameter"),
    commonWallThickness: numberList(row.commonWallThickness, "commonWallThickness"),
    connectionType: row.connectionType,
    materialOptions: list(row.materialOptions),
    standard: row.standard,
    remark: row.remark,
  }));
}

async function buildQuoteRules() {
  const materialPricePerKg = Object.fromEntries(
    (await readCsv("material-prices.csv")).map((row) => [
      row.material,
      number(row.pricePerKg, "pricePerKg"),
    ]),
  );
  const surfacePerMeter = Object.fromEntries(
    (await readCsv("surface-prices.csv")).map((row) => [
      row.surface,
      number(row.pricePerMeter, "pricePerMeter"),
    ]),
  );
  const customerPriceFactor = Object.fromEntries(
    (await readCsv("customer-price-factors.csv")).map((row) => [
      row.customerType,
      [number(row.lowFactor, "lowFactor"), number(row.highFactor, "highFactor")],
    ]),
  );
  const settings = Object.fromEntries((await readCsv("quote-settings.csv")).map((row) => [row.key, row.value]));

  return {
    materialPricePerKg,
    baseProcessingPerMeter: number(settings.baseProcessingPerMeter, "baseProcessingPerMeter"),
    surfacePerMeter,
    packagingPerMeter: number(settings.packagingPerMeter, "packagingPerMeter"),
    lossRate: number(settings.lossRate, "lossRate"),
    taxRate: number(settings.taxRate, "taxRate"),
    customerPriceFactor,
    internalDisclaimer: settings.internalDisclaimer,
  };
}

async function buildBlogArticles() {
  const files = (await readdir(knowledgeDir)).filter((file) => file.endsWith(".md")).sort();
  return Promise.all(
    files.map(async (file) => {
      const markdown = await readFile(path.join(knowledgeDir, file), "utf8");
      const { meta, content } = parseFrontmatter(markdown, file);
      return {
        id: meta.id,
        title: meta.title,
        category: meta.category,
        tags: parseTags(meta.tags ?? ""),
        summary: meta.summary,
        content,
        updatedAt: meta.updatedAt,
      };
    }),
  );
}

async function writeJson(name, value) {
  await writeFile(path.join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

await mkdir(outDir, { recursive: true });
await writeJson("pipe-sizes.json", await buildPipeSizes());
await writeJson("fitting-sizes.json", await buildFittingSizes());
await writeJson("quote-rules.json", await buildQuoteRules());
await writeJson("blog-articles.json", await buildBlogArticles());

console.log("Built MCP JSON data from data-source/ and knowledge/.");

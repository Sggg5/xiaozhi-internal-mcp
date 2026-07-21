import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as yamlLoad } from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const shanghanDir = path.resolve(root, "shanghan-lun", "yanghuide13350-shanghan-lun-knowledge-base-e184b49");
const knowledgeBaseDir = path.join(shanghanDir, "伤寒论知识库");
const outDir = path.join(root, "src", "data");

const dirTypeMap = {
  "01_条文": "条文",
  "02_方剂": "方剂",
  "03_药物": "药物",
  "04_证型": "证型",
  "05_体质": "体质",
  "06_安全": "安全",
  "00_索引": "索引",
  "10_辨证基准": "辨证基准",
  "99_解读": "解读",
  "09_模板": "模板",
};

// Try to parse frontmatter, return null if no frontmatter found
function tryParseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  try {
    var fm = yamlLoad(match[1]);
    if (fm && typeof fm === "object") {
      return { frontmatter: fm, body: match[2].trim() };
    }
  } catch (e) { /* fall through */ }
  return null;
}

function extractId(type, title, fm) {
  if (fm && fm["条文号"]) return "tiaowen-" + String(fm["条文号"]).padStart(3, "0");
  if (fm && fm["方名"]) return "fangji-" + fm["方名"];
  if (fm && fm["药名"]) return "yaowu-" + fm["药名"];
  if (fm && fm["证名"]) return "zhengxing-" + fm["证名"];
  var slug = title.replace(/[\[\]\u2018\u2019"]/g, "").trim().slice(0, 30);
  return type + "-" + slug;
}

function extractTags(fm) {
  if (!fm) return [];
  var candidates = [fm["症状标签"], fm["证候要点"], fm["六经"], fm["tags"], fm["关键词"]];
  var tags = new Set();
  for (var c = 0; c < candidates.length; c++) {
    var candidate = candidates[c];
    if (Array.isArray(candidate)) {
      for (var t = 0; t < candidate.length; t++) {
        if (typeof candidate[t] === "string") tags.add(candidate[t]);
      }
    } else if (typeof candidate === "string") {
      tags.add(candidate);
    }
  }
  return Array.from(tags);
}

function extractTitle(fm, fileName, content) {
  if (fm && fm["方名"]) return fm["方名"];
  if (fm && fm["药名"]) return fm["药名"];
  if (fm && fm["证名"]) return fm["证名"];
  // Try first heading from content
  if (content) {
    var h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) return h1Match[1].trim();
  }
  return fileName.replace(/\.md$/, "").replace(/\.yaml$/, "");
}

function extractSummary(fm, content) {
  if (fm && fm["主治"]) return fm["主治"];
  if (fm && fm["summary"]) return fm["summary"];
  if (!content) return "";
  var lines = content.split("\n");
  for (var li = 0; li < lines.length; li++) {
    var l = lines[li].trim();
    if (l && !l.startsWith("#")) return l.slice(0, 150);
  }
  return "";
}

function buildCategory(dirName, fm) {
  return (fm && fm["六经"]) || (fm && fm["篇"]) || dirName;
}

async function walkDir(dirPath, type, dirName) {
  var entries = [];
  var items = await readdir(dirPath, { withFileTypes: true });
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      var sub = await walkDir(fullPath, type, item.name);
      for (var si = 0; si < sub.length; si++) {
        entries.push(sub[si]);
      }
    } else if (item.isFile()) {
      var ext = path.extname(item.name).toLowerCase();
      if (ext !== ".md" && ext !== ".yaml" && ext !== ".yml") continue;
      var fileContent = await readFile(fullPath, "utf8");
      var fileName = path.basename(item.name, ext);
      
      if (ext === ".yaml" || ext === ".yml") {
        // YAML file: parse and wrap
        try {
          var yamlData = yamlLoad(fileContent);
          if (yamlData && typeof yamlData === "object") {
            entries.push({
              id: extractId(type, fileName, yamlData),
              type: type,
              title: fileName,
              category: dirName || type,
              tags: [],
              summary: "",
              content: fileContent,
              frontmatter: yamlData,
            });
          }
        } catch (e) {
          console.error("  [SKIP] YAML parse error in", item.name, e.message);
        }
        continue;
      }
      
      // Markdown file
      var parsed = tryParseFrontmatter(fileContent);
      var fm = parsed ? parsed.frontmatter : null;
      var body = parsed ? parsed.body : fileContent;
      var title = extractTitle(fm, item.name, body);
      
      entries.push({
        id: extractId(type, title, fm) || (type + "-" + fileName),
        type: type,
        title: title,
        category: buildCategory(dirName, fm),
        tags: extractTags(fm),
        summary: extractSummary(fm, body),
        content: body,
        frontmatter: fm || {},
      });
    }
  }
  return entries;
}

async function main() {
  console.log("Building Shanghan Lun knowledge base...");
  var all = [];
  var dirs = await readdir(knowledgeBaseDir, { withFileTypes: true });
  for (var d = 0; d < dirs.length; d++) {
    var dir = dirs[d];
    if (!dir.isDirectory()) continue;
    var type = dirTypeMap[dir.name] || dir.name;
    console.log("Processing:", dir.name, "-> type:", type);
    var entries = await walkDir(path.join(knowledgeBaseDir, dir.name), type, dir.name);
    console.log("  Found", entries.length, "entries");
    for (var ei = 0; ei < entries.length; ei++) {
      all.push(entries[ei]);
    }
  }
  
  console.log("Total entries:", all.length);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "shanghan-data.json"), JSON.stringify(all, null, 2) + "\n");
  var counts = {};
  for (var ci = 0; ci < all.length; ci++) {
    var e = all[ci];
    counts[e.type] = (counts[e.type] || 0) + 1;
  }
  console.log("Type distribution:", JSON.stringify(counts, null, 2));
  console.log("Output:", path.join(outDir, "shanghan-data.json"));
}

main().catch(function(e) { console.error("Build failed:", e); process.exit(1); });
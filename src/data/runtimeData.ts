import defaultBlogArticles from "./blog-articles.json" with { type: "json" };

export interface PipeSize {
  dn: string;
  outerDiameter: number;
  commonWallThickness: number[];
  materialOptions: string[];
  standard: string;
  application: string;
  remark: string;
}

export type FittingType = "弯头" | "直接" | "三通";

export interface FittingSize {
  fittingType: FittingType;
  dn: string;
  matchedPipeOuterDiameter: number;
  commonWallThickness: number[];
  connectionType: string;
  materialOptions: string[];
  standard: string;
  remark: string;
}

export interface QuoteRules {
  materialPricePerKg: Record<"304" | "316L", number>;
  baseProcessingPerMeter: number;
  surfacePerMeter: Record<string, number>;
  packagingPerMeter: number;
  lossRate: number;
  taxRate: number;
  customerPriceFactor: Record<string, [number, number]>;
}

export interface BlogArticle {
  id: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  content: string;
  updatedAt: string;
}

const common = {
  materialOptions: ["304", "316L"],
  standard: "GB/T 19228.2",
  application: "薄壁不锈钢管道系统",
  remark: "mock 数据，选型和正式报价前需人工复核。",
};

const defaultPipeSizes: PipeSize[] = [
  { dn: "DN15", outerDiameter: 16, commonWallThickness: [0.8, 1.0], ...common },
  { dn: "DN20", outerDiameter: 20, commonWallThickness: [0.8, 1.0], ...common },
  { dn: "DN25", outerDiameter: 25.4, commonWallThickness: [1.0, 1.2], ...common },
  { dn: "DN32", outerDiameter: 32, commonWallThickness: [1.0, 1.2], ...common },
  { dn: "DN40", outerDiameter: 40, commonWallThickness: [1.2, 1.5], ...common },
  { dn: "DN50", outerDiameter: 50.8, commonWallThickness: [1.2, 1.5], ...common },
  { dn: "DN65", outerDiameter: 76.1, commonWallThickness: [1.5, 2.0], ...common },
  { dn: "DN80", outerDiameter: 88.9, commonWallThickness: [1.5, 2.0], ...common },
  { dn: "DN100", outerDiameter: 101.6, commonWallThickness: [1.5, 2.0], ...common },
];

const supportedFittings: Record<FittingType, string[]> = {
  弯头: ["DN15", "DN20", "DN25", "DN32", "DN40", "DN50"],
  直接: ["DN15", "DN20", "DN25", "DN32", "DN40", "DN50"],
  三通: ["DN25", "DN32", "DN40", "DN50"],
};

function buildDefaultFittings() {
  return Object.entries(supportedFittings).flatMap(([fittingType, dns]) =>
    dns.map((dn) => {
      const pipe = defaultPipeSizes.find((item) => item.dn === dn);
      if (!pipe) throw new Error(`Default pipe size missing for fitting: ${dn}`);
      return {
        fittingType: fittingType as FittingType,
        dn,
        matchedPipeOuterDiameter: pipe.outerDiameter,
        commonWallThickness: pipe.commonWallThickness,
        connectionType: "卡压式",
        materialOptions: pipe.materialOptions,
        standard: pipe.standard,
        remark: "mock 数据，实际尺寸以图纸和样本为准。",
      };
    }),
  );
}

const defaultQuoteRules: QuoteRules = {
  materialPricePerKg: { "304": 16.8, "316L": 27.5 },
  baseProcessingPerMeter: 1.2,
  surfacePerMeter: { 酸洗: 0, 抛光: 0.8, 喷砂: 0.6, 定制: 1.5 },
  packagingPerMeter: 0.3,
  lossRate: 0.05,
  taxRate: 0.13,
  customerPriceFactor: {
    普通客户: [1.18, 1.3],
    工程客户: [1.14, 1.25],
    经销商: [1.1, 1.2],
  },
};

const defaultInternalDisclaimer = "仅供公司内部报价测算，正式报价需人工确认。";

export const pipeSizes: PipeSize[] = [...defaultPipeSizes];
export const fittingSizes: FittingSize[] = buildDefaultFittings();
export let quoteRules: QuoteRules = defaultQuoteRules;
export let internalDisclaimer = defaultInternalDisclaimer;
export const blogArticles: BlogArticle[] = defaultBlogArticles as BlogArticle[];

const externalDataFiles = [
  "pipe-sizes.json",
  "fitting-sizes.json",
  "quote-rules.json",
  "blog-articles.json",
] as const;

let externalDataSignature: string | undefined;

async function readJsonIfExists(path: string) {
  const fs = await import("node:fs/promises");
  try {
    return JSON.parse(await fs.readFile(path, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function replaceArray<T>(target: T[], value: unknown, name: string) {
  if (value === undefined) return;
  if (!Array.isArray(value)) throw new Error(`${name} must be a JSON array`);
  target.splice(0, target.length, ...(value as T[]));
}

async function getExternalDataSignature(dataDir: string) {
  const fs = await import("node:fs/promises");
  const parts = await Promise.all(
    externalDataFiles.map(async (file) => {
      try {
        const stat = await fs.stat(`${dataDir}/${file}`);
        return `${file}:${stat.mtimeMs}:${stat.size}`;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return `${file}:missing`;
        throw error;
      }
    }),
  );
  return parts.join("|");
}

export async function loadExternalData(dataDir = process.env.XIAOZHI_DATA_DIR) {
  if (!dataDir) return;

  const signature = await getExternalDataSignature(dataDir);
  if (signature === externalDataSignature) return;

  replaceArray<PipeSize>(
    pipeSizes,
    await readJsonIfExists(`${dataDir}/pipe-sizes.json`),
    "pipe-sizes.json",
  );
  replaceArray<FittingSize>(
    fittingSizes,
    await readJsonIfExists(`${dataDir}/fitting-sizes.json`),
    "fitting-sizes.json",
  );

  const rules = await readJsonIfExists(`${dataDir}/quote-rules.json`);
  if (rules !== undefined) {
    const { internalDisclaimer: disclaimer, ...nextRules } = rules as QuoteRules & {
      internalDisclaimer?: string;
    };
    quoteRules = nextRules;
    if (disclaimer) internalDisclaimer = disclaimer;
  }

  replaceArray<BlogArticle>(
    blogArticles,
    await readJsonIfExists(`${dataDir}/blog-articles.json`),
    "blog-articles.json",
  );

  externalDataSignature = signature;
  console.error(`Loaded external MCP data from ${dataDir}`);
}

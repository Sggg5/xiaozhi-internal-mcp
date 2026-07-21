import assert from "node:assert/strict";
import test from "node:test";
import { askBlogKnowledge } from "../src/tools/askBlogKnowledge.js";
import { calculatePipeWeight } from "../src/tools/calculatePipeWeight.js";
import { estimatePipeQuote } from "../src/tools/estimatePipeQuote.js";
import { queryFittingSize } from "../src/tools/queryFittingSize.js";
import { queryPipeSize } from "../src/tools/queryPipeSize.js";
import { searchBlogArticles } from "../src/tools/searchBlogArticles.js";

test("pipe lookup supports DN and outside diameter", () => {
  const byDn = queryPipeSize("dn25不锈钢管");
  const byDiameter = queryPipeSize("25.4管");
  assert.ok(byDn.matched && "dn" in byDn);
  assert.ok(byDiameter.matched && "dn" in byDiameter);
  assert.equal(byDn.dn, "DN25");
  assert.equal(byDiameter.dn, "DN25");
  assert.equal(queryPipeSize("未知规格").matched, false);
});

test("fitting lookup combines type and size", () => {
  const result = queryFittingSize("25.4弯头");
  assert.equal(result.matched, true);
  assert.equal(result.fittingType, "弯头");
});

test("weight and quote return stable internal calculations", () => {
  const weight = calculatePipeWeight({
    outerDiameter: 25.4,
    wallThickness: 1,
    length: 10,
    material: "304",
  });
  assert.equal(weight.weightPerMeter, 0.6078);
  const quote = estimatePipeQuote({
    dn: "DN25",
    material: "304",
    wallThickness: 1,
    length: 10,
    surface: "抛光",
    taxIncluded: true,
  });
  assert.ok(quote.estimatedTotalAmountRange.max > quote.estimatedTotalAmountRange.min);
  assert.match(quote.disclaimer, /正式报价需人工确认/);
});

test("blog search and knowledge retrieval return references", () => {
  assert.ok(searchBlogArticles("316L").matchedCount > 0);
  const result = askBlogKnowledge("六价铬为什么会超标");
  assert.ok(result.matchedCount > 0);
  assert.ok(result.references[0].relevantText.length <= 800);
});

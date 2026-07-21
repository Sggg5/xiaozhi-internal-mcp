import { shanghanEntries } from "../data/shanghanStore.js";
import { relevantExcerpt, scoreText } from "../utils/searchText.js";

interface VitalsInput {
  bpm: number;
  spo2: number;
  systolic?: number;
  diastolic?: number;
  symptoms?: string;
}

interface bpDiag { level: string; tcm: string; keywords: string[]; }

function bpmToPulseType(bpm: number): string {
  if (bpm >= 100) return "数脉（热证）";
  if (bpm >= 90) return "偏数脉（偏热）";
  if (bpm >= 60) return "平脉（正常）";
  if (bpm >= 50) return "偏迟脉（偏寒）";
  return "迟脉（寒证）";
}

function spo2ToDiagnosis(spo2: number): { level: string; tcm: string } {
  if (spo2 >= 96) return { level: "正常", tcm: "气血充盈，宗气充足" };
  if (spo2 >= 93) return { level: "轻度偏低", tcm: "轻度气虚，或有痰湿阻肺" };
  if (spo2 >= 90) return { level: "中度偏低", tcm: "气不足，宗气下陷，可能血瘀" };
  return { level: "严重偏低", tcm: "气竭危候，宗气欲脱，急需就医" };
}

function bpToDiagnosis(systolic: number, diastolic: number): bpDiag {
  if (systolic < 90 || diastolic < 60) return { level: "低血压", tcm: "气血两虚，阳气不振，清阳不升", keywords: ["低血压", "气血两虚", "阳虚", "少阴病", "四逆汤"] };
  if (systolic < 100) return { level: "血压偏低", tcm: "气虚为主，脾肺气虚，运化不足", keywords: ["气虚", "脾虚", "桂枝汤"] };
  if (systolic < 120 && diastolic < 80) return { level: "正常", tcm: "气血调和", keywords: [] };
  if (systolic < 130 && diastolic < 80) return { level: "正常高值", tcm: "气血基本调和，略有阳亢倾向", keywords: ["平肝", "潜阳"] };
  if (systolic < 140 && diastolic < 90) return { level: "一级高血压", tcm: "肝阳上亢初期，或肝火上炎", keywords: ["高血压", "肝阳上亢", "肝火"] };
  if (systolic >= 180 || diastolic >= 120) return { level: "三级高血压", tcm: "⚠️ 肝阳暴亢，肝风内动，有中风危象，急需就医", keywords: ["高血压危象", "中风", "肝风", "急救"] };
  return { level: "二级高血压", tcm: "肝阳上亢，阴虚阳亢，痰湿内阻", keywords: ["高血压", "肝阳上亢", "阴虚阳亢", "痰湿"] };
}

function buildSearchQueries(bpm: number, spo2: number, bpKeywords: string[], symptoms: string): string[] {
  var q: string[] = [];
  if (symptoms && symptoms.trim()) q.push(symptoms.trim());
  for (var i = 0; i < bpKeywords.length; i++) q.push(bpKeywords[i]);
  if (bpm >= 90) q.push("数脉 热证");
  if (bpm < 60) q.push("迟脉 寒证");
  if (bpm >= 60 && bpm < 90) q.push("平脉 正常");
  if (spo2 < 93) q.push("气虚 血瘀 宗气");
  if (spo2 < 90) q.push("气脱 亡阳 急救");
  return q;
}

export function interpretVitals(input: VitalsInput) {
  var bpm = input.bpm;
  var spo2 = input.spo2;
  var symptoms = input.symptoms || "";
  var hasBP = input.systolic !== undefined && input.diastolic !== undefined;
  var pulseType = bpmToPulseType(bpm);
  var spo2Result = spo2ToDiagnosis(spo2);
  var bpResult: bpDiag | null = hasBP ? bpToDiagnosis(input.systolic!, input.diastolic!) : null;
  var queries = buildSearchQueries(bpm, spo2, bpResult ? bpResult.keywords : [], symptoms);

  var scored = shanghanEntries
    .map(function(entry) {
      var score = 0;
      for (var qi = 0; qi < queries.length; qi++) {
        score += scoreText(queries[qi], [entry.title, entry.type, entry.category, ...entry.tags, entry.summary, entry.content.slice(0, 300)]);
      }
      return { entry: entry, score: score };
    })
    .filter(function(item) { return item.score > 0; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, 5);

  var result: any = {
    vitals: { bpm: bpm, spo2: spo2, pulseType: pulseType, oxygenStatus: spo2Result.level },
    tcmAnalysis: {
      pulseInterpretation: pulseType,
      qiBloodStatus: spo2Result.tcm,
      possiblePatterns: scored.map(function(s) { return s.entry.title + "（" + s.entry.type + "）"; }),
    },
    references: scored.map(function(s) {
      return { id: s.entry.id, title: s.entry.title, type: s.entry.type, relevantText: relevantExcerpt(s.entry.content, queries.join(" ")) };
    }),
    disclaimer: "本分析仅基于《伤寒论》知识库的机械对照，不构成医疗诊断。如出现严重不适，请立即就医。"
  };

  if (hasBP) {
    result.bloodPressure = { systolic: input.systolic, diastolic: input.diastolic, level: bpResult!.level };
    result.tcmAnalysis.bloodPressureInterpretation = bpResult!.tcm;
  }

  return result;
}
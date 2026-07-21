import { shanghanEntries } from "../data/shanghanStore.js";
import { relevantExcerpt, scoreText } from "../utils/searchText.js";

interface VitalsInput {
  bpm: number;       // Heart rate 40-220
  spo2: number;      // Blood oxygen 50-100
  symptoms?: string; // Optional user-reported symptoms
}

/** Map BPM to TCM pulse type */
function bpmToPulseType(bpm: number): string {
  if (bpm >= 100) return "数脉（热证）";
  if (bpm >= 90) return "偏数脉（偏热）";
  if (bpm >= 60) return "平脉（正常）";
  if (bpm >= 50) return "偏迟脉（偏寒）";
  return "迟脉（寒证）";
}

/** Map SpO2 to TCM Qi/Blood interpretation */
function spo2ToDiagnosis(spo2: number): { level: string; tcm: string } {
  if (spo2 >= 96) return { level: "正常", tcm: "气血充盈，宗气充足" };
  if (spo2 >= 93) return { level: "轻度偏低", tcm: "轻度气虚，或有痰湿阻肺" };
  if (spo2 >= 90) return { level: "中度偏低", tcm: "气不足，宗气下陷，可能血瘀" };
  return { level: "严重偏低", tcm: "气竭危候，宗气欲脱，急需就医" };
}

/** Build a TCM search query from vitals */
function buildSearchQueries(bpm: number, spo2: number, symptoms: string): string[] {
  var queries: string[] = [];
  if (symptoms && symptoms.trim()) {
    queries.push(symptoms.trim());
  }
  if (bpm >= 90) queries.push("数脉 热证");
  if (bpm < 60) queries.push("迟脉 寒证");
  if (bpm >= 60 && bpm < 90) queries.push("平脉 正常");
  if (spo2 < 93) queries.push("气虚 血瘀 宗气");
  if (spo2 < 90) queries.push("气脱 亡阳 急救");
  return queries;
}

export function interpretVitals(input: VitalsInput) {
  var bpm = input.bpm;
  var spo2 = input.spo2;
  var symptoms = input.symptoms || "";

  var pulseType = bpmToPulseType(bpm);
  var spo2Result = spo2ToDiagnosis(spo2);
  var queries = buildSearchQueries(bpm, spo2, symptoms);

  // Score and rank knowledge base entries
  var scored = shanghanEntries
    .map(function(entry) {
      var score = 0;
      for (var qi = 0; qi < queries.length; qi++) {
        score += scoreText(queries[qi], [
          entry.title, entry.type, entry.category,
          ...entry.tags, entry.summary, entry.content.slice(0, 300)
        ]);
      }
      return { entry: entry, score: score };
    })
    .filter(function(item) { return item.score > 0; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, 5);

  return {
    vitals: {
      bpm: bpm,
      spo2: spo2,
      pulseType: pulseType,
      oxygenStatus: spo2Result.level,
    },
    tcmAnalysis: {
      pulseInterpretation: pulseType,
      qiBloodStatus: spo2Result.tcm,
      possiblePatterns: scored.map(function(s) { return s.entry.title + "（" + s.entry.type + "）"; }),
    },
    references: scored.map(function(s) {
      return {
        id: s.entry.id,
        title: s.entry.title,
        type: s.entry.type,
        relevantText: relevantExcerpt(s.entry.content, queries.join(" ")),
      };
    }),
    disclaimer: "本分析仅基于《伤寒论》知识库的机械对照，不构成医疗诊断。如出现严重不适，请立即就医。"
  };
}
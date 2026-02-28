import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
};

export interface GeopoliticalAnalysis {
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  region: string;
  entities: string[];
  industries: string[];
  consequences: string;
  reasoning: string;
  marketImpact: {
    bullish: string[];
    bearish: string[];
  };
  scenarios: {
    bestCase: string;
    baseCase: string;
    worstCase: string;
  };
}

export const analyzeHeadline = async (headline: string): Promise<GeopoliticalAnalysis> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following geopolitical news headline and provide a structured risk assessment, market impact signals, and scenario outlooks: "${headline}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskScore: { type: Type.NUMBER, description: "Risk Score from 1 to 10" },
          riskLevel: { type: Type.STRING, description: "Risk Level (Low / Medium / High)" },
          region: { type: Type.STRING, description: "Region or country affected" },
          entities: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Key entities mentioned (countries, organizations, leaders)" 
          },
          industries: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Affected industries or sectors" 
          },
          consequences: { type: Type.STRING, description: "Possible economic or market consequences" },
          reasoning: { type: Type.STRING, description: "Detailed explanation of the reasoning" },
          marketImpact: {
            type: Type.OBJECT,
            properties: {
              bullish: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Assets or sectors that might benefit" },
              bearish: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Assets or sectors that might be negatively impacted" },
            },
            required: ["bullish", "bearish"],
          },
          scenarios: {
            type: Type.OBJECT,
            properties: {
              bestCase: { type: Type.STRING, description: "Optimistic outcome" },
              baseCase: { type: Type.STRING, description: "Most likely outcome" },
              worstCase: { type: Type.STRING, description: "Pessimistic outcome" },
            },
            required: ["bestCase", "baseCase", "worstCase"],
          },
        },
        required: ["riskScore", "riskLevel", "region", "entities", "industries", "consequences", "reasoning", "marketImpact", "scenarios"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

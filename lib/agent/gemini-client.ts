import type { AgentReasoningOutput } from '@/types/agent';
import type { MarketSignal } from '@/types/signals';
import type { PortfolioSummary } from '@/types/portfolio';
import type { NewsItem } from '@/lib/integrations/sosovalue/provider';
import { AGENT_SYSTEM_PROMPT } from './prompts';
import { runAgentScan as deterministicScan } from './decision-engine';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const MODEL_NAME = 'gemini-2.0-flash';

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  return cleaned;
}

export async function runGeminiAgentScan(
  signals: MarketSignal[],
  portfolio: PortfolioSummary,
  news: NewsItem[]
): Promise<AgentReasoningOutput> {
  if (!GEMINI_API_KEY) {
    console.warn('[DeltaGuard] GEMINI_API_KEY is not configured. Falling back to deterministic scan rules.');
    return deterministicScan(signals, portfolio);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

  const userPrompt = `
Analyze the following live market signals, portfolio exposure, and news context, and output your hedge recommendations.

### Market Signals:
${JSON.stringify(signals.map(s => ({ id: s.id, category: s.category, label: s.label, score: s.score, severity: s.severity, confidence: s.confidence, explanation: s.explanation })), null, 2)}

### Portfolio Exposure:
- Net Asset Value: $${portfolio.totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Portfolio Net Delta: ${portfolio.netDeltaExposure}
- Calculated Risk Score: ${portfolio.riskScore}/100

### SoSoValue Live News Feed (Last 8 items):
${JSON.stringify(news.slice(0, 8).map(n => ({ title: n.title, content: n.content })), null, 2)}
`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: userPrompt
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [
            {
              text: AGENT_SYSTEM_PROMPT
            }
          ]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.15
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini API returned status code ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Invalid or empty response from Gemini API.');
    }

    const cleanedText = cleanJsonResponse(rawText);
    const output = JSON.parse(cleanedText) as AgentReasoningOutput;

    // Post-processing sanity checks to enforce application boundaries
    if (output.decision === 'hedge' && output.hedgeRecommendation) {
      // Enforce max leverage of 3x
      if (output.hedgeRecommendation.leverage > 3) {
        output.hedgeRecommendation.leverage = 2;
      }
      // Re-calculate notional if model returned 0 or invalid notional
      if (!output.hedgeRecommendation.notionalUsd || output.hedgeRecommendation.notionalUsd <= 0) {
        output.hedgeRecommendation.notionalUsd = Math.round(
          portfolio.totalValueUsd * portfolio.netDeltaExposure * (output.hedgeRecommendation.sizePercent / 100)
        );
      }
    }

    return {
      ...output,
      requiresConfirmation: true
    };
  } catch (err) {
    console.error('[DeltaGuard] Gemini Agent reasoning failed. Falling back to deterministic scan rules. Error:', err);
    return deterministicScan(signals, portfolio);
  }
}

# DeltaGuard AI

**A Hedge Fund in a Box for On-Chain Investors**

## Overview

DeltaGuard AI is a Wave 1 hackathon demo of a signal-to-execution hedge fund agent for on-chain investors. It monitors mock SoSoValue-style market signals, calculates portfolio delta exposure, explains risk reasoning, proposes a hedge, and simulates SoDEX execution after user confirmation.

The demo is designed as a serious institutional crypto finance terminal. It uses mock data only, but the architecture is organized so real SoSoValue, SSI Protocol, SoDEX, and ValueChain integrations can replace the placeholder clients in later waves.

## Problem Statement

Retail crypto investors are exposed to the same systematic risks that professional funds monitor every hour: ETF outflows, macro rate pressure, volatility spikes, funding stress, sentiment reversals, and liquidity shocks. Hedge funds defend against these risks with signal pipelines, exposure models, risk committees, and execution desks.

Most individual investors only see price after the damage has already happened. DeltaGuard AI demonstrates how an agent can compress institutional workflow into a transparent personal risk terminal while keeping execution under human control.

## Why SoSoValue Is Essential

| Integration | Role | Wave |
| --- | --- | --- |
| SoSoValue Terminal API | Market intelligence, ETF flow pressure, macro signals, volatility, sentiment, and composite regime detection | Wave 2 |
| SSI Protocol | Portfolio holdings, index exposure, NAV data, and rebalance context | Wave 2 |
| SoDEX | Hedge quotes, orderbook execution, and order status tracking | Wave 2 |
| ValueChain | On-chain position verification and settlement confirmation | Wave 3 |
| AI Reasoning Engine | Transparent decision trace; deterministic in Wave 1, optional LLM upgrade later | Wave 1+ |

## Wave 1 Demo Scope

> Wave 1 uses entirely mock data. No real API calls are made. All integrations are prepared as placeholder modules.

No wallet connection is required. No private keys are requested. No real trades are placed. No real funds move.

## Architecture

```text
Mock SoSoValue Signal Feed
        |
        v
   Risk Engine (delta-engine.ts + hedge-calculator.ts)
        |
        v
  Agent Decision Engine (decision-engine.ts)
        |
        v
   Hedge Proposal -> User Confirmation Required
        |
        v
  Simulated SoDEX Execution (mock-client.ts)
        |
        v
  Portfolio Protection Updated
```

## App Routes

| Route | Page | Status |
| --- | --- | --- |
| `/` | Landing page and product overview | Complete |
| `/dashboard` | Main terminal dashboard and agent scan | Complete |
| `/portfolio` | Holdings, allocation, and exposure | Complete |
| `/signals` | Mock SoSoValue signal monitor | Complete |
| `/agent` | Agent reasoning trace and recommendation | Complete |
| `/execution` | Simulated SoDEX order approval and receipt | Complete |
| `/stress-test` | Scenario simulator and before/after chart | Complete |
| `/integrations` | Placeholder integration architecture | Complete |
| `/settings` | Risk controls and safety settings | Complete |

## Mock Data

Portfolio holdings live in `lib/mock/portfolio.ts` and represent BTC, ETH, SSI index positions, and USDC. Market signals live in `lib/mock/signals.ts` and model ETF flow pressure, macro pressure, volatility, liquidity, sentiment, funding, on-chain risk, SSI momentum, and news regime alerts.

Execution data lives in `lib/mock/orders.ts`. Stress scenarios live in `lib/mock/scenarios.ts`. In Wave 2, SoSoValue provides market intelligence, SSI Protocol provides live index exposure, and SoDEX provides quote/execution data. In Wave 3, ValueChain provides on-chain verification and settlement.

## Placeholder Integration Plan

| Integration | File | Env Vars | Wave |
| --- | --- | --- | --- |
| SoSoValue Terminal API | `lib/integrations/sosovalue/client.ts` | `SOSOVALUE_API_KEY`, `SOSOVALUE_BASE_URL` | Wave 2 |
| SSI Protocol | `lib/integrations/ssi/client.ts` | `SSI_API_BASE_URL` | Wave 2 |
| SoDEX Execution API | `lib/integrations/sodex/client.ts` | `SODEX_API_KEY`, `SODEX_BASE_URL` | Wave 2 |
| ValueChain RPC | `lib/integrations/valuechain/client.ts` | `VALUECHAIN_RPC_URL` | Wave 3 |
| AI Reasoning Model | `lib/agent/decision-engine.ts` | `OPENAI_API_KEY` optional | Wave 2+ |

## How to Run Locally

```bash
git clone [repo]
cd deltaguard-ai
npm install
cp .env.example .env.local
npm run dev
# Open http://localhost:3000
```

## Demo Script

1. Open `/` landing page - observe the orbital graphic and product overview.
2. Click "Open Terminal" - enter the dashboard.
3. Click "Run Agent Scan" - watch the loading sequence.
4. Observe the negative composite signal score (-72, RISK-OFF).
5. Navigate to `/signals` - review individual signal cards.
6. Navigate to `/agent` - read the full reasoning trace.
7. Navigate to `/execution` - review the pending order ticket.
8. Click "Approve Simulated Hedge" - watch the execution timeline complete.
9. Navigate to `/stress-test` - select "2008-Style Risk-Off."
10. Compare the before/after chart - observe hedge effectiveness.

## Safety Design

Auto-execution is disabled in all demo modes. The only execution trigger is an explicit user click on the approval button in `/execution`. The agent refuses to execute without confirmation, use leverage above the configured maximum, claim guaranteed protection, or request private keys.

All screens label mock data as mock, simulated, or placeholder. Hedge language is intentionally partial and cautious because a hedge can reduce downside exposure but cannot guarantee profit or eliminate loss.

## Roadmap

**Wave 2:** Replace mock clients with real SoSoValue and SoDEX API clients. Add live SSI Protocol index exposure and robust execution state handling.

**Wave 3:** Add ValueChain on-chain settlement, live position tracking, multi-chain portfolio coverage, and auditable contract verification.

## Disclaimer

DeltaGuard AI does not constitute financial advice. No real trades. No real funds. All data and execution in Wave 1 are simulated for demonstration purposes.

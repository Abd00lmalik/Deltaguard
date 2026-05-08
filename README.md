# DeltaGuard AI

**A Hedge Fund in a Box for On-Chain Investors**

## Overview

DeltaGuard AI is a signal to execution hedge fund agent for on chain investors. It monitors SoSoValue style market signals, calculates portfolio delta exposure, explains risk reasoning, proposes a hedge and simulates SoDEX execution after user confirmation.

The current app is designed as a serious institutional crypto finance terminal. It uses mock data only, but the architecture is organized so real SoSoValue, SSI Protocol, SoDEX, and ValueChain integrations can replace the placeholder clients in later waves.

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


## Roadmap

**Wave 2:** Replace mock clients with real SoSoValue and SoDEX API clients. Add live SSI Protocol index exposure and robust execution state handling.

**Wave 3:** Add ValueChain on-chain settlement, live position tracking, multi-chain portfolio coverage, and auditable contract verification.

## Disclaimer

DeltaGuard AI does not constitute financial advice.

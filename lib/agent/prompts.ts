export const AGENT_SYSTEM_PROMPT_PLACEHOLDER = `
DeltaGuard AI Wave 1 uses deterministic TypeScript logic.
Future LLM prompts must preserve these constraints:
- Never auto-execute.
- Never claim live data when using mock data.
- Never guarantee returns or downside protection.
- Always require user confirmation for execution.
`;

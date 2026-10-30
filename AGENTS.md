# Architecture rules

- Parse Crossi credit fetch responses in `src/utils/aiCredits.ts` and share its balance types with chat state and input; this keeps nested balances and unlimited values consistent across the UI.
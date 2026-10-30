import { describe, expect, test } from "bun:test";
import { parseAiCredits } from "./aiCredits";

describe("Crossi credit fetch response", () => {
  test("reads separate text and image balances from the nested credits object", () => {
    expect(parseAiCredits({ user_id: "example", credits: { text: 150, image: 25, video: 10, audio: 40, call: 5 } })).toEqual({ text: 150, image: 25 });
  });
  test("preserves unlimited text alongside 15 image credits", () => {
    expect(parseAiCredits({ credits: { text: "unlimited", image: 15 } })).toEqual({ text: "unlimited", image: 15 });
  });
  test("accepts numeric string balances and zero", () => {
    expect(parseAiCredits({ credits: { text: "0.5", image: 0 } })).toEqual({ text: 0.5, image: 0 });
  });
  test("rejects errors, invalid balances, and deduction responses as fetch responses", () => {
    for (const data of [{ error: "failed" }, { credits: 145 }, { credits: { text: -1, image: 25 } }, { credits: { text: null, image: 25 } }]) {
      expect(parseAiCredits(data)).toBeUndefined();
    }
  });
});
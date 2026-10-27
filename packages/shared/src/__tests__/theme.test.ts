import test from "node:test";
import assert from "node:assert/strict";
import { DESIGN_TOKENS, SHARED_SUGGESTIONS, SHARED_QUICK_CHIPS, PAYMENT_SIMULATION } from "../theme/tokens";

test("DESIGN_TOKENS defines core brand colors", () => {
  assert.ok(DESIGN_TOKENS.colors.primary.DEFAULT.startsWith("#"));
  assert.ok(DESIGN_TOKENS.colors.secondary.DEFAULT.startsWith("#"));
  assert.ok(DESIGN_TOKENS.colors.tertiary.DEFAULT.startsWith("#"));
  assert.equal(DESIGN_TOKENS.colors.surface.DEFAULT, "#FFFFFF");
});

test("DESIGN_TOKENS defines standard border radii", () => {
  assert.equal(DESIGN_TOKENS.borderRadius.full, "9999px");
  assert.equal(DESIGN_TOKENS.borderRadius.lg, "16px");
});

test("SHARED_SUGGESTIONS and SHARED_QUICK_CHIPS are non-empty", () => {
  assert.ok(SHARED_SUGGESTIONS.length > 0);
  assert.ok(SHARED_QUICK_CHIPS.length > 0);
  for (const suggestion of SHARED_SUGGESTIONS) {
    assert.equal(typeof suggestion, "string");
    assert.ok(suggestion.length > 5);
  }
});

test("PAYMENT_SIMULATION has test payment options", () => {
  assert.equal(PAYMENT_SIMULATION.methods.length, 3);
  assert.ok(PAYMENT_SIMULATION.methods.some((m) => m.id === "sbp"));
  assert.ok(PAYMENT_SIMULATION.methods.some((m) => m.id === "card"));
});

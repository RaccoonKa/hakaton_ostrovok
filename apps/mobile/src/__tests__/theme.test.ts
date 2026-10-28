import test from "node:test";
import assert from "node:assert/strict";
import { theme } from "../theme";

test("mobile theme colors match web and design tokens", () => {
  assert.equal(theme.colors.primary, "#581C87", "Primary purple must be #581C87");
  assert.equal(theme.colors.headerBg, "#581C87", "Header purple must be #581C87");
  assert.equal(theme.colors.secondary, "#FF7A30", "Accent orange must be #FF7A30");
  assert.equal(theme.colors.surfaceContainer, "#F0EDF1", "User bubble surface must be #F0EDF1");
  assert.equal(theme.colors.surface, "#FFFFFF", "Card surface must be #FFFFFF");
  assert.equal(theme.colors.star, "#F59E0B", "Star rating must be #F59E0B");
});

test("mobile spacing, borderRadius, and shadows tokens are defined", () => {
  assert.equal(theme.spacing.sm, 8);
  assert.equal(theme.spacing.md, 16);
  assert.equal(theme.spacing.lg, 24);

  assert.equal(theme.borderRadius.md, 10);
  assert.equal(theme.borderRadius.lg, 16);
  assert.equal(theme.borderRadius.xl, 20);
  assert.equal(theme.borderRadius.full, 9999);

  assert.ok(theme.shadows.sm.shadowOpacity > 0);
  assert.ok(theme.shadows.md.shadowOpacity > 0);
  assert.ok(theme.shadows.lg.shadowOpacity > 0);
});

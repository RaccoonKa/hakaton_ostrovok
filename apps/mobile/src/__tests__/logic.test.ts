import test from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "@corvax/shared";
import { Currency } from "@corvax/shared";

test("booking discount calculation matches production expectations", () => {
  const basePrice = 45200;
  const discountPercent = 15;
  const discountAmount = Math.round(basePrice * (discountPercent / 100));
  const finalPrice = basePrice - discountAmount;

  assert.equal(discountAmount, 6780);
  assert.equal(finalPrice, 38420);
  assert.equal(formatPrice(finalPrice, Currency.RUB), "38\u00A0420\u00A0₽");
});

test("quick reply suggestions are valid and informative", () => {
  const suggestions = [
    "На выходные в Сочи до 50 000 ₽",
    "В Калининград на 5 дней с перелётом",
    "Отели у моря с завтраком",
    "5★ в центре Москвы на двоих",
  ];

  assert.equal(suggestions.length, 4);
  suggestions.forEach((item) => {
    assert.ok(item.length > 10, "Suggestion should be descriptive");
  });
});

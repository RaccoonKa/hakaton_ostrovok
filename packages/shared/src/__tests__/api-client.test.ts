import test from "node:test";
import assert from "node:assert/strict";
import { TravelApiClient } from "../api/agent-client";
import { TripOption } from "../domain/types";

test("TravelApiClient can be initialized with custom config", () => {
  const client = new TravelApiClient({
    baseUrl: "http://localhost:8000",
    agentId: "custom_travel",
    authSecret: "test-secret",
    useAgUi: true,
  });
  assert.ok(client);
});

test("TravelApiClient triggers demo fallback when backend is unreachable", async () => {
  // baseUrl pointing to a port that fails immediately
  const client = new TravelApiClient({
    baseUrl: "http://127.0.0.1:59999",
  });

  const tokens: string[] = [];
  let receivedOptions: TripOption[] = [];
  let isCompleted = false;

  await client.sendMessage(
    "Поездка в Сочи на двоих",
    { mockFallback: true },
    {
      onToken: (tok) => {
        tokens.push(tok);
      },
      onTripOptions: (opts) => {
        receivedOptions = opts;
      },
      onComplete: () => {
        isCompleted = true;
      },
    }
  );

  assert.ok(tokens.length > 0, "Tokens should have been streamed in mock fallback");
  const fullText = tokens.join("");
  assert.ok(fullText.includes("Отличный выбор"));
  assert.ok(receivedOptions.length > 0, "Trip options should be returned");
  assert.equal(isCompleted, true, "Streaming should complete");
});

test("TravelApiClient forwards errors when mockFallback is false", async () => {
  const client = new TravelApiClient({
    baseUrl: "http://127.0.0.1:59999",
  });

  let caughtError: Error | string | null = null;

  await client.sendMessage(
    "Тест ошибки",
    { mockFallback: false },
    {
      onError: (err) => {
        caughtError = err;
      },
    }
  );

  assert.ok(caughtError !== null, "Error callback should be triggered");
});

test("TravelApiClient aborts gracefully when AbortSignal is triggered", async () => {
  const client = new TravelApiClient({
    baseUrl: "http://127.0.0.1:59999",
  });

  const controller = new AbortController();
  controller.abort();

  let calledComplete = false;
  let calledError = false;

  await client.sendMessage(
    "Тест отмены",
    { mockFallback: false },
    {
      onComplete: () => {
        calledComplete = true;
      },
      onError: () => {
        calledError = true;
      },
    },
    controller.signal
  );

  assert.equal(calledComplete, false);
  assert.equal(calledError, false);
});

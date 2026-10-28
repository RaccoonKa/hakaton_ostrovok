import test from "node:test";
import assert from "node:assert/strict";
import {
  ClientAuthManager,
  AuthRateLimitError,
  STORAGE_AUTH_TOKEN_KEY,
  STORAGE_USER_KEY,
} from "../api/auth-client";

test("ClientAuthManager saves and restores session using standard ticket keys", () => {
  const memory = new Map<string, string>();
  ClientAuthManager.setStorageAdapter({
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, val) => memory.set(key, val),
    removeItem: (key) => memory.delete(key),
  });

  const testSession = {
    token: "jwt_token_header_payload_signature",
    user: {
      id: "usr_12345",
      email: "traveler@ostrovok.ru",
      fullName: "Алексей Смирнов",
      phone: "+79991234567",
      isGuest: false,
      tier: "Премиум" as const,
      bonusMiles: 5000,
      createdAt: "2026-10-28T14:00:00Z",
    },
  };

  ClientAuthManager.saveCurrentSession(testSession);

  // Check ticket storage keys
  assert.equal(memory.get(STORAGE_AUTH_TOKEN_KEY), testSession.token);
  assert.ok(memory.get(STORAGE_USER_KEY)?.includes("traveler@ostrovok.ru"));

  const restored = ClientAuthManager.getCurrentSession();
  assert.equal(restored?.token, testSession.token);
  assert.equal(restored?.user.email, "traveler@ostrovok.ru");
  assert.equal(restored?.user.isGuest, false);

  ClientAuthManager.saveCurrentSession(null);
  assert.equal(ClientAuthManager.getCurrentSession(), null);
  assert.equal(memory.get(STORAGE_AUTH_TOKEN_KEY), undefined);

  ClientAuthManager.setStorageAdapter(null);
});

test("ClientAuthManager.ensureAuthToken dedupes concurrent calls with singleton promise", async () => {
  const memory = new Map<string, string>();
  ClientAuthManager.setStorageAdapter({
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, val) => memory.set(key, val),
    removeItem: (key) => memory.delete(key),
  });

  let fetchCallCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url: any, _opts: any) => {
    fetchCallCount++;
    await new Promise((r) => setTimeout(r, 20));
    return new Response(
      JSON.stringify({
        token: "guest_jwt_singleton",
        user: {
          id: "guest_abc_1",
          email: "",
          full_name: "Гость",
          is_guest: true,
          created_at: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const [token1, token2, token3] = await Promise.all([
      ClientAuthManager.ensureAuthToken("http://fake-backend"),
      ClientAuthManager.ensureAuthToken("http://fake-backend"),
      ClientAuthManager.ensureAuthToken("http://fake-backend"),
    ]);

    assert.equal(token1, "guest_jwt_singleton");
    assert.equal(token2, "guest_jwt_singleton");
    assert.equal(token3, "guest_jwt_singleton");
    assert.equal(fetchCallCount, 1, "Only one network request should be dispatched across concurrent calls");
  } finally {
    globalThis.fetch = originalFetch;
    ClientAuthManager.setStorageAdapter(null);
  }
});

test("ClientAuthManager.login attaches guest_token and handles 429 Rate Limit", async () => {
  const memory = new Map<string, string>();
  ClientAuthManager.setStorageAdapter({
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, val) => memory.set(key, val),
    removeItem: (key) => memory.delete(key),
  });

  // Put an active guest session in storage
  ClientAuthManager.saveCurrentSession({
    token: "active_guest_token_999",
    user: {
      id: "guest_999",
      email: "",
      fullName: "Гость",
      isGuest: true,
      createdAt: new Date().toISOString(),
    },
  });

  const originalFetch = globalThis.fetch;
  let capturedBody: any = null;

  globalThis.fetch = async (_url: any, opts: any) => {
    capturedBody = JSON.parse(opts.body);
    return new Response(
      JSON.stringify({ detail: "Too many login attempts" }),
      { status: 429 }
    );
  };

  try {
    await assert.rejects(
      async () => {
        await ClientAuthManager.login(
          { email: "hacker@test.ru", password: "wrong" },
          "http://fake-backend"
        );
      },
      (err: any) => {
        assert.ok(err instanceof AuthRateLimitError);
        assert.equal(err.status, 429);
        return true;
      }
    );

    // Verify guest token was passed
    assert.equal(capturedBody.guest_token, "active_guest_token_999");
  } finally {
    globalThis.fetch = originalFetch;
    ClientAuthManager.setStorageAdapter(null);
  }
});

test("ClientAuthManager.register attaches guest_token and migrates session successfully", async () => {
  const memory = new Map<string, string>();
  ClientAuthManager.setStorageAdapter({
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, val) => memory.set(key, val),
    removeItem: (key) => memory.delete(key),
  });

  ClientAuthManager.saveCurrentSession({
    token: "guest_migrating_123",
    user: {
      id: "guest_123",
      email: "",
      fullName: "Гость",
      isGuest: true,
      createdAt: new Date().toISOString(),
    },
  });

  const originalFetch = globalThis.fetch;
  let capturedBody: any = null;

  globalThis.fetch = async (_url: any, opts: any) => {
    capturedBody = JSON.parse(opts.body);
    return new Response(
      JSON.stringify({
        token: "usr_jwt_migrated_456",
        user: {
          id: "usr_456",
          email: "alex@ostrovok.ru",
          full_name: "Алексей Смирнов",
          phone: "+79991234567",
          is_guest: false,
          created_at: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const session = await ClientAuthManager.register(
      {
        email: "alex@ostrovok.ru",
        password: "Password123!",
        fullName: "Алексей Смирнов",
        phone: "+79991234567",
      },
      "http://fake-backend"
    );

    assert.equal(capturedBody.guest_token, "guest_migrating_123");
    assert.equal(session.token, "usr_jwt_migrated_456");
    assert.equal(session.user.isGuest, false);
    assert.equal(session.user.fullName, "Алексей Смирнов");

    // Storage should now hold the migrated session
    const current = ClientAuthManager.getCurrentSession();
    assert.equal(current?.token, "usr_jwt_migrated_456");
    assert.equal(current?.user.isGuest, false);
  } finally {
    globalThis.fetch = originalFetch;
    ClientAuthManager.setStorageAdapter(null);
  }
});

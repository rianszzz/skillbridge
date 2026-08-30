import assert from "node:assert/strict";
import test from "node:test";
import { assertJsonRequest, assertUuid, operationKey, PublicError } from "./api-security.ts";

test("UUID dan Content-Type divalidasi sebelum query atau parsing", () => {
  assert.doesNotThrow(() => assertUuid("550e8400-e29b-41d4-a716-446655440000"));
  assert.throws(() => assertUuid("not-a-uuid"), (error: unknown) => error instanceof PublicError && error.status === 400);
  assert.doesNotThrow(() => assertJsonRequest(new Request("https://example.test", { headers: { "Content-Type": "application/json; charset=utf-8" } })));
  assert.throws(() => assertJsonRequest(new Request("https://example.test")), (error: unknown) => error instanceof PublicError && error.status === 415);
});

test("operation key stabil dan memisahkan input", () => {
  assert.equal(operationKey("a", "b"), operationKey("a", "b"));
  assert.notEqual(operationKey("ab", "c"), operationKey("a", "bc"));
});

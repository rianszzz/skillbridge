import assert from "node:assert/strict";
import test from "node:test";
import { authErrorMessage } from "./auth-errors.ts";

test("pesan auth teknis diubah menjadi tindakan yang aman", () => {
  assert.match(authErrorMessage({ message: "Invalid API key" }), /restart atau redeploy/);
  assert.match(authErrorMessage({ code: "over_email_send_rate_limit", message: "email rate limit exceeded" }), /Tunggu/);
  assert.match(authErrorMessage({ code: "email_address_not_authorized", message: "not authorized" }), /custom SMTP/);
});

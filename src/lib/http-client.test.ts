import assert from "node:assert/strict";
import test from "node:test";
import { responseData } from "./http-client.ts";

test("response JSON dibaca dan timeout non-JSON diberi pesan aman", async () => {
  assert.deepEqual(await responseData(new Response('{"id":"1"}', { headers: { "content-type": "application/json" } })), { id: "1" });
  assert.match(String((await responseData(new Response("An error occurred", { status: 504 }))).error), /batas waktu/);
});

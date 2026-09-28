import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { buildSignature } from "../src/okx-client.js";

test("buildSignature signs the exact OKX pre-hash value", () => {
  const timestamp = "2020-12-08T09:08:57.715Z";
  const path = "/api/v5/account/balance?ccy=BTC";
  const secret = "test-secret";
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}GET${path}`)
    .digest("base64");

  assert.equal(buildSignature(timestamp, "GET", path, "", secret), expected);
});

test("buildSignature includes a POST body", () => {
  const body = '{"instId":"BTC-USDT-SWAP","side":"buy"}';
  const signature = buildSignature("2026-01-01T00:00:00.000Z", "POST", "/api/v5/trade/order", body, "secret");

  assert.equal(
    signature,
    createHmac("sha256", "secret")
      .update(`2026-01-01T00:00:00.000ZPOST/api/v5/trade/order${body}`)
      .digest("base64"),
  );
});

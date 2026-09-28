import { parseArgs } from "node:util";
import { loadConfig } from "./config.js";
import { OkxApiError, OkxClient } from "./okx-client.js";

const command = process.argv[2];

const { values } = parseArgs({
  args: process.argv.slice(3),
  options: {
    env: { type: "string", default: "demo" },
    instrument: { type: "string" },
    currency: { type: "string" },
    leverage: { type: "string" },
    margin: { type: "string" },
    side: { type: "string" },
    "position-side": { type: "string" },
    size: { type: "string" },
    type: { type: "string" },
    price: { type: "string" },
    "target-currency": { type: "string" },
    "reduce-only": { type: "boolean", default: false },
    confirm: { type: "boolean", default: false },
  },
  strict: true,
  allowPositionals: false,
});

function oneOf<T extends string>(name: string, value: string | undefined, allowed: readonly T[]): T {
  if (!value || !allowed.includes(value as T)) {
    throw new Error(`--${name} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function positive(name: string, value: string | undefined): string {
  if (!value || !Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw new Error(`--${name} must be a positive number`);
  }
  return value;
}

function instrument(kind: "futures" | "margin"): string {
  const value = values.instrument?.toUpperCase();
  if (!value) throw new Error("--instrument is required");
  if (kind === "futures" && !/^[A-Z0-9]+-[A-Z0-9]+-(SWAP|\d{6})$/.test(value)) {
    throw new Error("Futures instrument must look like BTC-USDT-SWAP or BTC-USDT-261225");
  }
  if (kind === "margin" && !/^[A-Z0-9]+-[A-Z0-9]+$/.test(value)) {
    throw new Error("Margin instrument must look like BTC-USDT");
  }
  return value;
}

function orderPayload(kind: "futures" | "margin"): Record<string, unknown> {
  const ordType = oneOf("type", values.type, ["market", "limit", "post_only", "ioc", "fok"] as const);
  const payload: Record<string, unknown> = {
    instId: instrument(kind),
    tdMode: oneOf("margin", values.margin, ["isolated", "cross"] as const),
    side: oneOf("side", values.side, ["buy", "sell"] as const),
    ordType,
    sz: positive("size", values.size),
  };

  if (ordType !== "market") payload.px = positive("price", values.price);
  if (values.currency) payload.ccy = values.currency.toUpperCase();

  if (kind === "futures") {
    if (values["position-side"]) {
      payload.posSide = oneOf("position-side", values["position-side"], ["long", "short"] as const);
    }
    if (values["reduce-only"]) payload.reduceOnly = true;
  } else {
    if (values["position-side"]) throw new Error("--position-side is not valid for margin orders");
    if (values["target-currency"]) {
      payload.tgtCcy = oneOf("target-currency", values["target-currency"], ["base_ccy", "quote_ccy"] as const);
    }
    if (values["reduce-only"]) payload.reduceOnly = true;
  }

  return payload;
}

async function submitWrite(
  client: OkxClient,
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!values.confirm) {
    console.log(JSON.stringify({ dryRun: true, environment: client.demo ? "demo" : "live", endpoint, payload }, null, 2));
    console.log("\nNo request sent. Add --confirm to submit this exact operation.");
    return;
  }
  if (!client.demo && !client.liveTradingEnabled) {
    throw new Error("Production writes are blocked. Set OKX_LIVE_TRADING=true in .env only when ready.");
  }
  const data = await client.post(endpoint, payload);
  console.log(JSON.stringify({ environment: client.demo ? "demo" : "live", data }, null, 2));
}

function usage(): never {
  console.error(`Usage:
  npm run balance:demo
  npm run set-leverage:demo -- --instrument BTC-USDT-SWAP --leverage 3 --margin isolated [--confirm]
  npm run futures:demo -- --instrument BTC-USDT-SWAP --margin isolated --side buy --type market --size 1 [--confirm]
  npm run margin:demo -- --instrument BTC-USDT --margin isolated --side buy --type limit --size 0.001 --price 50000 [--confirm]

Use --env demo|live with the base scripts, or use the :demo and :live convenience scripts.`);
  process.exitCode = 1;
  throw new Error("Unknown or missing command");
}

async function main(): Promise<void> {
  if (!["balance", "set-leverage", "futures", "margin"].includes(command || "")) usage();

  const environment = oneOf("env", values.env, ["demo", "live"] as const);
  const client = new OkxClient(loadConfig(environment));
  if (command === "balance") {
    console.log(JSON.stringify(await client.get("/api/v5/account/balance"), null, 2));
    return;
  }

  if (command === "set-leverage") {
    const payload: Record<string, unknown> = {
      lever: positive("leverage", values.leverage),
      mgnMode: oneOf("margin", values.margin, ["isolated", "cross"] as const),
    };
    if (values.instrument) payload.instId = values.instrument.toUpperCase();
    if (values.currency) payload.ccy = values.currency.toUpperCase();
    if (!payload.instId && !payload.ccy) throw new Error("--instrument or --currency is required");
    if (values["position-side"]) {
      payload.posSide = oneOf("position-side", values["position-side"], ["long", "short"] as const);
    }
    await submitWrite(client, "/api/v5/account/set-leverage", payload);
    return;
  }

  await submitWrite(client, "/api/v5/trade/order", orderPayload(command as "futures" | "margin"));
}

main().catch((error: unknown) => {
  if (error instanceof OkxApiError) {
    console.error(`OKX error ${error.code}: ${error.message}`);
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
});

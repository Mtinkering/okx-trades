import "dotenv/config";

export interface Config {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  baseUrl: string;
  demo: boolean;
  liveTrading: boolean;
  timeoutMs: number;
}

export type TradingEnvironment = "demo" | "live";

function booleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be "true" or "false"`);
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required in .env`);
  return value;
}

export function loadConfig(environment: TradingEnvironment): Config {
  const baseUrl = (process.env.OKX_BASE_URL || "https://openapi.okx.com").replace(/\/+$/, "");
  if (!baseUrl.startsWith("https://")) throw new Error("OKX_BASE_URL must use HTTPS");

  const timeoutMs = Number(process.env.OKX_REQUEST_TIMEOUT_MS || "10000");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
    throw new Error("OKX_REQUEST_TIMEOUT_MS must be an integer from 1000 to 60000");
  }

  const credentialPrefix = environment === "demo" ? "OKX_DEMO" : "OKX_LIVE";

  return {
    apiKey: required(`${credentialPrefix}_API_KEY`),
    secretKey: required(`${credentialPrefix}_SECRET_KEY`),
    passphrase: required(`${credentialPrefix}_PASSPHRASE`),
    baseUrl,
    demo: environment === "demo",
    liveTrading: booleanEnv("OKX_LIVE_TRADING", false),
    timeoutMs,
  };
}

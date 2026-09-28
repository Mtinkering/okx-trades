import { createHmac } from "node:crypto";
import type { Config } from "./config.js";

type HttpMethod = "GET" | "POST";

interface OkxEnvelope<T> {
  code: string;
  msg: string;
  data: T[];
}

export class OkxApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OkxApiError";
  }
}

export function buildSignature(
  timestamp: string,
  method: HttpMethod,
  requestPath: string,
  body: string,
  secretKey: string,
): string {
  return createHmac("sha256", secretKey)
    .update(timestamp + method + requestPath + body)
    .digest("base64");
}

export class OkxClient {
  constructor(private readonly config: Config) {}

  get demo(): boolean {
    return this.config.demo;
  }

  get liveTradingEnabled(): boolean {
    return this.config.liveTrading;
  }

  async get<T>(requestPath: string): Promise<T[]> {
    return this.request<T>("GET", requestPath);
  }

  async post<T>(requestPath: string, payload: Record<string, unknown>): Promise<T[]> {
    return this.request<T>("POST", requestPath, payload);
  }

  private async request<T>(
    method: HttpMethod,
    requestPath: string,
    payload?: Record<string, unknown>,
  ): Promise<T[]> {
    const timestamp = new Date().toISOString();
    const body = payload === undefined ? "" : JSON.stringify(payload);
    const signature = buildSignature(timestamp, method, requestPath, body, this.config.secretKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${requestPath}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "OK-ACCESS-KEY": this.config.apiKey,
          "OK-ACCESS-SIGN": signature,
          "OK-ACCESS-TIMESTAMP": timestamp,
          "OK-ACCESS-PASSPHRASE": this.config.passphrase,
          ...(this.config.demo ? { "x-simulated-trading": "1" } : {}),
        },
        ...(body ? { body } : {}),
        signal: controller.signal,
      });

      const text = await response.text();
      let result: OkxEnvelope<T>;
      try {
        result = JSON.parse(text) as OkxEnvelope<T>;
      } catch {
        throw new OkxApiError(`OKX returned non-JSON (HTTP ${response.status})`, "INVALID_RESPONSE", response.status);
      }

      if (!response.ok || result.code !== "0") {
        throw new OkxApiError(result.msg || `OKX request failed (HTTP ${response.status})`, result.code, response.status);
      }

      const rejected = result.data.find((item) => {
        if (typeof item !== "object" || item === null) return false;
        return "sCode" in item && item.sCode !== "0";
      });
      if (rejected && typeof rejected === "object" && "sCode" in rejected) {
        const message = "sMsg" in rejected ? String(rejected.sMsg) : "Order rejected";
        throw new OkxApiError(message, String(rejected.sCode), response.status);
      }

      return result.data;
    } catch (error) {
      if (error instanceof OkxApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new OkxApiError(`OKX request timed out after ${this.config.timeoutMs}ms`, "TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

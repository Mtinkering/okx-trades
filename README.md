# OKX trading CLI

Node.js/TypeScript scripts for OKX perpetual/expiry futures and leveraged spot-margin orders. The default configuration targets OKX Demo Trading and every write is a dry run unless `--confirm` is supplied.

## Setup

Requirements: Node.js 20.6 or newer.

```bash
npm install
cp .env.example .env
```

Create a **Demo Trading API key** in OKX and put its key, secret, and passphrase in `.env`. The key needs `Read` and `Trade` permissions; do not grant withdrawal permission.

Dubai/global accounts normally use `https://openapi.okx.com`. The API is selected by the entity where the account was registered, not your current location. Keep `OKX_BASE_URL` configurable because US/AU and EEA accounts use regional domains.

## Commands

Check authentication and balances:

```bash
npm run balance
```

Set isolated leverage (dry run, then demo submission):

```bash
npm run set-leverage -- --instrument BTC-USDT-SWAP --leverage 3 --margin isolated
npm run set-leverage -- --instrument BTC-USDT-SWAP --leverage 3 --margin isolated --confirm
```

Place a perpetual futures order:

```bash
npm run futures -- --instrument BTC-USDT-SWAP --margin isolated --side buy --type market --size 1
npm run futures -- --instrument BTC-USDT-SWAP --margin isolated --side buy --type market --size 1 --confirm
```

For accounts in long/short position mode, add `--position-side long` or `--position-side short`. In net mode, omit it. For futures, `--size` is the number of contracts, **not** the BTC/ETH amount.

Place an isolated spot-margin limit order:

```bash
npm run set-leverage -- --instrument BTC-USDT --leverage 3 --margin isolated --confirm
npm run margin -- --instrument BTC-USDT --margin isolated --side buy --type limit --size 0.001 --price 50000
npm run margin -- --instrument BTC-USDT --margin isolated --side buy --type limit --size 0.001 --price 50000 --confirm
```

For market margin orders, `--target-currency base_ccy` or `--target-currency quote_ccy` can clarify the unit represented by `--size`. Account mode and available trade modes must also be configured correctly in OKX.

Other supported options:

- `--margin isolated|cross`
- `--type market|limit|post_only|ioc|fok`
- `--currency USDT`
- `--reduce-only`

## Production safety

Production writes require all three:

1. `OKX_DEMO=false`
2. `OKX_LIVE_TRADING=true`
3. `--confirm` on the command

Use an IP-bound API key with only `Read` and `Trade` permissions. Verify instrument contract values, lot sizes, account mode, position mode, margin mode, and the dry-run payload before submitting.

## Development

```bash
npm run typecheck
npm test
npm run build
```

API references:

- [OKX API v5 overview](https://www.okx.com/docs-v5/en/#overview)
- [Place order](https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-place-order)
- [Set leverage](https://www.okx.com/docs-v5/en/#trading-account-rest-api-post-set-leverage)

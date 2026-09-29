# OKX trading CLI

Node.js/TypeScript scripts for OKX perpetual/expiry futures and leveraged spot-margin orders. The default configuration targets OKX Demo Trading and every write is a dry run unless `--confirm` is supplied.

## Setup

Requirements: Node.js 20.6 or newer.

```bash
npm install
cp .env.example .env
```

Create a **Demo Trading API key** in OKX and put its key, secret, and passphrase in the `OKX_DEMO_*` fields in `.env`. Demo credentials are different from production credentials. The key needs `Read` and `Trade` permissions; do not grant withdrawal permission.

Dubai/global accounts normally use `https://openapi.okx.com`. The API is selected by the entity where the account was registered, not your current location. Keep `OKX_BASE_URL` configurable because US/AU and EEA accounts use regional domains.

## Commands

### Demo trading

All base commands default to demo. The explicit `:demo` scripts make the selected environment easy to see.

Check demo authentication and balances:

```bash
npm run balance:demo
```

Check a live Funding Account balance, including newly deposited USDT:

```bash
npm run funding:live -- --currency USDT
```

`balance:*` reads the Trading Account through `/api/v5/account/balance`. `funding:*` reads the Funding Account through `/api/v5/asset/balances`. Omit `--currency` to return every non-zero Funding Account balance.

Set isolated leverage (dry run, then demo submission):

```bash
npm run set-leverage:demo -- --instrument BTC-USDT-SWAP --leverage 3 --margin isolated
npm run set-leverage:demo -- --instrument BTC-USDT-SWAP --leverage 3 --margin isolated --confirm
```

Place a perpetual futures order:

```bash
npm run futures:demo -- --instrument BTC-USDT-SWAP --margin isolated --side buy --type market --size 1
npm run futures:demo -- --instrument BTC-USDT-SWAP --margin isolated --side buy --type market --size 1 --confirm
```

For accounts in long/short position mode, add `--position-side long` or `--position-side short`. In net mode, omit it. For futures, `--size` is the number of contracts, **not** the BTC/ETH amount.

Place an isolated spot-margin limit order:

```bash
npm run set-leverage:demo -- --instrument BTC-USDT --leverage 3 --margin isolated --confirm
npm run margin:demo -- --instrument BTC-USDT --margin isolated --side buy --type limit --size 0.001 --price 50000
npm run margin:demo -- --instrument BTC-USDT --margin isolated --side buy --type limit --size 0.001 --price 50000 --confirm
```

For market margin orders, `--target-currency base_ccy` or `--target-currency quote_ccy` can clarify the unit represented by `--size`. Account mode and available trade modes must also be configured correctly in OKX.

Other supported options:

- `--env demo|live` (base scripts default to `demo`)
- `--margin isolated|cross`
- `--type market|limit|post_only|ioc|fok`
- `--currency USDT`
- `--reduce-only`

## Production safety

### Switching to live trading

Add a separate production key to the `OKX_LIVE_*` fields. First verify read-only access:

```bash
npm run balance:live
```

Preview a live order without sending it:

```bash
npm run futures:live -- --instrument BTC-USDT-SWAP --margin isolated --side buy --type market --size 1
```

Production writes require both:

1. `OKX_LIVE_TRADING=true` in `.env`
2. `--confirm` on a `:live` command

```bash
npm run futures:live -- --instrument BTC-USDT-SWAP --margin isolated --side buy --type market --size 1 --confirm
```

Demo scripts always use `OKX_DEMO_*` credentials and send OKX's `x-simulated-trading: 1` header. Live scripts use only `OKX_LIVE_*` credentials and omit that header. Use an IP-bound production key with only `Read` and `Trade` permissions. Verify instrument contract values, lot sizes, account mode, position mode, margin mode, and the dry-run payload before submitting.

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

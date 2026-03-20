# GF(p) Polynomial Long Division (TypeScript)

This module performs polynomial long division in the coefficient field `GF(p)`:
- All coefficient arithmetic is done modulo `p` (so subtraction is “XOR-style” only when `p=2`).
- For `p>2`, subtraction/addition follow normal mod-`p` arithmetic.
- Inputs can be either:
  - **bitstring** digits (highest degree on the left), e.g. `100111`
  - **polynomial form** like `1+x+x^2+x^5`

## Build

```bash
npm run build
```

## CLI Usage

```bash
npm run cli -- --p 2 --dividend 100111 --divisor 1011 --showSteps
```

Polynomial-form example:

```bash
npm run cli -- --p 2 --mode polynomial --dividend 1+x+x^2+x^5 --divisor 1+x+x^2
```

## Library Usage

```ts
import { dividePolynomialsGFp } from "./src";

const result = dividePolynomialsGFp("100111", "1011", {
  fieldP: 2,
  showSteps: true,
});
```

## Notes / Current Limits

- Bitstring encoding uses **single decimal digits** per coefficient, so it supports `p<=10`.
- The polynomial parser currently supports `+` separated terms only (no `-`).
- The divisor must have strictly smaller degree than the dividend.


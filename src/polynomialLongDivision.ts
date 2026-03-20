export type RepresentationMode = "auto" | "bitstring" | "polynomial";

export class PolynomialDivisionError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface PolynomialCoeffs {
  /**
   * Coefficients in ascending degree order: coeffs[i] is the coefficient of x^i.
   * All coefficients are in [0, p-1] for the active field p.
   */
  coeffs: number[];
}

export interface EncodedPolynomial {
  degree: number;
  coeffs: number[];
  bitString?: string;
  polynomial?: string;
}

export interface DivisionStep {
  index: number;
  remainderDegreeBefore: number;
  shift: number;
  factor: number;
  quotientTermDegree: number;
  subtrahend: EncodedPolynomial; // factor * (divisor << shift)
  remainderAfter: EncodedPolynomial;
  quotientAfter: EncodedPolynomial;
}

export interface DivideResult {
  fieldP: number;
  quotient: EncodedPolynomial;
  remainder: EncodedPolynomial;
  steps?: DivisionStep[];
}

type DecodeResult = {
  coeffs: number[];
  modeUsed: Exclude<RepresentationMode, "auto">;
};

function mod(n: number, p: number) {
  const r = n % p;
  return r < 0 ? r + p : r;
}

function trimTrailingZeros(coeffs: number[], p: number) {
  let i = coeffs.length - 1;
  while (i >= 0) {
    if (mod(coeffs[i], p) !== 0) break;
    i--;
  }
  if (i < 0) return [];
  return coeffs.slice(0, i + 1).map((c) => mod(c, p));
}

function degree(coeffs: number[]) {
  if (coeffs.length === 0) return -Infinity;
  return coeffs.length - 1;
}

function isZeroPoly(coeffs: number[]) {
  return coeffs.length === 0;
}

function invModPrimeOrCoprime(a: number, p: number) {
  // Extended Euclid: find x such that a*x + p*y = gcd(a,p)
  let t = 0;
  let newT = 1;
  let r = p;
  let newR = mod(a, p);

  while (newR !== 0) {
    const q = Math.floor(r / newR);
    const tmpT = t - q * newT;
    t = newT;
    newT = tmpT;

    const tmpR = r - q * newR;
    r = newR;
    newR = tmpR;
  }

  // r is now gcd(a,p)
  if (r !== 1) {
    throw new PolynomialDivisionError(
      "NON_INVERTIBLE_LEAD_COEFF",
      `Leading coefficient ${a} has no modular inverse modulo p=${p} (gcd != 1). Use prime p or ensure divisor leading coefficient is coprime to p.`
    );
  }

  return mod(t, p);
}

function canRepresentAsBitString(p: number) {
  // We use single decimal digits for coefficients in the bitstring form.
  return p >= 2 && p <= 10;
}

function coeffsToBitString(coeffs: number[], p: number) {
  const d = degree(coeffs);
  if (!Number.isFinite(d)) return "0";
  if (!canRepresentAsBitString(p)) {
    throw new PolynomialDivisionError(
      "BITSTRING_NOT_SUPPORTED_FOR_P",
      `Bitstring encoding/decoding only supports p<=10 (single-digit coefficients). For p=${p}, use polynomial form.`
    );
  }
  let out = "";
  for (let i = d; i >= 0; i--) out += String(mod(coeffs[i] ?? 0, p));
  // Normalize: bitstring should not have leading zeros.
  return out.replace(/^0+/, "") || "0";
}

function coeffsToPolynomialString(coeffs: number[], p: number) {
  const d = degree(coeffs);
  if (!Number.isFinite(d)) return "0";
  const terms: string[] = [];
  for (let i = d; i >= 0; i--) {
    const c = mod(coeffs[i] ?? 0, p);
    if (c === 0) continue;
    if (i === 0) {
      terms.push(String(c));
      continue;
    }
    const coeffPart = c === 1 ? "" : `${c}*`;
    const xPart = i === 1 ? "x" : `x^${i}`;
    terms.push(`${coeffPart}${xPart}`);
  }
  return terms.length ? terms.join("+") : "0";
}

function encode(coeffs: number[], p: number): EncodedPolynomial {
  const d = degree(coeffs);
  const out: EncodedPolynomial = {
    degree: Number.isFinite(d) ? d : -Infinity,
    coeffs: coeffs.map((c) => mod(c, p)),
  };
  if (canRepresentAsBitString(p)) out.bitString = coeffsToBitString(coeffs, p);
  out.polynomial = coeffsToPolynomialString(coeffs, p);
  return out;
}

function detectMode(input: string): Exclude<RepresentationMode, "auto"> {
  const s = input.trim();
  if (s.length === 0) throw new PolynomialDivisionError("EMPTY_INPUT", "Input cannot be empty.");

  // If it contains an x term or + or ^, treat as polynomial form.
  if (/[xX^+*]/.test(s)) return "polynomial";
  // Otherwise, digits-only = bitstring (we'll validate coefficient digits later).
  if (/^\d+$/.test(s)) return "bitstring";
  throw new PolynomialDivisionError(
    "UNKNOWN_INPUT_FORMAT",
    "Could not detect input format. Use digits-only bitstring (e.g. 100111) or polynomial form (e.g. 1+x+x^2+x^5)."
  );
}

function parseBitString(input: string, p: number): DecodeResult {
  const s = input.trim().replace(/_/g, "");
  if (!/^\d+$/.test(s)) {
    throw new PolynomialDivisionError("INVALID_BITSTRING", "Bitstring must be digits only (e.g. 100111).");
  }
  if (!canRepresentAsBitString(p)) {
    throw new PolynomialDivisionError(
      "BITSTRING_NOT_SUPPORTED_FOR_P",
      `Bitstring decoding only supports p<=10. For p=${p}, use polynomial form.`
    );
  }

  const coeffsHighToLow = [...s].map((ch) => {
    const d = ch.charCodeAt(0) - "0".charCodeAt(0);
    if (d >= p) {
      throw new PolynomialDivisionError(
        "BITSTRING_DIGIT_OUT_OF_RANGE",
        `Bitstring digit '${ch}' is not valid for p=${p}. Valid digits are 0..${p - 1}.`
      );
    }
    return d;
  });

  // Leftmost digit is highest degree coefficient. Internally we store ascending degree order.
  const coeffsLowToHigh = coeffsHighToLow.reverse();
  const trimmed = trimTrailingZeros(coeffsLowToHigh, p);

  return { coeffs: trimmed, modeUsed: "bitstring" };
}

function parsePolynomial(input: string, p: number): DecodeResult {
  const raw = input.trim().replace(/\s+/g, "");
  if (raw.length === 0) throw new PolynomialDivisionError("EMPTY_INPUT", "Input cannot be empty.");
  if (raw.includes("-")) {
    throw new PolynomialDivisionError(
      "POLYNOMIAL_PARSING_UNSUPPORTED",
      "Polynomial parser currently supports only '+'-separated terms (no '-' signs)."
    );
  }
  if (!raw.includes("+") && !raw.includes("x") && !/^\d+$/.test(raw)) {
    throw new PolynomialDivisionError("INVALID_POLYNOMIAL", `Could not parse polynomial form: '${input}'.`);
  }

  const terms = raw.split("+").filter((t) => t.length > 0);
  if (terms.length === 0) throw new PolynomialDivisionError("INVALID_POLYNOMIAL", "Polynomial has no terms.");

  let maxExp = 0;
  const parsed: Array<{ coeff: number; exp: number }> = [];
  for (const term of terms) {
    if (term === "x") {
      parsed.push({ coeff: 1, exp: 1 });
      maxExp = Math.max(maxExp, 1);
      continue;
    }

    if (term.startsWith("x")) {
      // e.g. x^2
      const m = term.match(/^x(?:\^(\d+))?$/i);
      if (!m) throw new PolynomialDivisionError("INVALID_TERM", `Invalid term '${term}'.`);
      const exp = m[1] ? Number(m[1]) : 1;
      if (!Number.isInteger(exp) || exp < 0) throw new PolynomialDivisionError("INVALID_EXPONENT", `Bad exponent in '${term}'.`);
      parsed.push({ coeff: 1, exp });
      maxExp = Math.max(maxExp, exp);
      continue;
    }

    // Constant: 12
    if (/^\d+$/.test(term)) {
      const coeff = Number(term);
      parsed.push({ coeff, exp: 0 });
      maxExp = Math.max(maxExp, 0);
      continue;
    }

    // Coeff*x^exp or Coeff*x or Coeffx^exp or Coeffx
    // Examples: 2*x^3, 2x^3, 2*x, 2x
    const m = term.match(/^(\d+)\*?x(?:\^(\d+))?$/i);
    if (!m) throw new PolynomialDivisionError("INVALID_TERM", `Invalid term '${term}'.`);
    const coeff = Number(m[1]);
    const exp = m[2] ? Number(m[2]) : 1;
    if (!Number.isInteger(exp) || exp < 0) throw new PolynomialDivisionError("INVALID_EXPONENT", `Bad exponent in '${term}'.`);
    parsed.push({ coeff, exp });
    maxExp = Math.max(maxExp, exp);
  }

  const coeffs = new Array(maxExp + 1).fill(0);
  for (const { coeff, exp } of parsed) {
    coeffs[exp] = mod(coeffs[exp] + coeff, p);
  }

  return { coeffs: trimTrailingZeros(coeffs, p), modeUsed: "polynomial" };
}

function decodeInput(input: string, p: number, mode: RepresentationMode): DecodeResult {
  if (mode !== "auto") {
    if (mode === "bitstring") return parseBitString(input, p);
    return parsePolynomial(input, p);
  }
  const detected = detectMode(input);
  if (detected === "bitstring") return parseBitString(input, p);
  return parsePolynomial(input, p);
}

export interface DivideOptions {
  fieldP?: number; // default 2
  showSteps?: boolean; // default false
  representationMode?: RepresentationMode; // default "auto"
}

export function dividePolynomialsGFp(
  dividendInput: string,
  divisorInput: string,
  options: DivideOptions = {}
): DivideResult {
  const fieldP = options.fieldP ?? 2;
  const showSteps = options.showSteps ?? false;
  const representationMode = options.representationMode ?? "auto";

  if (!Number.isInteger(fieldP) || fieldP < 2) {
    throw new PolynomialDivisionError("INVALID_FIELD_P", "`fieldP` must be an integer >= 2.");
  }

  const dividend = decodeInput(dividendInput, fieldP, representationMode).coeffs;
  const divisor = decodeInput(divisorInput, fieldP, representationMode).coeffs;

  if (isZeroPoly(divisor)) {
    throw new PolynomialDivisionError("DIVIDE_BY_ZERO_POLYNOMIAL", "Divisor cannot be the zero polynomial.");
  }

  const degDividend = degree(dividend);
  const degDivisor = degree(divisor);

  if (isZeroPoly(dividend)) {
    // 0 / divisor = 0 remainder 0
    const zeroEnc = encode([], fieldP);
    return {
      fieldP,
      quotient: zeroEnc,
      remainder: zeroEnc,
      ...(showSteps ? { steps: [] } : {}),
    };
  }

  if (degDivisor > degDividend) {
    throw new PolynomialDivisionError(
      "DIVISOR_DEGREE_MUST_NOT_BE_GREATER",
      `Require deg(divisor) <= deg(dividend). Got deg(divisor)=${degDivisor}, deg(dividend)=${degDividend}.`
    );
  }

  const qLen = degDividend - degDivisor + 1;
  let q = new Array(qLen).fill(0);
  let r = dividend.slice(); // mutable remainder

  const dLead = divisor[degDivisor];
  const dLeadInv = invModPrimeOrCoprime(dLead, fieldP);

  const steps: DivisionStep[] = [];

  let stepIndex = 0;
  while (!isZeroPoly(r) && degree(r) >= degDivisor) {
    const rDeg = degree(r);
    const rLead = r[rDeg] ?? 0;
    const shift = rDeg - degDivisor;

    // factor = rLead / dLead (mod fieldP)
    const factor = mod(rLead * dLeadInv, fieldP);

    // Record the subtrahend = factor * divisor * x^shift
    const subtrahendCoeffs = new Array(shift + degDivisor + 1).fill(0);
    for (let i = 0; i <= degDivisor; i++) {
      subtrahendCoeffs[i + shift] = mod(factor * (divisor[i] ?? 0), fieldP);
    }

    q[shift] = mod(q[shift] + factor, fieldP);

    const remainderBefore = r.slice();
    // r = r - factor * (divisor << shift)  (subtraction is mod p)
    for (let i = 0; i <= degDivisor; i++) {
      r[i + shift] = mod(r[i + shift] - factor * (divisor[i] ?? 0), fieldP);
    }
    r = trimTrailingZeros(r, fieldP);

    if (showSteps) {
      // quotient after current step might still include higher zeros; trim for display
      const qTrim = trimTrailingZeros(q, fieldP);
      const subEnc = encode(trimTrailingZeros(subtrahendCoeffs, fieldP), fieldP);
      const rAfterEnc = encode(r, fieldP);
      const qAfterEnc = encode(qTrim, fieldP);
      steps.push({
        index: stepIndex++,
        remainderDegreeBefore: degree(remainderBefore),
        shift,
        factor,
        quotientTermDegree: shift,
        subtrahend: subEnc,
        remainderAfter: rAfterEnc,
        quotientAfter: qAfterEnc,
      });
    }
  }

  const qTrim = trimTrailingZeros(q, fieldP);
  const quotientEnc = encode(qTrim, fieldP);
  const remainderEnc = encode(r, fieldP);

  return {
    fieldP,
    quotient: quotientEnc,
    remainder: remainderEnc,
    ...(showSteps ? { steps } : {}),
  };
}


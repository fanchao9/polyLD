import { dividePolynomialsGFp, RepresentationMode } from "./polynomialLongDivision";

function usage() {
  return [
    "Polynomial long division over GF(p).",
    "",
    "Examples:",
    "  node dist/cli.js --p 2 --showSteps --dividend 100111 --divisor 1011",
    "  node dist/cli.js --p 2 --dividend 1+x+x^2+x^5 --divisor 1+x+x^2 --mode polynomial",
    "",
    "Args:",
    "  --p <primeOrCoprime>       Field size p (default 2).",
    "  --showSteps                Print long-division trace (default false).",
    "  --dividend <polyOrBits>    Dividend (bitstring digits or polynomial form).",
    "  --divisor <polyOrBits>     Divisor (bitstring digits or polynomial form).",
    "  --mode <auto|bitstring|polynomial>  Input parsing mode (default auto).",
  ].join("\n");
}

function getValue(args: string[], key: string) {
  const idx = args.indexOf(key);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(args: string[], key: string) {
  return args.includes(key);
}

function parseMode(s?: string): RepresentationMode | undefined {
  if (!s) return undefined;
  if (s === "auto" || s === "bitstring" || s === "polynomial") return s;
  throw new Error(`Invalid --mode '${s}'. Use auto|bitstring|polynomial.`);
}

const args = process.argv.slice(2);

const fieldP = getValue(args, "--p") ?? getValue(args, "--field") ?? "2";
const dividend = getValue(args, "--dividend");
const divisor = getValue(args, "--divisor");
const showSteps = hasFlag(args, "--showSteps") || hasFlag(args, "--steps");
const representationMode = parseMode(getValue(args, "--mode"));

if (
  dividend === undefined ||
  divisor === undefined ||
  dividend.trim().length === 0 ||
  divisor.trim().length === 0
) {
  console.error(usage());
  process.exit(1);
}

const p = Number(fieldP);
if (!Number.isInteger(p) || p < 2) {
  console.error(`Invalid --p '${fieldP}'. Must be integer >= 2.`);
  process.exit(1);
}

const dividendStr = dividend.trim();
const divisorStr = divisor.trim();

const result = dividePolynomialsGFp(dividendStr, divisorStr, {
  fieldP: p,
  showSteps,
  representationMode,
});

const qBits = result.quotient.bitString ? ` (bits: ${result.quotient.bitString})` : "";
const rBits = result.remainder.bitString ? ` (bits: ${result.remainder.bitString})` : "";

console.log(`Quotient: ${result.quotient.polynomial}${qBits}`);
console.log(`Remainder: ${result.remainder.polynomial}${rBits}`);

if (result.steps && result.steps.length > 0) {
  console.log("");
  for (const step of result.steps) {
    const subBits = step.subtrahend.bitString ? ` (bits: ${step.subtrahend.bitString})` : "";
    const qBits2 = step.quotientAfter.bitString ? ` (bits: ${step.quotientAfter.bitString})` : "";
    const rBits2 = step.remainderAfter.bitString ? ` (bits: ${step.remainderAfter.bitString})` : "";
    console.log(
      [
        `Step ${step.index}:`,
        `  remainderDegreeBefore=${step.remainderDegreeBefore}`,
        `  shift=${step.shift}`,
        `  factor=${step.factor}`,
        `  subtrahend=${step.subtrahend.polynomial}${subBits}`,
        `  quotientAfter=${step.quotientAfter.polynomial}${qBits2}`,
        `  remainderAfter=${step.remainderAfter.polynomial}${rBits2}`,
      ].join("\n")
    );
  }
}


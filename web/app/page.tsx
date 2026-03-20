"use client";

import { useMemo, useState } from "react";

type EncodedPolynomial = {
  degree: number;
  coeffs: number[];
  bitString?: string;
  polynomial?: string;
};

type DivisionStep = {
  index: number;
  remainderDegreeBefore: number;
  shift: number;
  factor: number;
  quotientTermDegree: number;
  subtrahend: EncodedPolynomial;
  remainderAfter: EncodedPolynomial;
  quotientAfter: EncodedPolynomial;
};

type DivideResult = {
  fieldP: number;
  quotient: EncodedPolynomial;
  remainder: EncodedPolynomial;
  steps?: DivisionStep[];
};

export default function Home() {
  const [p, setP] = useState<number>(2);
  const [mode, setMode] = useState<"auto" | "bitstring" | "polynomial">("auto");
  const [showSteps, setShowSteps] = useState<boolean>(false);

  const [dividend, setDividend] = useState<string>("100111");
  const [divisor, setDivisor] = useState<string>("1011");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DivideResult | null>(null);

  const hint = useMemo(() => {
    return "Bitstrings are digits-only and only supported for p<=10 (single-digit coefficients). Polynomial form uses '+' separated terms (no '-').";
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/divide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ p, mode, dividend, divisor, showSteps }),
      });

      const data = (await res.json()) as {
        result?: DivideResult;
        error?: { message?: string };
      };

      if (!res.ok || !data.result) {
        setResult(null);
        setError(data.error?.message ?? "Request failed.");
        return;
      }

      setResult(data.result);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function applyExampleBitstrings() {
    setP(2);
    setMode("auto");
    setDividend("100111");
    setDivisor("1011");
  }

  function applyExamplePolynomials() {
    setP(2);
    setMode("polynomial");
    setDividend("1+x+x^2+x^5");
    setDivisor("1+x+x^2");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">polyLD</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
            Polynomial long division over <span className="font-mono">GF(p)</span>. This page uses the same inputs as your CLI:
            <span className="font-mono"> --p</span>, <span className="font-mono"> --dividend</span>, <span className="font-mono"> --divisor</span>, and{" "}
            <span className="font-mono"> --showSteps</span>.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium" htmlFor="p">
                    Field p
                  </label>
                  <input
                    id="p"
                    className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600 dark:focus:ring-zinc-900"
                    type="number"
                    min={2}
                    step={1}
                    value={p}
                    onChange={(e) => setP(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium" htmlFor="mode">
                    Input mode
                  </label>
                  <select
                    id="mode"
                    className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600 dark:focus:ring-zinc-900"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "auto" | "bitstring" | "polynomial")}
                  >
                    <option value="auto">auto</option>
                    <option value="bitstring">bitstring</option>
                    <option value="polynomial">polynomial</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="dividend">
                  Dividend
                </label>
                <textarea
                  id="dividend"
                  className="min-h-[48px] w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600 dark:focus:ring-zinc-900"
                  value={dividend}
                  onChange={(e) => setDividend(e.target.value)}
                  placeholder="e.g. 100111 or 1+x+x^2+x^5"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="divisor">
                  Divisor
                </label>
                <textarea
                  id="divisor"
                  className="min-h-[48px] w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600 dark:focus:ring-zinc-900"
                  value={divisor}
                  onChange={(e) => setDivisor(e.target.value)}
                  placeholder="e.g. 1011 or 1+x+x^2"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="showSteps"
                  type="checkbox"
                  checked={showSteps}
                  onChange={(e) => setShowSteps(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 accent-zinc-900 dark:border-zinc-700 dark:accent-zinc-50"
                />
                <label htmlFor="showSteps" className="text-sm font-medium">
                  Show long-division steps
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {loading ? "Dividing..." : "Divide"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Clear
                </button>
              </div>

              {error ? (
                <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
              ) : (
                <div className="text-xs text-zinc-500">{hint}</div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={applyExampleBitstrings}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Example (bitstrings)
                </button>
                <button
                  type="button"
                  onClick={applyExamplePolynomials}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Example (polynomials)
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Result</h2>
              {result ? (
                <div className="text-xs text-zinc-500">
                  Field <span className="font-mono">{result.fieldP}</span>
                </div>
              ) : (
                <div className="text-xs text-zinc-500">Run a division to see output</div>
              )}
            </div>

            {loading && (
              <div className="mt-6 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
                Working...
              </div>
            )}

            {!loading && result && (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/50">
                    <div className="text-xs font-medium text-zinc-500">Quotient</div>
                    <div className="mt-2 break-all font-mono text-sm">
                      {result.quotient.polynomial ??
                        (result.quotient.bitString ? `(${result.quotient.bitString})` : "0")}
                    </div>
                    {result.quotient.bitString && (
                      <div className="mt-2 text-xs text-zinc-500">bits: {result.quotient.bitString}</div>
                    )}
                  </div>

                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/50">
                    <div className="text-xs font-medium text-zinc-500">Remainder</div>
                    <div className="mt-2 break-all font-mono text-sm">
                      {result.remainder.polynomial ??
                        (result.remainder.bitString ? `(${result.remainder.bitString})` : "0")}
                    </div>
                    {result.remainder.bitString && (
                      <div className="mt-2 text-xs text-zinc-500">bits: {result.remainder.bitString}</div>
                    )}
                  </div>
                </div>

                {showSteps && result.steps && result.steps.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-sm font-semibold">Steps</h3>
                      <div className="text-xs text-zinc-500">{result.steps.length} steps</div>
                    </div>

                    <ol className="mt-3 max-h-[420px] overflow-auto space-y-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/50">
                      {result.steps.map((step) => (
                        <li
                          key={step.index}
                          className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs font-medium">Step {step.index}</div>
                            <div className="text-[11px] text-zinc-500">
                              shift={step.shift}, factor={step.factor}
                            </div>
                          </div>

                          <div className="mt-2 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                            <div>
                              <span className="text-zinc-500">Subtrahend:</span>{" "}
                              <span className="font-mono">{step.subtrahend.polynomial ?? "0"}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Quotient after:</span>{" "}
                              <span className="font-mono">{step.quotientAfter.polynomial ?? "0"}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Remainder after:</span>{" "}
                              <span className="font-mono">{step.remainderAfter.polynomial ?? "0"}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {showSteps && result.steps && result.steps.length === 0 && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-300">No steps recorded.</div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

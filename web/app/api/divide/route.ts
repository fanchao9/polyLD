import { dividePolynomialsGFp } from "../../../../dist/polynomialLongDivision";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const p = Number(body.p ?? 2);
    const dividend = String(body.dividend ?? "").trim();
    const divisor = String(body.divisor ?? "").trim();
    const mode = body.mode; // auto|bitstring|polynomial
    const showSteps = Boolean(body.showSteps);

    if (!Number.isInteger(p) || p < 2) {
      return NextResponse.json({ error: { message: "p must be integer >= 2" } }, { status: 400 });
    }
    if (!dividend || !divisor) {
      return NextResponse.json({ error: { message: "dividend and divisor are required" } }, { status: 400 });
    }

    const result = dividePolynomialsGFp(dividend, divisor, {
      fieldP: p,
      showSteps,
      representationMode: mode,
    });

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string } | undefined;
    return NextResponse.json(
      {
        error: {
          code: e?.code,
          message: e?.message ?? "Unknown error",
        },
      },
      { status: 400 }
    );
  }
}
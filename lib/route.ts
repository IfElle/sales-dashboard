import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { rows } = await req.json();
  // Simulate ARIMA
  const forecasted = rows.map((r: any, i: number) => ({
    ...r,
    Forecast: parseFloat(r['Revenue']) * (1 + 0.05 * (i % 6)),
  }));
  return NextResponse.json(forecasted);
}
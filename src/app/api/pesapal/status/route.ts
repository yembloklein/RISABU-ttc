import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SANDBOX_BASE = 'https://cybqa.pesapal.com/pesapalv3';
const LIVE_BASE = 'https://pay.pesapal.com/v3';

function getBaseUrl(): string {
  return process.env.PESAPAL_ENV === 'live' ? LIVE_BASE : SANDBOX_BASE;
}

async function getPesapalToken(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(data.message || 'Pesapal auth failed');
  return data.token;
}

/**
 * GET /api/pesapal/status?orderTrackingId=xxx
 * Verifies a Pesapal transaction and returns its status.
 * payment_status_description === "Completed" means payment succeeded.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderTrackingId = searchParams.get('orderTrackingId');

    if (!orderTrackingId) {
      return NextResponse.json({ error: 'orderTrackingId is required' }, { status: 400 });
    }

    const baseUrl = getBaseUrl();
    const token = await getPesapalToken(baseUrl);

    const res = await fetch(
      `${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Status check failed' }, { status: res.status });
    }

    return NextResponse.json({
      orderTrackingId: data.order_tracking_id,
      merchantReference: data.merchant_reference,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.payment_method,
      status: data.payment_status_description, // "Completed", "Failed", "Reversed", "Invalid"
      statusCode: data.status_code,
      confirmationCode: data.confirmation_code,
      raw: data,
    });
  } catch (error: any) {
    console.error('[Pesapal] status check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

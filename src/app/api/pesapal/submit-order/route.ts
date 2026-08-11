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

// Module-level IPN ID cache (avoids re-registering on every request)
let cachedIpnId: string | null = null;

async function getIpnId(baseUrl: string, token: string): Promise<string> {
  if (process.env.PESAPAL_IPN_ID) return process.env.PESAPAL_IPN_ID;
  if (cachedIpnId) return cachedIpnId;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is required for IPN registration');

  const res = await fetch(`${baseUrl}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: `${appUrl}/api/pesapal/ipn`,
      ipn_notification_type: 'POST',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ipn_id) throw new Error(data.message || 'IPN registration failed');

  cachedIpnId = data.ipn_id;
  // Log once — copy this value to PESAPAL_IPN_ID in .env to avoid re-registering on cold starts
  console.log(`[Pesapal] IPN registered — add to .env: PESAPAL_IPN_ID=${data.ipn_id}`);
  return cachedIpnId!;
}

export async function POST(request: NextRequest) {
  try {
    const { PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET, NEXT_PUBLIC_APP_URL } = process.env;

    if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
      return NextResponse.json({ error: 'Pesapal credentials not configured' }, { status: 500 });
    }
    if (!NEXT_PUBLIC_APP_URL) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not set in .env' }, { status: 500 });
    }

    const body = await request.json();
    const { amount, studentId, email, firstName, lastName, phone } = body;

    if (!amount || !studentId || !email) {
      return NextResponse.json({ error: 'amount, studentId and email are required' }, { status: 400 });
    }

    const baseUrl = getBaseUrl();
    const token = await getPesapalToken(baseUrl);
    const ipnId = await getIpnId(baseUrl, token);
    const orderId = `RISABU-${studentId}-${Date.now()}`;

    const orderRes = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: orderId,
        currency: 'KES',
        amount: Number(amount),
        description: `Tuition fee payment — ${studentId}`,
        callback_url: `${NEXT_PUBLIC_APP_URL}/portal/finance/pesapal-callback`,
        notification_id: ipnId,
        billing_address: {
          email_address: email,
          phone_number: phone || '',
          country_code: 'KE',
          first_name: firstName || 'Student',
          last_name: lastName || '',
        },
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.redirect_url) {
      console.error('[Pesapal] Order error:', orderData);
      return NextResponse.json({ error: orderData.message || 'Failed to create Pesapal order' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      redirectUrl: orderData.redirect_url,
      orderTrackingId: orderData.order_tracking_id,
      orderId,
    });
  } catch (error: any) {
    console.error('[Pesapal] submit-order error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

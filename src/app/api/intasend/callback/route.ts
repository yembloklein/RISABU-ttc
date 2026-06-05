import { NextResponse } from 'next/server';

/**
 * IntaSend Payment Callback / Webhook
 * IntaSend posts payment status updates here.
 * Configure this URL in your IntaSend dashboard under Webhooks.
 * URL: https://yourdomain.com/api/intasend/callback
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('IntaSend webhook payload:', JSON.stringify(body, null, 2));

    const { invoice_id, state, api_ref, amount, currency } = body;

    if (state === 'COMPLETE') {
      // Payment confirmed — you can update Firestore here server-side
      // or let the client handle it via optimistic update after polling.
      console.log(`Payment COMPLETE: invoice=${invoice_id}, ref=${api_ref}, amount=${amount} ${currency}`);
    } else if (state === 'FAILED') {
      console.log(`Payment FAILED: invoice=${invoice_id}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true, invoice_id, state });
  } catch (error) {
    console.error('IntaSend callback error:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

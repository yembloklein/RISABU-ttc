import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pesapal/ipn
 * Pesapal calls this URL server-to-server after every payment event.
 * We acknowledge it here; the callback page handles Firestore writes.
 *
 * Pesapal expects a specific JSON response — do not change the shape.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { OrderTrackingId, OrderNotificationType, OrderMerchantReference } = body;

    console.log('[Pesapal IPN]', JSON.stringify(body));

    // Required acknowledgement format per Pesapal docs
    return NextResponse.json({
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: '200',
    });
  } catch (error) {
    console.error('[Pesapal IPN] Error:', error);
    return NextResponse.json({ status: '500' }, { status: 500 });
  }
}

// Pesapal may also send a GET ping to verify the URL exists
export async function GET() {
  return NextResponse.json({ status: 'IPN endpoint active' });
}

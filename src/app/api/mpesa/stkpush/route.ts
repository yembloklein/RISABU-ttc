import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, amount, studentId } = body;

    if (!phoneNumber || !amount || !studentId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // TODO: In production, generate OAuth token and call Safaricom Daraja STK Push API
    // const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    // ...

    // SIMULATION: Wait 1.5 seconds to simulate network request to Safaricom
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulated Daraja STK Push response
    return NextResponse.json({
      MerchantRequestID: `REQ-${Date.now()}`,
      CheckoutRequestID: `CHK-${Math.random().toString(36).substring(7).toUpperCase()}`,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      CustomerMessage: 'Success. Request accepted for processing'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

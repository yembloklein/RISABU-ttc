import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, amount, studentId, email, currency = 'KES' } = body;

    if (!phoneNumber || !amount || !studentId) {
      return NextResponse.json(
        { error: 'Missing required parameters: phoneNumber, amount, studentId' },
        { status: 400 }
      );
    }

    const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
    const secretKey = process.env.INTASEND_SECRET_KEY;

    if (!publishableKey || !secretKey) {
      return NextResponse.json(
        { error: 'IntaSend API keys not configured' },
        { status: 500 }
      );
    }

    const isTest = publishableKey.startsWith('ISPubKey_test_');
    const baseUrl = isTest
      ? 'https://sandbox.intasend.com'
      : 'https://payment.intasend.com';

    // Format phone number: ensure it starts with 254
    const formattedPhone = phoneNumber
      .replace(/\D/g, '')
      .replace(/^0/, '254')
      .replace(/^(\+?254)/, '254');

    const payload = {
      public_key: publishableKey,
      currency,
      amount: Number(amount),
      phone_number: formattedPhone,
      email: email || 'student@risabu.ac.ke',
      comment: `Fee payment - Student ${studentId}`,
      api_ref: `RISABU-${studentId}-${Date.now()}`,
    };

    const response = await fetch(`${baseUrl}/api/v1/payment/mpesa-stk-push/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('IntaSend STK Push error:', data);
      return NextResponse.json(
        { error: data?.detail || data?.errors || 'STK Push failed' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      invoiceId: data.invoice?.invoice_id,
      state: data.invoice?.state,
      customerComment: 'Check your phone and enter your M-Pesa PIN to complete payment.',
      raw: data,
    });
  } catch (error) {
    console.error('IntaSend STK Push exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

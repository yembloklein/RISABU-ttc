import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields (to, subject, html)' }, { status: 400 });
    }

    // Configure your SMTP credentials in .env
    // For Gmail, use an App Password, not your real password
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"${process.env.NEXT_PUBLIC_APP_NAME || 'Risabu Technical Training College'}" <${process.env.SMTP_USER}>`, 
      to, 
      subject,
      html, 
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Email sending error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

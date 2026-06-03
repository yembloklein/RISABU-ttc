export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Triggers the local /api/email route to send an email using Nodemailer.
 * Ensure SMTP credentials are set in .env
 */
export const triggerEmail = async (payload: EmailPayload) => {
  try {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    return await res.json();
  } catch (error) {
    console.error('Email trigger failed:', error);
    // We do not throw to prevent breaking the main app flow if emails fail
    return { success: false, error };
  }
};

export const getAdmissionEmail = (studentName: string) => ({
  subject: "Welcome to Risabu Technical Training College - Admission Offered",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #059669; margin-bottom: 16px;">Congratulations, ${studentName}!</h2>
      <p style="color: #334155; line-height: 1.6;">We are thrilled to inform you that you have been offered admission to Risabu Technical Training College.</p>
      <p style="color: #334155; line-height: 1.6;">Please log in to your student portal to view your official admission letter and complete the enrollment process.</p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
        <p>Best regards,<br/>The Admissions Team<br/>Risabu Technical Training College</p>
      </div>
    </div>
  `
});

export const getEnrollmentEmail = (studentName: string, admissionNo: string) => ({
  subject: "Enrollment Confirmed - Welcome to Risabu Technical Training College",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #059669; margin-bottom: 16px;">Welcome Aboard, ${studentName}!</h2>
      <p style="color: #334155; line-height: 1.6;">Your enrollment has been finalized successfully.</p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; color: #334155;">Your official Admission Number is: <strong style="color: #0f172a; font-size: 18px;">${admissionNo}</strong></p>
      </div>
      <p style="color: #334155; line-height: 1.6;">You can use this Admission Number to log in to the student portal. If this is your first time logging in, your password is also your Admission Number.</p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
        <p>Best regards,<br/>Risabu Technical Training College Administration</p>
      </div>
    </div>
  `
});

export const getExamScheduledEmail = (studentName: string, examName: string, date: string) => ({
  subject: "New Exam Scheduled - Risabu Technical Training College",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-bottom: 16px;">Exam Notification</h2>
      <p style="color: #334155; line-height: 1.6;">Hello ${studentName},</p>
      <p style="color: #334155; line-height: 1.6;">A new exam has been scheduled for your program:</p>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <ul style="margin: 0; padding-left: 20px; color: #166534;">
          <li style="margin-bottom: 8px;"><strong>Exam:</strong> ${examName}</li>
          <li><strong>Date:</strong> ${date}</li>
        </ul>
      </div>
      <p style="color: #334155; line-height: 1.6;">Please log in to your portal to download your Exam Pass if all your fees are cleared.</p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
        <p>Best regards,<br/>Academic Department<br/>Risabu Technical Training College</p>
      </div>
    </div>
  `
});

export const getFeeReminderEmail = (studentName: string, balance: number) => ({
  subject: "Fee Balance Reminder - Risabu Technical Training College",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #e11d48; margin-bottom: 16px;">Fee Reminder</h2>
      <p style="color: #334155; line-height: 1.6;">Hello ${studentName},</p>
      <p style="color: #334155; line-height: 1.6;">This is a gentle reminder regarding your outstanding fee balance for the current semester.</p>
      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 16px; border-radius: 6px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #9f1239; font-size: 16px;">Current Balance</p>
        <p style="margin: 8px 0 0 0; color: #e11d48; font-size: 24px; font-weight: bold;">KES ${balance.toLocaleString()}</p>
      </div>
      <p style="color: #334155; line-height: 1.6;">Please ensure your fees are cleared promptly to avoid any interruptions to your studies and exam access.</p>
      <p style="color: #334155; line-height: 1.6;">You can make payments via M-Pesa or Bank Transfer and upload your receipt on the student portal.</p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
        <p>Best regards,<br/>Finance Department<br/>Risabu Technical Training College</p>
      </div>
    </div>
  `
});

import * as admin from "firebase-admin";
import {onDocumentCreated} from "firebase-functions/v2/firestore";

admin.initializeApp();

/**
 * Sends an email notification to the student if the document is 'Official'.
 */
export const onOfficialDocumentUploaded = onDocumentCreated(
  "student_documents/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data || !data.isOfficial) return;

    const studentId = data.studentId;
    const categoryLabel = data.categoryLabel || "Official Document";

    try {
      const studentDoc = await admin.firestore()
        .collection("students").doc(studentId).get();
      const studentData = studentDoc.data();

      if (!studentData || !studentData.contactEmail) {
        console.log(`No email found for student ${studentId}`);
        return;
      }

      const studentEmail = studentData.contactEmail;
      const studentName = `${studentData.firstName} ${studentData.lastName}`;

      await admin.firestore().collection("mail").add({
        to: studentEmail,
        message: {
          subject: `New Official Record: ${categoryLabel}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #059669;">Hello ${studentName},</h2>
              <p>An official <b>${categoryLabel}</b> has been uploaded.</p>
              <p>Access it now from your Document Center.</p>
              <br />
              <p style="font-size: 12px; color: #666;">
                Risabu Technical Training College
              </p>
            </div>
          `,
        },
      });
    } catch (error) {
      console.error("Error processing document notification:", error);
    }
  }
);

/**
 * Automatically "issues" a receipt record for the student.
 */
export const onPaymentRecorded = onDocumentCreated(
  "payments/{paymentId}",
  async (event) => {
    const payment = event.data?.data();
    if (!payment) return;

    const studentId = payment.studentId;
    const amount = payment.amount;
    const ref = payment.transactionReference || event.params.paymentId;

    try {
      await admin.firestore().collection("student_documents").add({
        studentId: studentId,
        category: "payment_receipt",
        categoryLabel: "Official Payment Receipt",
        fileName: `Receipt_${ref}.pdf`,
        paymentId: event.params.paymentId,
        isOfficial: true,
        isDynamic: true,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const studentDoc = await admin.firestore()
        .collection("students").doc(studentId).get();
      const studentData = studentDoc.data();

      if (studentData?.contactEmail) {
        const formattedAmount = Number(amount).toLocaleString();
        await admin.firestore().collection("mail").add({
          to: studentData.contactEmail,
          message: {
            subject: `Payment Received - KES ${formattedAmount}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #059669;">Payment Confirmed</h2>
                <p>Hello ${studentData.firstName},</p>
                <p>Payment of <b>KES ${formattedAmount}</b> received.</p>
                <p><b>Ref:</b> ${ref}</p>
                <p>Your digital receipt is now in your student portal.</p>
                <br />
                <p style="font-size: 12px; color: #666;">Risabu TTC Finance</p>
              </div>
            `,
          },
        });
      }
    } catch (error) {
      console.error("Error issuing digital receipt:", error);
    }
  }
);

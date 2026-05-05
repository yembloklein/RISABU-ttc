'use server';
/**
 * @fileOverview A Genkit flow for generating professional student fee reminders.
 *
 * - generateFeeReminder - A function that handles the reminder generation process.
 * - FeeReminderInput - The input type for the generateFeeReminder function.
 * - FeeReminderOutput - The return type for the generateFeeReminder function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FeeReminderInputSchema = z.object({
  studentName: z.string().describe('The full name of the student.'),
  admissionNumber: z.string().describe('The student\'s admission number.'),
  outstandingAmount: z.number().describe('The total outstanding balance.'),
  dueDate: z.string().describe('The date the payment was or is due.'),
  courseName: z.string().describe('The course the student is enrolled in.'),
  collegeName: z.string().default('Risabu Technical Training College'),
});

export type FeeReminderInput = z.infer<typeof FeeReminderInputSchema>;

const FeeReminderOutputSchema = z.object({
  subject: z.string().describe('A professional subject line for the reminder email.'),
  message: z.string().describe('The body of the reminder message, tailored to the student\'s situation.'),
  tone: z.enum(['Friendly', 'Firm', 'Urgent']).describe('The tone of the generated message.'),
});

export type FeeReminderOutput = z.infer<typeof FeeReminderOutputSchema>;

export async function generateFeeReminder(input: FeeReminderInput): Promise<FeeReminderOutput> {
  return generateFeeReminderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFeeReminderPrompt',
  input: { schema: FeeReminderInputSchema },
  output: { schema: FeeReminderOutputSchema },
  prompt: `You are the Finance Department of {{collegeName}}. Your task is to generate a professional fee reminder for a student.

Student Name: {{{studentName}}}
Admission Number: {{{admissionNumber}}}
Course: {{{courseName}}}
Outstanding Balance: KES {{outstandingAmount}}
Due Date: {{dueDate}}

The message should:
1. Be professional and respectful.
2. Clearly state the outstanding amount and what it is for.
3. Remind them of the due date.
4. Provide a brief call to action (e.g., visiting the finance office or using M-Pesa).
5. Adjust the tone based on the context (e.g., if the due date has passed, be slightly more firm but still professional).

Return a JSON object with 'subject', 'message', and 'tone'.`,
});

const generateFeeReminderFlow = ai.defineFlow(
  {
    name: 'generateFeeReminderFlow',
    inputSchema: FeeReminderInputSchema,
    outputSchema: FeeReminderOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate fee reminder.');
    }
    return output;
  }
);

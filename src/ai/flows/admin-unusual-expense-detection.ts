'use server';
/**
 * @fileOverview An AI agent for detecting unusual expenses based on historical data.
 *
 * - adminUnusualExpenseDetection - A function that handles the unusual expense detection process.
 * - AdminUnusualExpenseDetectionInput - The input type for the adminUnusualExpenseDetection function.
 * - AdminUnusualExpenseDetectionOutput - The return type for the adminUnusualExpenseDetection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema for the unusual expense detection
const AdminUnusualExpenseDetectionInputSchema = z.object({
  historicalExpenses: z
    .array(
      z.object({
        category: z.string().describe('The category of the expense (e.g., "Office Supplies", "Travel", "Utilities").'),
        amount: z.number().describe('The monetary amount of the expense.'),
        date: z.string().describe('The date of the expense in YYYY-MM-DD format.'),
        description: z.string().optional().describe('An optional description of the expense.'),
      })
    )
    .describe('An array of historical expense records to establish spending patterns.'),
  newExpense: z
    .object({
      category: z.string().describe('The category of the new expense.'),
      amount: z.number().describe('The monetary amount of the new expense.'),
      date: z.string().describe('The date of the new expense in YYYY-MM-DD format.'),
      description: z.string().optional().describe('An optional description of the new expense.'),
    })
    .describe('The new expense to be evaluated for being unusual.'),
});
export type AdminUnusualExpenseDetectionInput = z.infer<typeof AdminUnusualExpenseDetectionInputSchema>;

// Output Schema for the unusual expense detection
const AdminUnusualExpenseDetectionOutputSchema = z.object({
  isUnusual: z.boolean().describe('True if the new expense is considered unusual or an outlier; false otherwise.'),
  reason:
    z.string()
      .describe('A detailed explanation of why the expense is considered unusual or typical, referencing historical patterns or specific criteria.'),
});
export type AdminUnusualExpenseDetectionOutput = z.infer<typeof AdminUnusualExpenseDetectionOutputSchema>;

export async function adminUnusualExpenseDetection(
  input: AdminUnusualExpenseDetectionInput
): Promise<AdminUnusualExpenseDetectionOutput> {
  return unusualExpenseDetectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'unusualExpenseDetectionPrompt',
  input: {schema: AdminUnusualExpenseDetectionInputSchema},
  output: {schema: AdminUnusualExpenseDetectionOutputSchema},
  prompt: `You are a highly analytical financial expert specializing in identifying anomalies and outliers in expense data.
Your goal is to review a given new expense against a history of past expenses and determine if the new expense is unusual.
Provide a clear "isUnusual" boolean flag and a "reason" explaining your decision.

Consider the following criteria for identifying an unusual expense:
1.  **Amount Outlier**: Is the 'newExpense' amount significantly higher or lower than the typical amounts for its 'category' in the 'historicalExpenses'?
2.  **Category Discrepancy**: Is the 'newExpense' category new or very rare in the 'historicalExpenses', especially if the amount is substantial?
3.  **Contextual Anomaly**: Does the combination of 'category' and 'amount' for the 'newExpense' stand out in the overall context of 'historicalExpenses', even if not a strict outlier in its category? For example, a large expense in a category that usually has only small, frequent expenses.

Historical Expenses:
{{{historicalExpenses}}}

New Expense to Evaluate:
{{{newExpense}}}

Based on the above, please provide your assessment in a JSON object with the following structure:
{{jsonSchema AdminUnusualExpenseDetectionOutputSchema}}`,
});

const unusualExpenseDetectionFlow = ai.defineFlow(
  {
    name: 'unusualExpenseDetectionFlow',
    inputSchema: AdminUnusualExpenseDetectionInputSchema,
    outputSchema: AdminUnusualExpenseDetectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to get output from the unusual expense detection prompt.');
    }
    return output;
  }
);

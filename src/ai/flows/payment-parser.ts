'use server';
/**
 * @fileOverview A Genkit flow for parsing raw transaction text (M-Pesa SMS, Bank lines).
 *
 * - parseTransaction - A function that handles the transaction parsing process.
 * - ParseTransactionInput - The input type for the parseTransaction function.
 * - ParseTransactionOutput - The return type for the parseTransaction function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ParseTransactionInputSchema = z.object({
  rawText: z.string().describe('The raw transaction notification text (e.g., M-Pesa SMS or Bank statement line).'),
});

export type ParseTransactionInput = z.infer<typeof ParseTransactionInputSchema>;

const ParseTransactionOutputSchema = z.object({
  reference: z.string().describe('The unique transaction reference or receipt number.'),
  amount: z.number().describe('The monetary amount received.'),
  payerName: z.string().describe('The full name of the person who made the payment.'),
  paymentDate: z.string().describe('The date of the transaction in YYYY-MM-DD format.'),
  provider: z.enum(['M-Pesa', 'Bank', 'Unknown']).describe('The identified payment provider.'),
  confidence: z.number().min(0).max(1).describe('The confidence level of the extraction.'),
});

export type ParseTransactionOutput = z.infer<typeof ParseTransactionOutputSchema>;

export async function parseTransaction(input: ParseTransactionInput): Promise<ParseTransactionOutput> {
  return parseTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseTransactionPrompt',
  input: { schema: ParseTransactionInputSchema },
  output: { schema: ParseTransactionOutputSchema },
  prompt: `You are a financial data extractor for Risabu Technical Training College. 
Your task is to parse raw payment notification text and extract structured information.

Common formats include:
- M-Pesa: "OEB4S8W... Confirmed. KES 5,000.00 received from JOHN DOE 0712345678 on 15/10/24 at 2:30 PM."
- Bank: "Credit: KES 10,000. Ref: TRN-998. From: JANE SMITH. Date: 2024-10-16"

Extract the following:
1. Reference (The receipt number or transaction ID)
2. Amount (Numeric value)
3. Payer Name (Cleaned full name)
4. Date (Converted to YYYY-MM-DD)
5. Provider (Identify if it is M-Pesa or a Bank)

Raw Text:
"""
{{{rawText}}}
"""

Return the data in a structured JSON format.`,
});

const parseTransactionFlow = ai.defineFlow(
  {
    name: 'parseTransactionFlow',
    inputSchema: ParseTransactionInputSchema,
    outputSchema: ParseTransactionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to parse transaction data.');
    }
    return output;
  }
);

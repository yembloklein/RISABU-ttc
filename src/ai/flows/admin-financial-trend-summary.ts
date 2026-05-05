'use server';
/**
 * @fileOverview A Genkit flow for generating an AI-powered summary of financial spending trends.
 *
 * - adminFinancialTrendSummary - A function that handles the financial trend summary generation process.
 * - AdminFinancialTrendSummaryInput - The input type for the adminFinancialTrendSummary function.
 * - AdminFinancialTrendSummaryOutput - The return type for the adminFinancialTrendSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExpenseItemSchema = z.object({
  category: z.string().describe('The category of the expense (e.g., Salaries, Utilities, Supplies).'),
  amount: z.number().positive().describe('The amount of the expense in the specified currency.'),
});

const PeriodDataSchema = z.object({
  periodDescription: z.string().describe('A descriptive name for the period (e.g., "July 1 to Sept 30, 2023", "Q3 2023").'),
  expenses: z.array(ExpenseItemSchema).describe('An array of aggregated expenses for this period, grouped by category.'),
});

const AdminFinancialTrendSummaryInputSchema = z.object({
  currentPeriodData: PeriodDataSchema.describe('Financial data for the current selected period.'),
  previousPeriodData: PeriodDataSchema.describe('Financial data for a comparable previous period.'),
  currency: z.string().describe('The currency used for all financial amounts (e.g., "USD", "KES").'),
});

export type AdminFinancialTrendSummaryInput = z.infer<typeof AdminFinancialTrendSummaryInputSchema>;

const TopCategoryTrendSchema = z.object({
  category: z.string().describe('The name of the expenditure category.'),
  currentAmount: z.number().describe('The total spending in this category for the current period.'),
  previousAmount: z.number().describe('The total spending in this category for the previous period.'),
  changePercentage: z.number().describe('The percentage change in spending for this category between periods (positive for increase, negative for decrease).'),
  trendDescription: z.string().describe('A brief description of the spending trend for this category (e.g., "increased significantly", "slight decrease", "stable", "new expenditure").'),
});

const AdminFinancialTrendSummaryOutputSchema = z.object({
  summaryTitle: z.string().describe('A concise title for the financial trend summary.'),
  overallSummary: z.string().describe('A high-level summary of the overall financial spending trends, comparing the current and previous periods.'),
  majorCategoriesSummary: z.string().describe('A detailed summary focusing on the largest expenditure categories, their amounts, and how they have changed between the periods.'),
  topCategories: z.array(TopCategoryTrendSchema).describe('An array of key expenditure categories with detailed trend data.'),
  keyInsights: z.array(z.string()).describe('A list of actionable insights or notable observations derived from the financial trends.'),
});

export type AdminFinancialTrendSummaryOutput = z.infer<typeof AdminFinancialTrendSummaryOutputSchema>;

// Exported wrapper function
export async function adminFinancialTrendSummary(input: AdminFinancialTrendSummaryInput): Promise<AdminFinancialTrendSummaryOutput> {
  return adminFinancialTrendSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adminFinancialTrendSummaryPrompt',
  input: { schema: AdminFinancialTrendSummaryInputSchema },
  output: { schema: AdminFinancialTrendSummaryOutputSchema },
  prompt: `You are an expert financial analyst for Risabu Technical Training College. Your task is to analyze financial spending data for two periods and provide a comprehensive summary of key trends, identifying the largest expenditure categories and their changes.\n\nAnalyze the provided data for the current period "{{currentPeriodData.periodDescription}}" and compare it with the previous period "{{previousPeriodData.periodDescription}}". All amounts are in {{currency}}.\n\n**Current Period Data ({{currentPeriodData.periodDescription}}):**\n{{#each currentPeriodData.expenses}}\n- {{category}}: {{amount}} {{../currency}}\n{{/each}}\n\n**Previous Period Data ({{previousPeriodData.periodDescription}}):**\n{{#each previousPeriodData.expenses}}\n- {{category}}: {{amount}} {{../currency}}\n{{/each}}\n\nBased on this data, provide the following structured output:\n\n1.  **summaryTitle**: A concise and informative title for the summary.\n2.  **overallSummary**: A high-level overview of the overall spending trends, indicating whether total spending increased, decreased, or remained stable, and by how much, between the two periods.\n3.  **majorCategoriesSummary**: A detailed narrative identifying the top 3-5 expenditure categories by absolute amount in the current period. For each of these major categories, describe its spending amount and quantify the percentage change compared to the previous period. Highlight any significant increases or decreases.\n4.  **topCategories**: An array of objects, each representing a key expenditure category. For each object, include:\n    *   'category': The name of the category.\n    *   'currentAmount': Total spending in the current period.\n    *   'previousAmount': Total spending in the previous period. If a category existed in the current period but not the previous, treat 'previousAmount' as 0.\n    *   'changePercentage': The percentage change ((currentAmount - previousAmount) / previousAmount * 100). If previousAmount is 0, handle division by zero (e.g., if currentAmount > 0 and previousAmount is 0, it's a 100% increase or "new expenditure").\n    *   'trendDescription': A short phrase describing the trend (e.g., "significant increase", "slight decrease", "stable", "new expenditure"). Focus on top 5-10 categories or those with significant changes.\n5.  **keyInsights**: A list of 2-3 concise, actionable insights or notable observations. These could be recommendations for further investigation, areas of concern, or positive developments.\n\nEnsure that the output strictly adheres to the JSON schema provided. Calculate percentages accurately. If a category appears in one period but not the other, assume its amount in the missing period is 0 for change calculation.\n`,
});

const adminFinancialTrendSummaryFlow = ai.defineFlow(
  {
    name: 'adminFinancialTrendSummaryFlow',
    inputSchema: AdminFinancialTrendSummaryInputSchema,
    outputSchema: AdminFinancialTrendSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

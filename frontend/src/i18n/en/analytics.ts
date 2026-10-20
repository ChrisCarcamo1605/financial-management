import type { analytics as es } from '../es/analytics';

export const analytics: typeof es = {
  title: 'Analytics',
  description: 'How your money moves month by month.',
  period: 'Period',
  months: (count: number) => `${count} months`,
  emptyTitle: 'No transactions in this period yet',
  emptyDescription: 'Add income and expenses to see your trends.',
  cashFlow: { title: 'Money in and out', description: 'Total per month' },
  spending: {
    title: 'Spending by category',
    description: 'Total for the period',
    empty: 'No spending in this period.',
  },
  trend: {
    title: 'Trend',
    description: 'How your money in, money out and what is left change each month',
  },
  summary: {
    savingsRate: 'Savings rate',
    savingsRateHint: 'Net over money in',
  },
  insights: {
    title: 'Highlights',
    average: (amount: string) => `On average you spend ${amount} a month.`,
    peak: (month: string, amount: string) => `Your highest-spending month was ${month}, with ${amount}.`,
    top: (category: string, share: string) => `${category} is your biggest expense: ${share} of the total.`,
  },
  table: {
    title: 'Month by month',
  },
};

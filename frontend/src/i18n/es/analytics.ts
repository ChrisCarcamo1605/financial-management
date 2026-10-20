/** Página de Análisis. */
export const analytics = {
  title: 'Análisis',
  description: 'Cómo se mueve tu dinero mes a mes.',
  period: 'Periodo',
  months: (count: number) => `${count} meses`,
  emptyTitle: 'Aún no hay movimientos en este periodo',
  emptyDescription: 'Registra ingresos y gastos para ver tus tendencias.',
  cashFlow: { title: 'Entradas y salidas', description: 'Total por mes' },
  spending: {
    title: 'Gasto por categoría',
    description: 'Total del periodo',
    empty: 'No hay gastos en este periodo.',
  },
  trend: {
    title: 'Tendencia',
    description: 'Cómo evolucionan tus entradas, salidas y lo que te queda cada mes',
  },
  summary: {
    savingsRate: 'Tasa de ahorro',
    savingsRateHint: 'Neto sobre entradas',
  },
  insights: {
    title: 'Lo más relevante',
    average: (amount: string) => `En promedio gastas ${amount} al mes.`,
    peak: (month: string, amount: string) => `El mes con más gasto fue ${month}, con ${amount}.`,
    top: (category: string, share: string) => `${category} es tu mayor gasto: ${share} del total.`,
  },
  table: {
    title: 'Mes a mes',
  },
};

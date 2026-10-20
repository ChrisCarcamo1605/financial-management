import type { IncomeSource, Modality, PaySchedule } from '@/data/types';
import type { Dictionary } from '@/i18n';

export function modalityOptions(t: Dictionary): { value: Modality; label: string }[] {
  return (['planilla', 'servicios_profesionales', 'pension'] as const).map((value) => ({ value, label: t.income.modalityShort[value] }));
}

export function scheduleOptions(t: Dictionary): { value: PaySchedule; label: string }[] {
  return (['monthly', 'biweekly'] as const).map((value) => ({ value, label: t.income.schedule[value] }));
}

export function scheduleLabel(t: Dictionary, source: Pick<IncomeSource, 'pay_schedule' | 'pay_day'>) {
  if (source.pay_schedule === 'biweekly') return t.income.schedule.biweekly;
  return source.pay_day ? t.income.schedule.monthlyOnDay(source.pay_day) : t.income.schedule.monthly;
}

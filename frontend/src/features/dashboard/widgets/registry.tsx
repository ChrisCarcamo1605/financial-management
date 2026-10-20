import type { ComponentType } from 'react';
import type { WidgetSize } from '@/data/types';
import type { Dictionary } from '@/i18n';
import { QuincenaWidget } from './quincena-widget';
import { BalancesWidget, MonthWidget } from './summary-widgets';
import { BudgetsWidget, CashFlowWidget, RecentWidget, SavingsWidget, SpendingWidget } from './activity-widgets';

export type WidgetId = keyof Dictionary['dashboard']['widgets'];

export interface WidgetDefinition {
  /** También es la clave de su título en `t.dashboard.widgets`. */
  id: WidgetId;
  defaultSize: WidgetSize;
  defaultVisible: boolean;
  /** Solo puede ocupar el ancho completo. */
  fullOnly?: boolean;
  Component: ComponentType;
}

/** Widgets disponibles en el inicio, en su orden por defecto. */
export const WIDGETS: WidgetDefinition[] = [
  { id: 'quincena', defaultSize: 'full', defaultVisible: true, fullOnly: true, Component: QuincenaWidget },
  { id: 'month', defaultSize: 'half', defaultVisible: true, Component: MonthWidget },
  { id: 'balances', defaultSize: 'half', defaultVisible: true, Component: BalancesWidget },
  { id: 'cashflow', defaultSize: 'full', defaultVisible: true, Component: CashFlowWidget },
  { id: 'spending', defaultSize: 'half', defaultVisible: true, Component: SpendingWidget },
  { id: 'budgets', defaultSize: 'half', defaultVisible: true, Component: BudgetsWidget },
  { id: 'recent', defaultSize: 'half', defaultVisible: true, Component: RecentWidget },
  { id: 'savings', defaultSize: 'half', defaultVisible: true, Component: SavingsWidget },
];

export const WIDGETS_BY_ID = new Map<string, WidgetDefinition>(WIDGETS.map((w) => [w.id, w]));

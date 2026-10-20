import type { Account } from '@/data/types';
import type { Dictionary } from '@/i18n';

export const isCreditCard = (account: Pick<Account, 'type'>) => account.type === 'tarjeta_credito';

/** Opciones para selects de cuenta; las tarjetas se marcan para distinguirlas. */
export function accountOptions(accounts: Account[], t: Dictionary) {
  return accounts.map((account) => ({
    value: String(account.id),
    label: isCreditCard(account) ? `${account.name} · ${t.accounts.creditCardSuffix}` : account.name,
  }));
}

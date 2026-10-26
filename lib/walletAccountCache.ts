import { getAvailableFunds, getBankAccount } from "@/lib/api";
import { payoutTotals } from "@/lib/payoutFunds";

export type CachedBankAccount = {
  external_accounts?:
    | { data?: Array<{ bank_name?: string; last4?: string | number }> }
    | Array<{ bank_name?: string; last4?: string | number }>
    | null;
  bank_name?: string;
  last4?: string | number;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
} | null;

export type CachedPayoutFunds = { available: number; onHold: number };

let bankAccount: CachedBankAccount | undefined;
let bankRequest: Promise<CachedBankAccount> | null = null;
let payoutFunds: CachedPayoutFunds | undefined;
let payoutRequest: Promise<CachedPayoutFunds> | null = null;

export function readCachedBankAccount() {
  return bankAccount;
}

export function readCachedPayoutFunds() {
  return payoutFunds;
}

/** Drop stored bank and payout data after a link, delete, or Stripe return. */
export function clearWalletAccountCache() {
  bankAccount = undefined;
  bankRequest = null;
  payoutFunds = undefined;
  payoutRequest = null;
}

export function __resetWalletAccountCacheForTests() {
  clearWalletAccountCache();
}

export function loadCachedBankAccount(force = false) {
  if (force) {
    bankRequest = null;
    payoutFunds = undefined;
    payoutRequest = null;
  } else if (bankAccount !== undefined) {
    return Promise.resolve(bankAccount);
  } else if (bankRequest) {
    return bankRequest;
  }
  const request = Promise.resolve()
    .then(() => getBankAccount())
    .then((res) => (res.data as CachedBankAccount) || null)
    .catch(() => null as CachedBankAccount)
    .then((account) => {
      bankAccount = account;
      if (bankRequest === request) bankRequest = null;
      return account;
    });
  bankRequest = request;
  return request;
}

export function loadCachedPayoutFunds(force = false) {
  if (!force && payoutFunds) return Promise.resolve(payoutFunds);
  if (!force && payoutRequest) return payoutRequest;
  const request = Promise.resolve()
    .then(() => getAvailableFunds())
    .then((res) => payoutTotals(res.data))
    .catch(() => ({ available: 0, onHold: 0 }))
    .then((totals) => {
      payoutFunds = totals;
      if (payoutRequest === request) payoutRequest = null;
      return totals;
    });
  payoutRequest = request;
  return request;
}

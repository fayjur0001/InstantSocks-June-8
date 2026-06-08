import { apiFetch } from "@/lib/api";

export interface LastFund {
  amount: number;
  currency: string;
  walletAddress: string;
}

export interface TopupTransaction {
  id: number;
  date: string;
  wallet: string;
  walletAddress: string;
  txnId: string | null;
  amount: number;
  status: "pending" | "approved" | "rejected";
}

export interface AdminTopupTransaction {
  id: number;
  date: string;
  userId: number;
  username: string | null;
  wallet: string;
  walletAddress: string;
  txnId: string | null;
  amount: number;
  status: "pending" | "approved" | "rejected";
  method: string;
  manuallyUploaded: boolean;
}

export interface NowPaymentsResponse {
  success: boolean;
  payment: {
    pay_address: string;
    pay_amount: number;
    pay_currency: string;
    payment_id: string;
    payment_status: string;
  };
}

export interface WalletAddressResponse {
  success: boolean;
  walletAddress: string;
}

export interface ConvertResponse {
  success: boolean;
  convertedAmount: string | null;
}

export interface AddBalancePayload {
  amount: number;
  currency: string;
  walletAddress: string;
  txid?: string;
}

export const topupApi = {
  getLastFunds: (): Promise<{ success: boolean; lastFunds: LastFund[] }> =>
    apiFetch("/api/topup/last-funds"),

  getTransactions: (): Promise<{
    success: boolean;
    transactions: TopupTransaction[];
  }> => apiFetch("/api/topup/transactions"),

  generateNowPayments: (
    crypto: string,
    amount: number
  ): Promise<NowPaymentsResponse> =>
    apiFetch("/api/topup/now-payments", {
      method: "POST",
      body: JSON.stringify({ crypto, amount }),
    }),

  generateYaanPay: (
    crypto: string,
    amount: number
  ): Promise<WalletAddressResponse> =>
    apiFetch("/api/topup/yaan-pay", {
      method: "POST",
      body: JSON.stringify({ crypto, amount }),
    }),

  generateBlockonomics: (
    crypto: string,
    amount: number
  ): Promise<WalletAddressResponse> =>
    apiFetch("/api/topup/blockonomics", {
      method: "POST",
      body: JSON.stringify({ crypto, amount }),
    }),

  convert: (amount: number, currency: string): Promise<ConvertResponse> =>
    apiFetch("/api/topup/convert", {
      method: "POST",
      body: JSON.stringify({ amount, currency }),
    }),
};

export const adminTopupApi = {
  getTransactions: (): Promise<{
    success: boolean;
    transactions: AdminTopupTransaction[];
  }> => apiFetch("/api/topup/admin/transactions"),

  createTransaction: (payload: {
    userId: number;
    amount: number;
    currency: string;
    walletAddress: string;
    txid?: string;
    status?: "pending" | "approved" | "rejected";
  }): Promise<{ success: boolean; transaction: AdminTopupTransaction }> =>
    apiFetch("/api/topup/admin/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateTransaction: (
    id: number,
    payload: Partial<{
      amount: number;
      currency: string;
      walletAddress: string;
      txid: string | null;
      status: "pending" | "approved" | "rejected";
    }>
  ): Promise<{ success: boolean; transaction: AdminTopupTransaction }> =>
    apiFetch(`/api/topup/admin/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteTransaction: (
    id: number
  ): Promise<{ success: boolean; deletedId: number }> =>
    apiFetch(`/api/topup/admin/transactions/${id}`, { method: "DELETE" }),
};

export const adminUsersTopupApi = {
  addBalance: (
    userId: number,
    payload: AddBalancePayload
  ): Promise<{ success: boolean }> =>
    apiFetch(`/api/admin/users/${userId}/add-balance`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
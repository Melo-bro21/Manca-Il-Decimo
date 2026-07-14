import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface Wallet {
  id: number;
  userId: number;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
  transactions?: WalletTransaction[];
}

export interface WalletTransaction {
  id: number;
  walletId: number;
  amount: number;
  type: string;
  reason: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface WalletResponse {
  wallet: Wallet;
}

export interface WalletTopUpResponse {
  wallet: Wallet;
  transaction: WalletTransaction;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
}

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private readonly apiUrl = environment.backendUrl;

  constructor(private readonly http: HttpClient) {}

  getMyWallet(): Observable<WalletResponse> {
    return this.http.get<WalletResponse>(`${this.apiUrl}/wallet/me`);
  }

  getMyTransactions(): Observable<WalletTransactionsResponse> {
    return this.http.get<WalletTransactionsResponse>(
      `${this.apiUrl}/wallet/transactions`
    );
  }

  topUpWallet(amount: number): Observable<WalletTopUpResponse> {
    return this.http.post<WalletTopUpResponse>(
      `${this.apiUrl}/wallet/top-up`,
      {
        amount,
        reason: 'Ricarica demo wallet',
      }
    );
  }
}
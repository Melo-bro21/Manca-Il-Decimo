import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

export interface WalletSummary {
  id: number;
  balance: number;
  userId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletTransactionSummary {
  id: number;
  amount: number;
  type: string;
  reason: string | null;
  walletId: number;
  createdAt: string;
}

export type PreferredRole =
  | 'PORTIERE'
  | 'DIFENSORE'
  | 'CENTROCAMPISTA'
  | 'ATTACCANTE';

export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  reliabilityScore: number;
  preferredRole: PreferredRole | null;
  isPremium: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface UpdateMePayload {
  name: string;
  email: string;
  phone: string;
  preferredRole?: PreferredRole;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly baseUrl = `${environment.backendUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  getMe() {
    return this.http.get<BackendResponse<{ user: UserProfile }>>(
      `${this.baseUrl}/me`
    );
  }

  updateMe(payload: UpdateMePayload) {
    return this.http.patch<BackendResponse<{ user: UserProfile }>>(
      `${this.baseUrl}/me`,
      payload
    );
  }

  changePassword(payload: ChangePasswordPayload) {
    return this.http.patch<BackendResponse<null>>(
      `${this.baseUrl}/me/password`,
      payload
    );
  }

  activatePremium() {
  return this.http.post<
    BackendResponse<{
      user: UserProfile;
      wallet: WalletSummary | null;
      transaction: WalletTransactionSummary | null;
      alreadyPremium: boolean;
    }>
  >(`${this.baseUrl}/me/premium/activate`, {});
}

}
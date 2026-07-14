import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Match } from './matches.service';

export type WaitlistPaymentMethod = 'WALLET' | 'ON_SITE';
export type WaitlistStatus = 'WAITING' | 'RESERVED' | 'CONFIRMED' | 'EXPIRED';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ConfirmWaitlistPresenceRequest {
  paymentMethod: WaitlistPaymentMethod;
}

export interface WaitlistUser {
  id: number;
  name: string | null;
  email: string;
  reliabilityScore: number;
}

export interface WaitlistMatch {
  id: number;
  title: string;
  startsAt: string;
  status: string;
  depositAmount?: number;
  pricePerPlayer?: number;
  maxPlayers?: number;
  currentPlayers?: number;
  field?: {
    id: number;
    name: string;
    sportType?: string;
    size?: string;
    sportsCenter?: {
      id: number;
      name: string;
      city: string;
      address?: string;
    };
  };
}

export interface WaitlistEntry {
  id: number;
  userId: number;
  matchId: number;
  status: WaitlistStatus;
  position: number;
  reservedExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: WaitlistUser;
  match?: WaitlistMatch | Match;
}

export interface ConfirmedBooking {
  id: number;
  status: string;
  paymentMethod: WaitlistPaymentMethod | 'NOT_SELECTED';
  paymentStatus: string;
  userId: number;
  matchId: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeclineWaitlistReservationResult {
  waitlistEntry: WaitlistEntry;
  nextReservedEntry?: WaitlistEntry | null;
}

@Injectable({
  providedIn: 'root',
})
export class WaitlistService {
  private readonly apiUrl = environment.backendUrl;

  constructor(private readonly http: HttpClient) {}

  joinWaitlist(matchId: number): Observable<ApiResponse<WaitlistEntry>> {
    return this.http.post<ApiResponse<WaitlistEntry>>(
      `${this.apiUrl}/matches/${matchId}/waitlist`,
      {}
    );
  }

  getMatchWaitlist(matchId: number): Observable<ApiResponse<WaitlistEntry[]>> {
    return this.http.get<ApiResponse<WaitlistEntry[]>>(
      `${this.apiUrl}/matches/${matchId}/waitlist`
    );
  }

  getMyWaitlist(): Observable<ApiResponse<WaitlistEntry[]>> {
    return this.http.get<ApiResponse<WaitlistEntry[]>>(
      `${this.apiUrl}/users/me/waitlist`
    );
  }

  confirmPresence(
    waitlistEntryId: number,
    paymentMethod: WaitlistPaymentMethod = 'ON_SITE'
  ): Observable<ApiResponse<ConfirmedBooking>> {
    const body: ConfirmWaitlistPresenceRequest = {
      paymentMethod,
    };

    return this.http.patch<ApiResponse<ConfirmedBooking>>(
      `${this.apiUrl}/waitlist/${waitlistEntryId}/confirm`,
      body
    );
  }

  declineReservedSpot(
    waitlistEntryId: number
  ): Observable<ApiResponse<DeclineWaitlistReservationResult>> {
    return this.http.patch<ApiResponse<DeclineWaitlistReservationResult>>(
      `${this.apiUrl}/waitlist/${waitlistEntryId}/decline`,
      {}
    );
  }
}
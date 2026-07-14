import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Match } from './matches.service';

export type BookingPaymentMethod = 'NOT_SELECTED' | 'WALLET' | 'ON_SITE';
export type BookingPaymentStatus = 'PENDING' | 'PAID';
export type BookingDepositStatus = 'HELD' | 'REFUNDED' | 'KEPT';

export type BookingAttendanceStatus =
  | 'NOT_CONFIRMED'
  | 'PRESENT'
  | 'NO_SHOW'
  | 'LATE_CANCELLED';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface BookingUser {
  id: number;
  name: string | null;
  email: string;
  reliabilityScore: number;
  preferredRole?: string | null;
}

export interface Booking {
  id: number;
  userId: number;
  matchId: number;
  status: string;
  paymentMethod: BookingPaymentMethod;
  paymentStatus: BookingPaymentStatus;
  depositStatus?: BookingDepositStatus;
  attendanceStatus?: BookingAttendanceStatus;
  createdAt?: string;
  updatedAt?: string;
  user?: BookingUser;
  match?: Match;
}

export interface LeaveBookingResult {
  booking: Booking;
  reservedEntry?: unknown;
}

export interface LateCancellationRequestResult {
  booking: Booking;
  penalty?: unknown;
  user?: unknown;
  reservedEntry?: unknown;
}

export interface RemoveGuestResult {
  removedGuest: {
    id: number;
    name: string;
    preferredRole: string;
    matchId: number;
  };
  reservedEntry?: unknown;
}

export interface JoinSummaryWallet {
  id: number;
  userId: number;
  balance: number;
}

export interface JoinSummaryPayment {
  currentBalance: number;
  depositAmount: number;
  pricePerPlayer: number;
  balanceAfterDeposit: number;
  canJoin: boolean;
  reason: string | null;
}

export interface JoinSummary {
  match: Match;
  wallet: JoinSummaryWallet;
  paymentSummary: JoinSummaryPayment;
}

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly apiUrl = environment.backendUrl;

  constructor(private readonly http: HttpClient) {}

  getJoinSummary(matchId: number): Observable<ApiResponse<JoinSummary>> {
    return this.http.get<ApiResponse<JoinSummary>>(
      `${this.apiUrl}/matches/${matchId}/join-summary`
    );
  }

  joinMatch(matchId: number): Observable<ApiResponse<Booking>> {
    return this.http.post<ApiResponse<Booking>>(
      `${this.apiUrl}/matches/${matchId}/bookings`,
      {}
    );
  }

  getMyBookings(): Observable<ApiResponse<Booking[]>> {
    return this.http.get<ApiResponse<Booking[]>>(
      `${this.apiUrl}/users/me/bookings`
    );
  }

  getMatchBookings(matchId: number): Observable<ApiResponse<Booking[]>> {
    return this.http.get<ApiResponse<Booking[]>>(
      `${this.apiUrl}/matches/${matchId}/bookings`
    );
  }

  payBookingWithWallet(bookingId: number): Observable<ApiResponse<Booking>> {
    return this.http.patch<ApiResponse<Booking>>(
      `${this.apiUrl}/bookings/${bookingId}/pay-wallet`,
      {}
    );
  }

  chooseOnSitePayment(bookingId: number): Observable<ApiResponse<Booking>> {
    return this.http.patch<ApiResponse<Booking>>(
      `${this.apiUrl}/bookings/${bookingId}/pay-on-site`,
      {}
    );
  }

  confirmAttendance(bookingId: number): Observable<ApiResponse<Booking>> {
    return this.http.patch<ApiResponse<Booking>>(
      `${this.apiUrl}/bookings/${bookingId}/confirm-attendance`,
      {}
    );
  }

  markNoShow(bookingId: number): Observable<ApiResponse<Booking>> {
    return this.http.patch<ApiResponse<Booking>>(
      `${this.apiUrl}/bookings/${bookingId}/no-show`,
      {}
    );
  }

  leaveBooking(bookingId: number): Observable<ApiResponse<LeaveBookingResult>> {
    return this.http.patch<ApiResponse<LeaveBookingResult>>(
      `${this.apiUrl}/bookings/${bookingId}/leave`,
      {}
    );
  }

  requestLateCancellation(
    bookingId: number,
    reason: string
  ): Observable<ApiResponse<LateCancellationRequestResult>> {
    return this.http.patch<ApiResponse<LateCancellationRequestResult>>(
      `${this.apiUrl}/bookings/${bookingId}/late-cancel`,
      { reason }
    );
  }

  removeGuestFromMatch(
    matchId: number,
    guestId: number
  ): Observable<ApiResponse<RemoveGuestResult>> {
    return this.http.delete<ApiResponse<RemoveGuestResult>>(
      `${this.apiUrl}/matches/${matchId}/guests/${guestId}`
    );
  }
}
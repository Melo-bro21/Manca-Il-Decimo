import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export interface MatchGuestRequest {
  name: string;
  preferredRole: string;
}

export interface CreateMatchRequest {
  title: string;
  description?: string;
  fieldId: number;
  startsAt: string;
  durationMinutes: number;
  maxPlayers: number;
  pricePerPlayer: number;
  depositAmount: number;
  onlyReliableUsers?: boolean;
  minReliabilityScore?: number | null;
  requiresApproval?: boolean;
  guests?: MatchGuestRequest[];
}

export interface MatchCreator {
  id: number;
  name: string | null;
  email: string;
  reliabilityScore: number;
  preferredRole?: string | null;
}

export interface MatchSportsCenter {
  id: number;
  name: string;
  city: string;
  address: string;
  distanceKm?: number;
}

export interface MatchField {
  id: number;
  name: string;
  sportType: string;
  size: string;
  surface: string;
  indoor: boolean;
  pricePerHour: number;
  sportsCenter: MatchSportsCenter;
}

export interface MatchBookingUser {
  id: number;
  name: string | null;
  email: string;
  reliabilityScore: number;
  preferredRole?: string | null;
}

export interface MatchBooking {
  id: number;
  userId: number;
  matchId: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  user: MatchBookingUser;
}

export interface MatchGuest {
  id: number;
  name: string;
  preferredRole: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Match {
  id: number;
  title: string;
  description?: string | null;
  fieldId: number;
  creatorId: number;
  startsAt: string;
  durationMinutes: number;
  maxPlayers: number;
  currentPlayers: number;
  pricePerPlayer: number;
  depositAmount: number;
  status: string;
  onlyReliableUsers: boolean;
  minReliabilityScore: number | null;
  requiresApproval: boolean;
  creator?: MatchCreator;
  field?: MatchField;
  bookings?: MatchBooking[];
  guests?: MatchGuest[];
}

export interface MatchManagementParticipant {
  bookingId: number;
  attendanceStatus?: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    preferredRole?: string | null;
    reliabilityScore: number;
  };
}

export interface ReportReasonOption {
  value: string;
  label: string;
}

export interface MatchManagementData {
  match: {
    id: number;
    title: string;
    startsAt: string;
    durationMinutes: number;
    status: string;
    field?: MatchField;
  };
  canReport: boolean;
  reportReasons: ReportReasonOption[];
  participants: MatchManagementParticipant[];
}

export interface CreatePlayerReportRequest {
  reportedUserId: number;
  reason: string;
  description?: string | null;
}

export interface PlayerReport {
  id: number;
  reason: string;
  description?: string | null;
  status: string;
  createdAt: string;
  matchId: number;
  reporterId: number;
  reportedUserId: number;
}

@Injectable({
  providedIn: 'root',
})
export class MatchesService {
  private readonly apiUrl = environment.backendUrl;

  constructor(private readonly http: HttpClient) {}

  createMatch(body: CreateMatchRequest): Observable<ApiResponse<Match>> {
    return this.http.post<ApiResponse<Match>>(`${this.apiUrl}/matches`, body);
  }

  getMatches(): Observable<ApiResponse<Match[]>> {
    return this.http.get<ApiResponse<Match[]>>(`${this.apiUrl}/matches`);
  }

  getMatchById(matchId: number): Observable<ApiResponse<Match>> {
    return this.http.get<ApiResponse<Match>>(
      `${this.apiUrl}/matches/${matchId}`
    );
  }

  getMatchManagement(
    matchId: number
  ): Observable<ApiResponse<MatchManagementData>> {
    return this.http.get<ApiResponse<MatchManagementData>>(
      `${this.apiUrl}/matches/${matchId}/manage`
    );
  }

  createPlayerReport(
    matchId: number,
    body: CreatePlayerReportRequest
  ): Observable<ApiResponse<PlayerReport>> {
    return this.http.post<ApiResponse<PlayerReport>>(
      `${this.apiUrl}/matches/${matchId}/reports`,
      body
    );
  }
}
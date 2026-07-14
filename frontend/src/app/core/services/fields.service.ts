import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export interface FieldSportsCenter {
  id: number;
  name: string;
  city: string;
  address: string;
  distanceKm: number;
}

export interface FieldAvailability {
  id: number;
  name: string;
  sportType: string;
  size: string;
  surface: string;
  indoor: boolean;
  pricePerHour: number;
  sportsCenterId?: number;
  sportsCenter?: FieldSportsCenter;
  isAvailable: boolean;
  unavailableReason: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class FieldsService {
  private readonly apiUrl = environment.backendUrl;

  constructor(private readonly http: HttpClient) {}

  getFieldsAvailability(params: {
    sportsCenterId: number;
    startsAt: string;
    durationMinutes: number;
  }): Observable<ApiResponse<FieldAvailability[]>> {
    const httpParams = new HttpParams()
      .set('sportsCenterId', params.sportsCenterId)
      .set('startsAt', params.startsAt)
      .set('durationMinutes', params.durationMinutes);

    return this.http.get<ApiResponse<FieldAvailability[]>>(
      `${this.apiUrl}/fields/availability`,
      {
        params: httpParams,
      }
    );
  }
}
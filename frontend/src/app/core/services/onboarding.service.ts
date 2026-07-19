import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private apiUrl = `${environment.backendUrl}/sports-centers/onboard`;

  constructor(private http: HttpClient) {}

  // Questa funzione chiama il backend per ottenere il link di Stripe
  startOnboarding(sportsCenterId: number): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(this.apiUrl, { sportsCenterId });
  }
}
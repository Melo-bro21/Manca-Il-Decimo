import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, calendarOutline } from 'ionicons/icons';

import { BookingsService } from '../../core/services/bookings.service';

interface CheckoutMatch {
  id: number;
  dayLabel: string;
  time: string;
  centerName: string;
  type: string;
}

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class CheckoutPage {
  // Variabili di stato
  matchId = 0;
  isLoading = false;
  isConfirming = false;
  successMessage = '';
  errorMessage = '';
  
  // Variabili mancanti che causavano l'errore TS
  canJoin = false;
  cannotJoinReason: string | null = null;

  match: CheckoutMatch = {
    id: 0,
    dayLabel: '',
    time: '',
    centerName: '',
    type: '',
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly bookingsService: BookingsService
  ) {
    addIcons({ arrowBackOutline, calendarOutline });
    this.matchId = Number(this.route.snapshot.paramMap.get('matchId'));
  }

  ionViewWillEnter(): void {
    this.loadMatchDetails();
  }

  goBack(): void { this.router.navigate(['/matches', this.matchId]); }
  cancel(): void { this.router.navigate(['/matches', this.matchId]); }

  confirmJoin(): void {
    this.isConfirming = true;
    this.errorMessage = '';
    
    this.bookingsService.joinMatch(this.matchId).subscribe({
      next: () => {
        this.successMessage = 'Iscrizione completata!';
        setTimeout(() => this.router.navigate(['/tabs/my-matches']), 900);
      },
      error: (err) => {
        this.isConfirming = false;
        this.errorMessage = err.error?.message || 'Errore iscrizione.';
      }
    });
  }

private loadMatchDetails(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.bookingsService.getJoinSummary(this.matchId).subscribe({
      next: (response: any) => {
        // I dati sono dentro response.data
        const m = response.data?.match; 
        const ps = response.data?.paymentSummary;

        if (!m) {
          this.errorMessage = "Errore: partita non trovata nei dati.";
          this.isLoading = false;
          return;
        }

        const startsAt = new Date(m.startsAt);
        this.match = {
          id: m.id,
          dayLabel: startsAt.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
          time: startsAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          centerName: m.field?.sportsCenter?.name || 'Centro sportivo',
          type: `${m.field?.sportType || 'Calcetto'} · ${m.field?.size || ''}`
        };

        this.canJoin = ps ? ps.canJoin : true;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Errore di rete:", err);
        this.isLoading = false;
        this.errorMessage = 'Errore di comunicazione col server.';
      }
    });
  } 
}
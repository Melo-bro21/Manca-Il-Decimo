import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cardOutline,
  calendarOutline,
  shieldCheckmarkOutline,
  walletOutline,
} from 'ionicons/icons';

import {
  BookingsService,
  JoinSummary,
} from '../../core/services/bookings.service';
import { Match } from '../../core/services/matches.service';

interface CheckoutMatch {
  id: number;
  dayLabel: string;
  time: string;
  centerName: string;
  type: string;
  deposit: number;
  pricePerPlayer: number;
}

interface CheckoutWallet {
  balance: number;
  balanceAfterDeposit: number;
}

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class CheckoutPage {
  matchId = 0;

  isLoading = false;
  isConfirming = false;

  successMessage = '';
  errorMessage = '';

  canJoin = false;
  cannotJoinReason: string | null = null;

  match: CheckoutMatch = {
    id: 0,
    dayLabel: '',
    time: '',
    centerName: '',
    type: '',
    deposit: 0,
    pricePerPlayer: 0,
  };

  wallet: CheckoutWallet = {
    balance: 0,
    balanceAfterDeposit: 0,
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly bookingsService: BookingsService
  ) {
    addIcons({
      arrowBackOutline,
      cardOutline,
      calendarOutline,
      shieldCheckmarkOutline,
      walletOutline,
    });

    const idFromRoute = Number(this.route.snapshot.paramMap.get('matchId'));
    this.matchId = Number.isNaN(idFromRoute) ? 0 : idFromRoute;

    this.match = {
      ...this.match,
      id: this.matchId,
    };
  }

  ionViewWillEnter(): void {
    this.loadCheckoutSummary();
  }

  get total(): number {
    return this.match.deposit;
  }

  get isActionDisabled(): boolean {
    return this.isLoading || this.isConfirming || !this.canJoin;
  }

  goBack(): void {
    this.router.navigate(['/matches', this.matchId]);
  }

  cancel(): void {
    this.router.navigate(['/matches', this.matchId]);
  }

  confirmJoin(): void {
    if (this.isActionDisabled) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isConfirming = true;

    this.bookingsService.joinMatch(this.matchId).subscribe({
      next: (response) => {
        this.isConfirming = false;

        this.successMessage =
          response.message || 'Iscrizione completata con successo.';

        setTimeout(() => {
          this.router.navigate(['/tabs/my-matches']);
        }, 900);
      },
      error: (error: HttpErrorResponse) => {
        this.isConfirming = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile completare l’iscrizione. Riprova tra poco.';

        this.loadCheckoutSummary();
      },
    });
  }

  private loadCheckoutSummary(): void {
    if (!this.matchId) {
      this.errorMessage = 'Partita non valida.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.bookingsService.getJoinSummary(this.matchId).subscribe({
      next: (response) => {
        this.isLoading = false;

        this.applyJoinSummary(response.data);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare il riepilogo iscrizione.';
      },
    });
  }

  private applyJoinSummary(summary: JoinSummary): void {
    this.match = this.mapMatchToCheckout(summary.match);

    this.wallet = {
      balance: summary.paymentSummary.currentBalance,
      balanceAfterDeposit: summary.paymentSummary.balanceAfterDeposit,
    };

    this.canJoin = summary.paymentSummary.canJoin;
    this.cannotJoinReason = summary.paymentSummary.reason;

    if (!this.canJoin && this.cannotJoinReason) {
      this.errorMessage = this.cannotJoinReason;
    }
  }

  private mapMatchToCheckout(match: Match): CheckoutMatch {
    const startsAt = new Date(match.startsAt);

    const centerName =
      match.field?.sportsCenter?.name || 'Centro sportivo non indicato';

    const sportType = match.field?.sportType || 'Calcetto';
    const size = match.field?.size || this.getSizeFromMaxPlayers(match.maxPlayers);

    return {
      id: match.id,
      dayLabel: this.formatDayLabel(startsAt),
      time: this.formatTime(startsAt),
      centerName,
      type: `${sportType} · ${size}`,
      deposit: match.depositAmount,
      pricePerPlayer: match.pricePerPlayer,
    };
  }

  private formatDayLabel(date: Date): string {
    const today = new Date();
    const tomorrow = new Date();

    tomorrow.setDate(today.getDate() + 1);

    if (this.isSameDay(date, today)) {
      return 'Oggi';
    }

    if (this.isSameDay(date, tomorrow)) {
      return 'Domani';
    }

    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private isSameDay(firstDate: Date, secondDate: Date): boolean {
    return (
      firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate()
    );
  }

  private getSizeFromMaxPlayers(maxPlayers: number): string {
    if (maxPlayers === 10) {
      return '5vs5';
    }

    if (maxPlayers === 12) {
      return '6vs6';
    }

    if (maxPlayers === 14) {
      return '7vs7';
    }

    return `${maxPlayers} giocatori`;
  }
}
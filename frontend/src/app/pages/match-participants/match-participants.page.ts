import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  personCircleOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  trashOutline,
  walletOutline,
} from 'ionicons/icons';

import {
  Booking,
  BookingsService,
} from '../../core/services/bookings.service';
import {
  Match,
  MatchesService,
} from '../../core/services/matches.service';

interface MatchGuest {
  id: number;
  name: string;
  preferredRole: string;
  matchId: number;
}

@Component({
  selector: 'app-match-participants',
  templateUrl: './match-participants.page.html',
  styleUrls: ['./match-participants.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class MatchParticipantsPage {
  matchId = 0;
  match: Match | null = null;

  isLoading = false;
  actionLoadingId: number | null = null;
  guestActionLoadingId: number | null = null;

  bookings: Booking[] = [];
  guests: MatchGuest[] = [];

  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly bookingsService: BookingsService,
    private readonly matchesService: MatchesService
  ) {
    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      personCircleOutline,
      refreshOutline,
      shieldCheckmarkOutline,
      trashOutline,
      walletOutline,
    });

    const idFromRoute = Number(this.route.snapshot.paramMap.get('id'));
    this.matchId = Number.isNaN(idFromRoute) ? 0 : idFromRoute;
  }

  ionViewWillEnter(): void {
    this.loadParticipants();
  }

  goBack(): void {
    this.router.navigate(['/matches', this.matchId]);
  }

  loadParticipants(): void {
    this.clearMessages();
    this.isLoading = true;

    forkJoin({
      bookings: this.bookingsService.getMatchBookings(this.matchId),
      match: this.matchesService.getMatchById(this.matchId),
    }).subscribe({
      next: ({ bookings, match }) => {
        this.bookings = bookings.data;

        const matchData = match.data as Match & {
          guests?: MatchGuest[];
        };

        this.match = matchData;
        this.guests = matchData.guests || [];

        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare i partecipanti.';
      },
    });
  }

  confirmAttendance(booking: Booking): void {
    if (this.actionLoadingId !== null) {
      return;
    }

    this.clearMessages();

    if (!this.hasMatchStarted) {
      this.errorMessage =
        'Puoi confermare le presenze solo quando la partita è iniziata.';
      return;
    }

    if (this.isAttendanceClosed(booking)) {
      return;
    }

    this.actionLoadingId = booking.id;

    this.bookingsService.confirmAttendance(booking.id).subscribe({
      next: (response) => {
        this.actionLoadingId = null;
        this.updateBooking(response.data);
        this.successMessage =
          'Presenza confermata. Se necessario, la cauzione è stata rimborsata.';
      },
      error: (error: HttpErrorResponse) => {
        this.actionLoadingId = null;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile confermare la presenza.';
      },
    });
  }

  markNoShow(booking: Booking): void {
    if (this.actionLoadingId !== null) {
      return;
    }

    this.clearMessages();

    if (!this.hasMatchStarted) {
      this.errorMessage =
        'Puoi segnare un utente assente solo quando la partita è iniziata.';
      return;
    }

    if (this.isAttendanceClosed(booking)) {
      return;
    }

    this.actionLoadingId = booking.id;

    this.bookingsService.markNoShow(booking.id).subscribe({
      next: (response) => {
        this.actionLoadingId = null;
        this.updateBooking(response.data);
        this.successMessage =
          'Assenza registrata. La penalità è stata applicata.';
      },
      error: (error: HttpErrorResponse) => {
        this.actionLoadingId = null;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile segnare l’assenza.';
      },
    });
  }

  removeGuest(guest: MatchGuest): void {
    if (this.guestActionLoadingId !== null) {
      return;
    }

    this.clearMessages();
    this.guestActionLoadingId = guest.id;

    this.bookingsService
      .removeGuestFromMatch(this.matchId, guest.id)
      .subscribe({
        next: () => {
          this.guestActionLoadingId = null;

          this.guests = this.guests.filter(
            (currentGuest) => currentGuest.id !== guest.id
          );

          this.successMessage =
            'Giocatore rimosso dalla partita. Se c’era qualcuno in lista d’attesa, il posto è stato riservato.';
        },
        error: (error: HttpErrorResponse) => {
          this.guestActionLoadingId = null;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile rimuovere il giocatore.';
        },
      });
  }

  get hasParticipants(): boolean {
    return this.bookings.length > 0;
  }

  get hasGuests(): boolean {
    return this.guests.length > 0;
  }

  get hasSomethingToShow(): boolean {
    return this.hasParticipants || this.hasGuests;
  }

  get hasMatchStarted(): boolean {
    if (!this.match?.startsAt) {
      return false;
    }

    const startsAtTime = new Date(this.match.startsAt).getTime();

    if (Number.isNaN(startsAtTime)) {
      return false;
    }

    return Date.now() >= startsAtTime;
  }

  getUserInitial(booking: Booking): string {
    const name = booking.user?.name || booking.user?.email || '?';

    return name.charAt(0).toUpperCase();
  }

  getGuestInitial(guest: MatchGuest): string {
    return guest.name.charAt(0).toUpperCase();
  }

  getUserName(booking: Booking): string {
    return booking.user?.name || booking.user?.email || 'Utente';
  }

  getUserRole(booking: Booking): string {
    return booking.user?.preferredRole || 'Ruolo non indicato';
  }

  getGuestRole(guest: MatchGuest): string {
    return this.formatRole(guest.preferredRole);
  }

  getReliability(booking: Booking): number {
    return booking.user?.reliabilityScore ?? 0;
  }

  getPaymentLabel(booking: Booking): string {
    if (booking.paymentMethod === 'WALLET' && booking.paymentStatus === 'PAID') {
      return 'Pagato con wallet';
    }

    if (booking.paymentMethod === 'ON_SITE') {
      return booking.paymentStatus === 'PAID'
        ? 'Pagato sul campo'
        : 'Da pagare sul campo';
    }

    return 'Pagamento non scelto';
  }

  getDepositLabel(booking: Booking): string {
    if (booking.depositStatus === 'REFUNDED') {
      return 'Cauzione rimborsata';
    }

    if (booking.depositStatus === 'KEPT') {
      return 'Cauzione trattenuta';
    }

    return 'Cauzione bloccata';
  }

  getAttendanceLabel(booking: Booking): string {
    if (booking.attendanceStatus === 'PRESENT') {
      return 'Presente';
    }

    if (booking.attendanceStatus === 'NO_SHOW') {
      return 'Assente';
    }

    if (booking.attendanceStatus === 'LATE_CANCELLED') {
      return 'Uscita emergenza';
    }

    return 'Da confermare';
  }

  isAttendanceClosed(booking: Booking): boolean {
    return (
      booking.attendanceStatus === 'PRESENT' ||
      booking.attendanceStatus === 'NO_SHOW' ||
      booking.attendanceStatus === 'LATE_CANCELLED'
    );
  }

  canManageAttendance(booking: Booking): boolean {
    return this.hasMatchStarted && !this.isAttendanceClosed(booking);
  }

  isAttendanceActionDisabled(booking: Booking): boolean {
    return this.actionLoadingId !== null || !this.canManageAttendance(booking);
  }

  getMatchStartLabel(): string {
    if (!this.match?.startsAt) {
      return '';
    }

    const startsAt = new Date(this.match.startsAt);

    if (Number.isNaN(startsAt.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(startsAt);
  }

  private updateBooking(updatedBooking: Booking): void {
    this.bookings = this.bookings.map((booking) => {
      if (booking.id !== updatedBooking.id) {
        return booking;
      }

      return {
        ...booking,
        ...updatedBooking,
        user: updatedBooking.user || booking.user,
        match: updatedBooking.match || booking.match,
      };
    });
  }

  private formatRole(role: string): string {
    switch (role) {
      case 'PORTIERE':
        return 'Portiere';

      case 'DIFENSORE':
        return 'Difensore';

      case 'CENTROCAMPISTA':
        return 'Centrocampista';

      case 'ATTACCANTE':
        return 'Attaccante';

      default:
        return role || 'Ruolo non indicato';
    }
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
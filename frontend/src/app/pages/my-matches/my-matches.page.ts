import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  calendarOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  footballOutline,
  hourglassOutline,
  shieldCheckmarkOutline,
  timeOutline,
  walletOutline,
} from 'ionicons/icons';

import {
  WaitlistEntry,
  WaitlistService,
} from '../../core/services/waitlist.service';
import { UsersService } from '../../core/services/users.service';
import {
  Booking,
  BookingsService,
} from '../../core/services/bookings.service';
import { Match, MatchesService } from '../../core/services/matches.service';

type MyMatchesFilter = 'upcoming' | 'past' | 'cancelled';

type MyMatchStatus =
  | 'confirmed'
  | 'waiting'
  | 'reserved'
  | 'past'
  | 'cancelled';

type MyMatchAction = 'confirmPresence';

interface MyMatch {
  id: number;
  bookingId?: number;
  waitlistEntryId?: number;
  day: string;
  month: string;
  weekday: string;
  timeLabel: string;
  startsAt: string;
  centerName: string;
  fieldName: string;
  type: string;
  deposit: number;
  pricePerPlayer: number;
  status: MyMatchStatus;
  statusLabel: string;
  statusHint: string;
  rightLabel?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  depositStatus?: string;
  attendanceStatus?: string;
  canChoosePayment?: boolean;
  canLeave?: boolean;
  canLateCancel?: boolean;
  canManage?: boolean;
  isCreatedByMe?: boolean;
  isPaying?: boolean;
  isLeaving?: boolean;
  isLateCancelling?: boolean;
  waitlistPosition?: number;
  waitlistTotal?: number;
  reservationExpiresIn?: string;
  reservedExpiresAt?: string | null;
  action?: MyMatchAction;
  actionLabel?: string;
  isConfirming?: boolean;
  errorMessage?: string;
  successMessage?: string;
}

interface StatusViewConfig {
  icon: string;
  emptyTitle: string;
  emptyText: string;
}

@Component({
  selector: 'app-my-matches',
  templateUrl: './my-matches.page.html',
  styleUrls: ['./my-matches.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class MyMatchesPage {
  selectedFilter: MyMatchesFilter = 'upcoming';

  isLoading = false;
  errorMessage = '';

  currentUserId: number | null = null;

  filters: { label: string; value: MyMatchesFilter }[] = [
    {
      label: 'Prossime',
      value: 'upcoming',
    },
    {
      label: 'Passate',
      value: 'past',
    },
    {
      label: 'Annullate',
      value: 'cancelled',
    },
  ];

  matches: MyMatch[] = [];

  statusConfig: Record<MyMatchStatus, StatusViewConfig> = {
    waiting: {
      icon: 'hourglass-outline',
      emptyTitle: 'Nessuna partita in lista d’attesa',
      emptyText: 'Quando entrerai in lista d’attesa, la vedrai qui.',
    },
    reserved: {
      icon: 'alert-circle-outline',
      emptyTitle: 'Nessun posto riservato',
      emptyText: 'Quando si libera un posto da confermare, apparirà qui.',
    },
    confirmed: {
      icon: 'checkmark-circle-outline',
      emptyTitle: 'Nessuna partita confermata',
      emptyText: 'Quando confermerai una partita, la vedrai qui.',
    },
    past: {
      icon: 'calendar-outline',
      emptyTitle: 'Nessuna partita passata',
      emptyText: 'Qui compariranno le partite già giocate.',
    },
    cancelled: {
      icon: 'close-circle-outline',
      emptyTitle: 'Nessuna partita annullata',
      emptyText:
        'Qui compariranno eventuali partite annullate o partite da cui sei uscito.',
    },
  };

  constructor(
    private readonly router: Router,
    private readonly waitlistService: WaitlistService,
    private readonly usersService: UsersService,
    private readonly bookingsService: BookingsService,
    private readonly matchesService: MatchesService
  ) {
    addIcons({
      alertCircleOutline,
      calendarOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      footballOutline,
      hourglassOutline,
      shieldCheckmarkOutline,
      timeOutline,
      walletOutline,
    });
  }

  ionViewWillEnter(): void {
    this.loadMyMatches();
  }

  get visibleMatches(): MyMatch[] {
    if (this.selectedFilter === 'upcoming') {
      return this.matches.filter((match) =>
        ['waiting', 'reserved', 'confirmed'].includes(match.status)
      );
    }

    if (this.selectedFilter === 'past') {
      return this.matches.filter((match) => match.status === 'past');
    }

    return this.matches.filter((match) => match.status === 'cancelled');
  }

  selectFilter(filter: MyMatchesFilter): void {
    this.selectedFilter = filter;
  }

  openMatch(matchId: number): void {
    this.router.navigate(['/matches', matchId]);
  }

  openMatchManagement(match: MyMatch, event: Event): void {
    event.stopPropagation();

    if (!match.canManage) {
      return;
    }

    this.router.navigate(['/matches', match.id, 'manage']);
  }

  payWithWallet(match: MyMatch, event: Event): void {
    event.stopPropagation();

    if (!match.bookingId || match.isPaying) {
      return;
    }

    match.isPaying = true;
    match.errorMessage = '';
    match.successMessage = '';

    this.bookingsService.payBookingWithWallet(match.bookingId).subscribe({
      next: (response) => {
        match.isPaying = false;
        this.applyBookingPaymentUpdate(match, response.data);

        match.successMessage =
          'Pagamento completato con wallet. La cauzione resta bloccata fino alla conferma presenza.';
      },
      error: (error: HttpErrorResponse) => {
        match.isPaying = false;

        match.errorMessage =
          error.error?.message || 'Non è stato possibile pagare con wallet.';
      },
    });
  }

  payOnSite(match: MyMatch, event: Event): void {
    event.stopPropagation();

    if (!match.bookingId || match.isPaying) {
      return;
    }

    match.isPaying = true;
    match.errorMessage = '';
    match.successMessage = '';

    this.bookingsService.chooseOnSitePayment(match.bookingId).subscribe({
      next: (response) => {
        match.isPaying = false;
        this.applyBookingPaymentUpdate(match, response.data);

        match.successMessage =
          'Pagamento sul campo selezionato. La cauzione resta bloccata fino alla conferma.';
      },
      error: (error: HttpErrorResponse) => {
        match.isPaying = false;

        match.errorMessage =
          error.error?.message ||
          'Non è stato possibile scegliere il pagamento sul campo.';
      },
    });
  }

  leaveMatch(match: MyMatch, event: Event): void {
    event.stopPropagation();

    if (!match.bookingId || match.isLeaving) {
      return;
    }

    const confirmed = window.confirm(
      'Vuoi davvero uscire da questa partita? Se avevi una cauzione bloccata, verrà rimborsata.'
    );

    if (!confirmed) {
      return;
    }

    match.isLeaving = true;
    match.errorMessage = '';
    match.successMessage = '';

    this.bookingsService.leaveBooking(match.bookingId).subscribe({
      next: () => {
        match.isLeaving = false;

        match.status = 'cancelled';
        match.statusLabel = 'Uscito';
        match.statusHint =
          'Sei uscito dalla partita. Se era presente una cauzione bloccata, è stata rimborsata.';
        match.rightLabel = 'Non attiva';
        match.canChoosePayment = false;
        match.canLeave = false;
        match.canLateCancel = false;
        match.canManage = false;
        match.action = undefined;
        match.actionLabel = undefined;

        match.successMessage = 'Sei uscito dalla partita.';
      },
      error: (error: HttpErrorResponse) => {
        match.isLeaving = false;

        match.errorMessage =
          error.error?.message ||
          'Non è stato possibile uscire dalla partita.';
      },
    });
  }

  lateCancelMatch(match: MyMatch, event: Event): void {
    event.stopPropagation();

    if (!match.bookingId || match.isLateCancelling) {
      return;
    }

    const reason = window.prompt(
      'Spiega perché non puoi più partecipare. La motivazione sarà letta dal creator. Minimo 10 caratteri.'
    );

    if (reason === null) {
      return;
    }

    const cleanReason = reason.trim();

    if (cleanReason.length < 10) {
      match.errorMessage = 'Inserisci una motivazione di almeno 10 caratteri.';
      match.successMessage = '';
      return;
    }

    const confirmed = window.confirm(
      'Confermi l’uscita tardiva? Perderai punti affidabilità. La cauzione verrà trattenuta.'
    );

    if (!confirmed) {
      return;
    }

    match.isLateCancelling = true;
    match.errorMessage = '';
    match.successMessage = '';

    this.bookingsService
      .requestLateCancellation(match.bookingId, cleanReason)
      .subscribe({
        next: () => {
          match.isLateCancelling = false;

          match.status = 'cancelled';
          match.statusLabel = 'Uscita tardiva';
          match.statusHint =
            'Hai lasciato la partita nelle ultime ore. Hai perso punti affidabilità e la cauzione è stata trattenuta.';
          match.rightLabel = 'Emergenza';
          match.canChoosePayment = false;
          match.canLeave = false;
          match.canLateCancel = false;
          match.canManage = false;
          match.action = undefined;
          match.actionLabel = undefined;

          match.successMessage =
            'Uscita tardiva registrata. Il creator riceverà la tua motivazione.';
        },
        error: (error: HttpErrorResponse) => {
          match.isLateCancelling = false;

          match.errorMessage =
            error.error?.message ||
            'Non è stato possibile registrare l’uscita tardiva.';
        },
      });
  }

  confirmPresence(match: MyMatch, event: Event): void {
    event.stopPropagation();

    if (!match.waitlistEntryId || match.isConfirming) {
      return;
    }

    match.isConfirming = true;
    match.errorMessage = '';
    match.successMessage = '';

    this.waitlistService.confirmPresence(match.waitlistEntryId, 'ON_SITE').subscribe({
      next: (response) => {
        match.isConfirming = false;

        match.status = 'confirmed';
        match.statusLabel = 'Confermata';
        match.statusHint =
          response.message || 'La tua presenza è stata confermata.';
        match.rightLabel = 'Sei dentro';

        match.action = undefined;
        match.actionLabel = undefined;
        match.reservationExpiresIn = undefined;
        match.reservedExpiresAt = null;

        match.successMessage =
          'Presenza confermata con successo. Cauzione bloccata.';
      },
      error: (error: HttpErrorResponse) => {
        match.isConfirming = false;

        match.errorMessage =
          error.error?.message ||
          'Non è stato possibile confermare la presenza.';

        this.loadMyMatches();
      },
    });
  }

  declineReservedSpot(match: MyMatch, event: Event): void {
    event.stopPropagation();

    if (!match.waitlistEntryId || match.isConfirming) {
      return;
    }

    const confirmed = window.confirm(
      'Vuoi liberare il posto riservato? Verrà passato al prossimo utente in lista d’attesa.'
    );

    if (!confirmed) {
      return;
    }

    match.isConfirming = true;
    match.errorMessage = '';
    match.successMessage = '';

    this.waitlistService.declineReservedSpot(match.waitlistEntryId).subscribe({
      next: () => {
        match.isConfirming = false;

        match.status = 'cancelled';
        match.statusLabel = 'Posto liberato';
        match.statusHint =
          'Hai liberato il posto riservato. Il sistema lo passerà al prossimo utente in lista d’attesa.';
        match.rightLabel = 'Non attiva';
        match.action = undefined;
        match.actionLabel = undefined;
        match.reservationExpiresIn = undefined;
        match.reservedExpiresAt = null;
        match.canLeave = false;
        match.canLateCancel = false;
        match.canManage = false;

        match.successMessage = 'Posto riservato liberato correttamente.';

        this.loadMyMatches();
      },
      error: (error: HttpErrorResponse) => {
        match.isConfirming = false;

        match.errorMessage =
          error.error?.message ||
          'Non è stato possibile liberare il posto riservato.';
      },
    });
  }

  getStatusIcon(status: MyMatchStatus): string {
    return this.statusConfig[status].icon;
  }

  getEmptyTitle(): string {
    if (this.isLoading) {
      return 'Caricamento partite...';
    }

    if (this.errorMessage) {
      return 'Errore nel caricamento';
    }

    if (this.selectedFilter === 'past') {
      return this.statusConfig.past.emptyTitle;
    }

    if (this.selectedFilter === 'cancelled') {
      return this.statusConfig.cancelled.emptyTitle;
    }

    return 'Nessuna partita prossima';
  }

  getEmptyText(): string {
    if (this.isLoading) {
      return 'Stiamo recuperando le partite collegate al tuo account.';
    }

    if (this.errorMessage) {
      return this.errorMessage;
    }

    if (this.selectedFilter === 'past') {
      return this.statusConfig.past.emptyText;
    }

    if (this.selectedFilter === 'cancelled') {
      return this.statusConfig.cancelled.emptyText;
    }

    return 'Quando creerai o ti iscriverai a una partita, la vedrai qui.';
  }

  private loadMyMatches(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      me: this.usersService.getMe(),
      bookings: this.bookingsService.getMyBookings(),
      matches: this.matchesService.getMatches(),
      waitlist: this.waitlistService.getMyWaitlist(),
    }).subscribe({
      next: ({ me, bookings, matches, waitlist }) => {
        this.isLoading = false;

        this.currentUserId = me.data.user.id;

        const createdMatches = matches.data.filter(
          (match) => match.creatorId === this.currentUserId
        );

        const createdMyMatches = createdMatches.map((match) =>
          this.mapCreatedMatchToMyMatch(match)
        );

        const bookedMyMatches = bookings.data
          .filter((booking) => Boolean(booking.match))
          .map((booking) => this.mapBookingToMyMatch(booking));

        const waitlistMyMatches = waitlist.data
          .filter((entry) => entry.status !== 'CONFIRMED')
          .map((entry) => this.mapWaitlistEntryToMyMatch(entry));

        this.matches = [
          ...createdMyMatches,
          ...bookedMyMatches,
          ...waitlistMyMatches,
        ].sort((first, second) => {
          const firstDate = new Date(first.startsAt).getTime();
          const secondDate = new Date(second.startsAt).getTime();

          return firstDate - secondDate;
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare le tue partite.';
      },
    });
  }

  private mapCreatedMatchToMyMatch(match: Match): MyMatch {
    const myMatch = this.mapBackendMatchToBaseMyMatch(match);

    myMatch.isCreatedByMe = true;
    myMatch.statusLabel = match.requiresApproval ? 'Ad invito' : 'Organizzata';
    myMatch.statusHint = match.requiresApproval
      ? 'Hai creato una partita ad invito. Le richieste verranno gestite nella pagina dedicata.'
      : 'Hai creato questa partita. Puoi aprirla per vedere il dettaglio.';
    myMatch.rightLabel = match.requiresApproval ? 'Richieste' : 'Creatore';
    myMatch.canLeave = false;
    myMatch.canLateCancel = false;
    myMatch.canManage = myMatch.status === 'past' && match.status !== 'CANCELLED';

    if (myMatch.canManage) {
      myMatch.statusHint =
        'Partita conclusa. Puoi aprire Gestione partita per segnalare eventuali comportamenti scorretti.';
      myMatch.rightLabel = 'Gestibile';
    }

    return myMatch;
  }

  private mapBookingToMyMatch(booking: Booking): MyMatch {
    const match = booking.match as Match;

    const myMatch = this.mapBackendMatchToBaseMyMatch(match);

    myMatch.bookingId = booking.id;
    myMatch.paymentMethod = booking.paymentMethod;
    myMatch.paymentStatus = booking.paymentStatus;
    myMatch.depositStatus = booking.depositStatus;
    myMatch.attendanceStatus = booking.attendanceStatus;
    myMatch.canChoosePayment = this.canChoosePayment(booking);
    myMatch.canLeave = this.canLeaveBooking(booking, myMatch);
    myMatch.canLateCancel = this.canLateCancelBooking(booking, myMatch);

    if (booking.status === 'CANCELLED') {
      myMatch.status = 'cancelled';
      myMatch.statusLabel = 'Uscito';
      myMatch.rightLabel = 'Non attiva';
      myMatch.statusHint =
        'Sei uscito da questa partita. Se era presente una cauzione bloccata, è stata rimborsata.';
      myMatch.canChoosePayment = false;
      myMatch.canLeave = false;
      myMatch.canLateCancel = false;
      myMatch.canManage = false;

      return myMatch;
    }

    if (
      booking.status === 'LATE_CANCELLED' ||
      booking.attendanceStatus === 'LATE_CANCELLED'
    ) {
      myMatch.status = 'cancelled';
      myMatch.statusLabel = 'Uscita tardiva';
      myMatch.rightLabel = 'Emergenza';
      myMatch.statusHint =
        'Hai lasciato questa partita nelle ultime ore. La cauzione è stata trattenuta.';
      myMatch.canChoosePayment = false;
      myMatch.canLeave = false;
      myMatch.canLateCancel = false;
      myMatch.canManage = false;

      return myMatch;
    }

    if (booking.paymentMethod === 'NOT_SELECTED') {
      myMatch.statusLabel = 'Confermata';
      myMatch.rightLabel = 'Sei dentro';
      myMatch.statusHint = myMatch.canChoosePayment
        ? 'Pagamento disponibile: scegli come pagare la quota partita.'
        : 'La tua iscrizione è confermata. Potrai scegliere il pagamento nelle 3 ore prima della partita.';
    } else if (
      booking.paymentMethod === 'WALLET' &&
      booking.paymentStatus === 'PAID'
    ) {
      myMatch.statusLabel = 'Pagata';
      myMatch.rightLabel = 'Wallet';
      myMatch.statusHint =
        'Hai pagato con wallet. La cauzione resta bloccata fino alla conferma presenza.';
    } else if (booking.paymentMethod === 'ON_SITE') {
      myMatch.statusLabel = 'Sul campo';
      myMatch.rightLabel = 'Da pagare';
      myMatch.statusHint =
        'Hai scelto di pagare sul campo. La cauzione sarà rimborsata dopo conferma.';
    }

    return myMatch;
  }

  private mapWaitlistEntryToMyMatch(entry: WaitlistEntry): MyMatch {
    const match = entry.match as Match;

    const startsAt = new Date(match.startsAt);
    const isPast = startsAt < new Date();

    let status: MyMatchStatus = 'waiting';
    let statusLabel = 'In lista';
    let statusHint = `Sei in lista d’attesa per questa partita. Posizione: ${entry.position}.`;
    let rightLabel = `#${entry.position}`;
    let action: MyMatchAction | undefined;
    let actionLabel: string | undefined;
    let reservationExpiresIn: string | undefined;

    if (entry.status === 'RESERVED') {
      status = 'reserved';
      statusLabel = 'Posto riservato';
      reservationExpiresIn = this.formatReservedExpiration(
        entry.reservedExpiresAt
      );
      statusHint = reservationExpiresIn
        ? `Si è liberato un posto per te. Conferma entro ${reservationExpiresIn}.`
        : 'Si è liberato un posto per te. Hai 1 ora per confermare la presenza.';
      rightLabel = 'Da confermare';
      action = 'confirmPresence';
      actionLabel = 'Conferma presenza';
    }

    if (entry.status === 'EXPIRED') {
      status = 'cancelled';
      statusLabel = 'Scaduto';
      statusHint = 'Il tempo per confermare il posto riservato è scaduto oppure hai liberato il posto.';
      rightLabel = 'Non attiva';
      action = undefined;
      actionLabel = undefined;
    }

    if (isPast) {
      status = 'past';
      statusLabel = 'Scaduta';
      statusHint = 'La partita è già passata.';
      rightLabel = 'Non attiva';
      action = undefined;
      actionLabel = undefined;
    }

    return {
      id: match.id,
      waitlistEntryId: entry.id,
      day: this.formatDay(startsAt),
      month: this.formatMonth(startsAt),
      weekday: this.formatWeekday(startsAt),
      timeLabel: this.formatTime(startsAt),
      startsAt: match.startsAt,
      centerName:
        match.field?.sportsCenter?.name || 'Centro sportivo non indicato',
      fieldName: match.field?.name || 'Campo non indicato',
      type: `${match.field?.sportType || 'Calcetto'} · ${
        match.field?.size || 'Campo'
      }`, 
      deposit: match.depositAmount || 0,
      pricePerPlayer: match.pricePerPlayer || 0,
      status,
      statusLabel,
      statusHint,
      rightLabel,
      waitlistPosition: entry.position,
      reservedExpiresAt: entry.reservedExpiresAt,
      reservationExpiresIn,
      action,
      actionLabel,
      canLeave: false,
      canLateCancel: false,
      canManage: false,
    };
  }

  private mapBackendMatchToBaseMyMatch(match: Match): MyMatch {
    const startsAt = new Date(match.startsAt);
    const isPast = startsAt < new Date();

    const isCancelled = match.status === 'CANCELLED';

    let status: MyMatchStatus = 'confirmed';
    let statusLabel = 'Confermata';
    let statusHint =
      'La tua iscrizione è confermata. Presentati puntuale per evitare penalità.';
    let rightLabel = 'Sei dentro';

    if (isCancelled) {
      status = 'cancelled';
      statusLabel = 'Annullata';
      statusHint =
        'La partita è stata annullata. Se previsto, la cauzione viene gestita dal backend.';
      rightLabel = 'Non attiva';
    } else if (isPast) {
      status = 'past';
      statusLabel = 'Passata';
      statusHint =
        'Partita conclusa. Lo storico ti aiuta a tenere traccia delle tue partecipazioni.';
      rightLabel = 'Completata';
    }

    return {
      id: match.id,
      day: this.formatDay(startsAt),
      month: this.formatMonth(startsAt),
      weekday: this.formatWeekday(startsAt),
      timeLabel: this.formatTime(startsAt),
      startsAt: match.startsAt,
      centerName:
        match.field?.sportsCenter?.name || 'Centro sportivo non indicato',
      fieldName: match.field?.name || 'Campo non indicato',
      type: `${match.field?.sportType || 'Calcetto'} · ${
        match.field?.size || this.getSizeFromMaxPlayers(match.maxPlayers)
      }`,
      deposit: match.depositAmount,
      pricePerPlayer: match.pricePerPlayer,
      status,
      statusLabel,
      statusHint,
      rightLabel,
      canManage: false,
    };
  }

  private canChoosePayment(booking: Booking): boolean {
    if (!booking.match) {
      return false;
    }

    if (booking.status !== 'ACTIVE') {
      return false;
    }

    if (booking.paymentMethod !== 'NOT_SELECTED') {
      return false;
    }

    if (booking.paymentStatus !== 'PENDING') {
      return false;
    }

    const startsAt = new Date(booking.match.startsAt);
    const now = new Date();

    const diffMs = startsAt.getTime() - now.getTime();
    const threeHoursMs = 3 * 60 * 60 * 1000;

    return diffMs >= 0 && diffMs <= threeHoursMs;
  }

  private canLeaveBooking(booking: Booking, match: MyMatch): boolean {
    if (!booking.match) {
      return false;
    }

    if (booking.status !== 'ACTIVE') {
      return false;
    }

    if (match.status !== 'confirmed') {
      return false;
    }

    const startsAt = new Date(booking.match.startsAt);
    const now = new Date();

    const threeHoursMs = 3 * 60 * 60 * 1000;
    const diffMs = startsAt.getTime() - now.getTime();

    return diffMs > threeHoursMs;
  }

  private canLateCancelBooking(booking: Booking, match: MyMatch): boolean {
    if (!booking.match) {
      return false;
    }

    if (booking.status !== 'ACTIVE') {
      return false;
    }

    if (match.status !== 'confirmed') {
      return false;
    }

    const startsAt = new Date(booking.match.startsAt);
    const now = new Date();

    const threeHoursMs = 3 * 60 * 60 * 1000;
    const diffMs = startsAt.getTime() - now.getTime();

    return diffMs >= 0 && diffMs <= threeHoursMs;
  }

  private applyBookingPaymentUpdate(match: MyMatch, booking: Booking): void {
    match.paymentMethod = booking.paymentMethod;
    match.paymentStatus = booking.paymentStatus;
    match.depositStatus = booking.depositStatus;
    match.attendanceStatus = booking.attendanceStatus;
    match.canChoosePayment = false;
    match.canLateCancel = this.canLateCancelBooking(booking, match);

    if (booking.paymentMethod === 'WALLET') {
      match.statusLabel = 'Pagata';
      match.rightLabel = 'Wallet';
      match.statusHint =
        'Hai pagato con wallet. La cauzione resta bloccata fino alla conferma presenza.';
    }

    if (booking.paymentMethod === 'ON_SITE') {
      match.statusLabel = 'Sul campo';
      match.rightLabel = 'Da pagare';
      match.statusHint =
        'Hai scelto di pagare sul campo. La cauzione sarà rimborsata dopo conferma.';
    }
  }

  private formatReservedExpiration(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }

    const expiresAt = new Date(value);

    if (Number.isNaN(expiresAt.getTime())) {
      return undefined;
    }

    return expiresAt.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatDay(date: Date): string {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
    });
  }

  private formatMonth(date: Date): string {
    return date
      .toLocaleDateString('it-IT', {
        month: 'short',
      })
      .replace('.', '')
      .toUpperCase();
  }

  private formatWeekday(date: Date): string {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
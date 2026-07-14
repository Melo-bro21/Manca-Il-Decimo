import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  calendarOutline,
  timeOutline,
  footballOutline,
  locationOutline,
  peopleOutline,
  shieldCheckmarkOutline,
  carSportOutline,
  shirtOutline,
  warningOutline,
  alertCircleOutline,
  shareSocialOutline,
  starOutline,
} from 'ionicons/icons';

import { JoinRequestsService } from '../../core/services/join-requests.service';
import {
  Match,
  MatchBooking,
  MatchesService,
} from '../../core/services/matches.service';
import { UsersService } from '../../core/services/users.service';
import { WaitlistService } from '../../core/services/waitlist.service';
import { BookingsService } from '../../core/services/bookings.service';

interface MatchRoleInfo {
  label: string;
  value: string;
  icon: string;
  danger?: boolean;
}

interface MatchWarning {
  title: string;
  description: string;
  type: 'danger' | 'warning';
}

interface MatchDetail {
  id: number;
  imageUrl: string;
  title: string;
  dayLabel: string;
  time: string;
  type: string;
  centerName: string;
  address: string;
  availableSpots: number;
  totalSpots: number;
  deposit: number;
  participantsLabel: string;
  roles: MatchRoleInfo[];
  warnings: MatchWarning[];
  duration: string;
  fieldType: string;
  changingRooms: string;
  parking: string;
  description: string;
  organizerName: string;
  requiresApproval: boolean;
  onlyReliableUsers: boolean;
  minReliabilityScore: number | null;
  creatorId: number | null;
  registrationLabel: string;
  statusLabel: string;
  status: string;
}

type NormalizedRole =
  | 'PORTIERE'
  | 'DIFENSORE'
  | 'CENTROCAMPISTA'
  | 'ATTACCANTE'
  | 'UNKNOWN';

@Component({
  selector: 'app-match-detail',
  templateUrl: './match-detail.page.html',
  styleUrls: ['./match-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class MatchDetailPage {
  matchId = 0;

  isLoading = false;
  isRequestLoading = false;
  isWaitlistLoading = false;

  successMessage = '';
  errorMessage = '';

  currentUserId: number | null = null;
  isCreator = false;

  isAlreadyBooked = false;
  isAlreadyInWaitlist = false;
  isWaitlistReserved = false;
  userMatchStateLabel = '';

  match: MatchDetail = this.getDefaultMatch();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private joinRequestsService: JoinRequestsService,
    private matchesService: MatchesService,
    private usersService: UsersService,
    private waitlistService: WaitlistService,
    private bookingsService: BookingsService
  ) {
    addIcons({
      arrowBackOutline,
      calendarOutline,
      timeOutline,
      footballOutline,
      locationOutline,
      peopleOutline,
      shieldCheckmarkOutline,
      carSportOutline,
      shirtOutline,
      warningOutline,
      alertCircleOutline,
      shareSocialOutline,
      starOutline,
    });

    const idFromRoute = Number(this.route.snapshot.paramMap.get('id'));
    this.matchId = Number.isNaN(idFromRoute) ? 0 : idFromRoute;

    this.match = {
      ...this.match,
      id: this.matchId,
    };
  }

  ionViewWillEnter(): void {
    this.loadMatch();
  }

  goBack(): void {
    this.router.navigate(['/tabs/home']);
  }

  goToCheckout(): void {
    if (!this.canJoinMatch) {
      return;
    }

    this.router.navigate(['/checkout', this.match.id]);
  }

  goToRequests(): void {
    this.router.navigate(['/matches', this.match.id, 'requests']);
  }

  goToParticipants(): void {
    this.router.navigate(['/matches', this.match.id, 'participants']);
  }
  
  sendJoinRequest(): void {
    if (
      this.isRequestLoading ||
      this.isCreator ||
      this.isAlreadyBooked ||
      this.isAlreadyInWaitlist
    ) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';
    this.isRequestLoading = true;

    this.joinRequestsService.requestToJoinMatch(this.match.id).subscribe({
      next: () => {
        this.isRequestLoading = false;
        this.successMessage =
          'Richiesta inviata. Attendi la conferma dell’organizzatore.';
      },
      error: (error: HttpErrorResponse) => {
        this.isRequestLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile inviare la richiesta. Riprova tra poco.';
      },
    });
  }

  joinWaitlist(): void {
    if (
      this.isWaitlistLoading ||
      this.isCreator ||
      this.isAlreadyBooked ||
      this.isAlreadyInWaitlist
    ) {
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';
    this.isWaitlistLoading = true;

    this.waitlistService.joinWaitlist(this.match.id).subscribe({
      next: (response) => {
        this.isWaitlistLoading = false;

        this.isAlreadyInWaitlist = true;
        this.isWaitlistReserved = false;
        this.userMatchStateLabel = 'Sei già in lista d’attesa per questa partita.';

        this.successMessage = `Sei entrato in lista d’attesa. Posizione: ${response.data.position}.`;
      },
      error: (error: HttpErrorResponse) => {
        this.isWaitlistLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile entrare in lista d’attesa.';
      },
    });
  }

  get isMatchFull(): boolean {
    return this.match.status === 'FULL' || this.match.availableSpots <= 0;
  }

  get canJoinMatch(): boolean {
    return (
      !this.isCreator &&
      !this.match.requiresApproval &&
      !this.isMatchFull &&
      !this.isAlreadyBooked &&
      !this.isAlreadyInWaitlist
    );
  }

  get canJoinWaitlist(): boolean {
    return (
      !this.isCreator &&
      !this.match.requiresApproval &&
      this.isMatchFull &&
      !this.isAlreadyBooked &&
      !this.isAlreadyInWaitlist
    );
  }

  get canSendJoinRequest(): boolean {
    return (
      !this.isCreator &&
      this.match.requiresApproval &&
      !this.isAlreadyBooked &&
      !this.isAlreadyInWaitlist
    );
  }

  get shouldShowUserMatchState(): boolean {
    return Boolean(this.userMatchStateLabel);
  }

  private loadMatch(): void {
    if (!this.matchId) {
      this.errorMessage = 'Partita non valida.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    forkJoin({
      match: this.matchesService.getMatchById(this.matchId),
      me: this.usersService.getMe(),
      bookings: this.bookingsService.getMyBookings(),
      waitlist: this.waitlistService.getMyWaitlist(),
    }).subscribe({
      next: ({ match, me, bookings, waitlist }) => {
        this.isLoading = false;

        this.currentUserId = me.data.user.id;
        this.match = this.mapBackendMatchToDetail(match.data);
        this.isCreator = this.match.creatorId === this.currentUserId;

        const myBooking = bookings.data.find((booking) => {
          return booking.matchId === this.matchId && booking.status === 'ACTIVE';
        });

        const myWaitlistEntry = waitlist.data.find((entry) => {
          return entry.matchId === this.matchId && entry.status !== 'CONFIRMED';
        });

        this.isAlreadyBooked = Boolean(myBooking);
        this.isAlreadyInWaitlist = Boolean(myWaitlistEntry);
        this.isWaitlistReserved = myWaitlistEntry?.status === 'RESERVED';

        if (this.isAlreadyBooked) {
          this.userMatchStateLabel = 'Sei già dentro questa partita.';
        } else if (this.isWaitlistReserved) {
          this.userMatchStateLabel =
            'Hai un posto riservato. Vai su Le mie partite per confermare.';
        } else if (this.isAlreadyInWaitlist) {
          this.userMatchStateLabel =
            'Sei già in lista d’attesa per questa partita.';
        } else {
          this.userMatchStateLabel = '';
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare il dettaglio della partita.';
      },
    });
  }

  private mapBackendMatchToDetail(match: Match): MatchDetail {
    const startsAt = new Date(match.startsAt);

    const availableSpots = Math.max(
      match.maxPlayers - match.currentPlayers,
      0
    );

    const centerName =
      match.field?.sportsCenter?.name || 'Centro sportivo non indicato';

    const address =
      match.field?.sportsCenter?.address || 'Indirizzo non indicato';

    const sportType = match.field?.sportType || 'Calcetto';
    const size =
      match.field?.size || this.getSizeFromMaxPlayers(match.maxPlayers);

    const surface = match.field?.surface || 'Campo non specificato';
    const indoorLabel = match.field?.indoor ? 'indoor' : 'outdoor';

    const requiresApproval = match.requiresApproval ?? false;
    const onlyReliableUsers = match.onlyReliableUsers ?? false;
    const minReliabilityScore = match.minReliabilityScore ?? null;

    const roles = this.buildRolesFromMatch(match);

    return {
      id: match.id,
      imageUrl: 'assets/welcome-football-bg.png',
      title: match.title || 'Dettaglio partita',
      dayLabel: this.formatDayLabel(startsAt),
      time: this.formatTime(startsAt),
      type: `${sportType} · ${size}`,
      centerName,
      address,
      availableSpots,
      totalSpots: match.maxPlayers,
      deposit: match.depositAmount,
      participantsLabel: `${match.currentPlayers}/${match.maxPlayers} partecipanti`,
      requiresApproval,
      onlyReliableUsers,
      minReliabilityScore,
      creatorId: match.creatorId,
      registrationLabel: requiresApproval
        ? 'Con approvazione'
        : 'Iscrizione libera',
      statusLabel: this.getMatchStatusLabel(match.status),
      status: match.status,
      roles,
      warnings: this.buildWarnings(
        availableSpots,
        requiresApproval,
        onlyReliableUsers,
        minReliabilityScore,
        roles,
        match.status
      ),
      duration: `${match.durationMinutes} minuti`,
      fieldType: `${surface} ${indoorLabel}`,
      changingRooms: 'Sì',
      parking: 'Sì',
      description:
        match.description ||
        'Partita amatoriale. Rispetto, puntualità e spirito di squadra sono fondamentali.',
      organizerName: match.creator?.name || 'Organizzatore',
    };
  }

  private buildRolesFromMatch(match: Match): MatchRoleInfo[] {
    const roleCounts = {
      PORTIERE: 0,
      DIFENSORE: 0,
      CENTROCAMPISTA: 0,
      ATTACCANTE: 0,
      UNKNOWN: 0,
    };

    const creatorRole = this.normalizeRole(match.creator?.preferredRole);

    if (creatorRole !== 'UNKNOWN') {
      roleCounts[creatorRole] += 1;
    }

    const guests = match.guests || [];

    for (const guest of guests) {
      const role = this.normalizeRole(guest.preferredRole);

      if (role !== 'UNKNOWN') {
        roleCounts[role] += 1;
      } else {
        roleCounts.UNKNOWN += 1;
      }
    }

    const bookings: MatchBooking[] = match.bookings || [];

    for (const booking of bookings) {
      const role = this.normalizeRole(booking.user?.preferredRole);

      if (role !== 'UNKNOWN') {
        roleCounts[role] += 1;
      } else {
        roleCounts.UNKNOWN += 1;
      }
    }

    return [
      {
        label: 'Portieri',
        value: `${roleCounts.PORTIERE}/2`,
        icon: 'shield-checkmark-outline',
        danger: roleCounts.PORTIERE === 0,
      },
      {
        label: 'Difensori',
        value: String(roleCounts.DIFENSORE),
        icon: 'shirt-outline',
      },
      {
        label: 'Centrocampisti',
        value: String(roleCounts.CENTROCAMPISTA),
        icon: 'football-outline',
      },
      {
        label: 'Attaccanti',
        value: String(roleCounts.ATTACCANTE),
        icon: 'football-outline',
      },
    ];
  }

  private normalizeRole(role?: string | null): NormalizedRole {
    if (!role) {
      return 'UNKNOWN';
    }

    const normalizedRole = role.trim().toUpperCase();

    if (
      normalizedRole === 'PORTIERE' ||
      normalizedRole === 'GOALKEEPER' ||
      normalizedRole === 'GK'
    ) {
      return 'PORTIERE';
    }

    if (
      normalizedRole === 'DIFENSORE' ||
      normalizedRole === 'DIFENSORE CENTRALE' ||
      normalizedRole === 'DEFENDER'
    ) {
      return 'DIFENSORE';
    }

    if (
      normalizedRole === 'CENTROCAMPISTA' ||
      normalizedRole === 'MIDFIELDER'
    ) {
      return 'CENTROCAMPISTA';
    }

    if (
      normalizedRole === 'ATTACCANTE' ||
      normalizedRole === 'PUNTA' ||
      normalizedRole === 'STRIKER' ||
      normalizedRole === 'FORWARD'
    ) {
      return 'ATTACCANTE';
    }

    return 'UNKNOWN';
  }

  private buildWarnings(
    availableSpots: number,
    requiresApproval: boolean,
    onlyReliableUsers: boolean,
    minReliabilityScore: number | null,
    roles: MatchRoleInfo[],
    status: string
  ): MatchWarning[] {
    const warnings: MatchWarning[] = [];

    const goalkeeperRole = roles.find((role) => role.label === 'Portieri');

    if (goalkeeperRole?.value === '0/2') {
      warnings.push({
        title: 'Manca un portiere',
        description: 'La partita non ha ancora un portiere indicato.',
        type: 'danger',
      });
    }

    if (status === 'FULL') {
      warnings.push({
        title: 'Partita completa',
        description:
          'La partita è piena, ma puoi entrare in lista d’attesa.',
        type: 'warning',
      });
    } else if (availableSpots <= 2) {
      warnings.push({
        title: 'Pochi posti disponibili',
        description: 'La partita sta per completarsi.',
        type: 'warning',
      });
    }

    if (requiresApproval) {
      warnings.push({
        title: 'Partita ad invito',
        description: 'Per entrare serve la conferma dell’organizzatore.',
        type: 'warning',
      });
    }

    if (onlyReliableUsers) {
      warnings.push({
        title: 'Filtro affidabilità',
        description: `Questa partita richiede almeno ${
          minReliabilityScore ?? 0
        } punti affidabilità.`,
        type: 'warning',
      });
    }

    if (warnings.length === 0) {
      warnings.push({
        title: 'Partita disponibile',
        description: 'Puoi partecipare se ci sono posti liberi.',
        type: 'warning',
      });
    }

    return warnings;
  }

  private getMatchStatusLabel(status: string): string {
    if (status === 'OPEN') {
      return 'Aperta';
    }

    if (status === 'FULL') {
      return 'Completa';
    }

    if (status === 'CANCELLED') {
      return 'Annullata';
    }

    if (status === 'COMPLETED') {
      return 'Conclusa';
    }

    return status;
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

  private getDefaultMatch(): MatchDetail {
    return {
      id: 0,
      imageUrl: 'assets/welcome-football-bg.png',
      title: 'Dettaglio partita',
      dayLabel: 'Oggi',
      time: '21:00',
      type: 'Calcetto · 5vs5',
      centerName: 'Centro Sportivo Kennedy',
      address: 'Via Olivieri 10, Milano',
      availableSpots: 3,
      totalSpots: 10,
      deposit: 10,
      participantsLabel: '6/10 partecipanti',
      requiresApproval: false,
      onlyReliableUsers: false,
      minReliabilityScore: null,
      creatorId: null,
      registrationLabel: 'Iscrizione libera',
      statusLabel: 'Aperta',
      status: 'OPEN',
      roles: [
        {
          label: 'Portieri',
          value: '0/2',
          icon: 'shield-checkmark-outline',
          danger: true,
        },
        {
          label: 'Difensori',
          value: '0',
          icon: 'shirt-outline',
        },
        {
          label: 'Centrocampisti',
          value: '0',
          icon: 'football-outline',
        },
        {
          label: 'Attaccanti',
          value: '0',
          icon: 'football-outline',
        },
      ],
      warnings: [
        {
          title: 'Partita disponibile',
          description: 'Puoi partecipare se ci sono posti liberi.',
          type: 'warning',
        },
      ],
      duration: '90 minuti',
      fieldType: 'Sintetico indoor',
      changingRooms: 'Sì',
      parking: 'Sì',
      description:
        'Partita amatoriale. Rispetto, puntualità e spirito di squadra sono fondamentali.',
      organizerName: 'Organizzatore',
    };
  }
}
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  calendarOutline,
  chevronForwardOutline,
  footballOutline,
  informationCircleOutline,
  locationOutline,
  personAddOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';

import { UsersService } from '../../core/services/users.service';
import {
  CreateMatchRequest,
  MatchesService,
} from '../../core/services/matches.service';
import {
  SportsCenter,
  SportsCentersService,
} from '../../core/services/sports-centers.service';
import {
  FieldAvailability,
  FieldsService,
} from '../../core/services/fields.service';

type MatchType = '5vs5' | '6vs6' | '7vs7';
type MinReliabilityScore = 70 | 80 | 90;
type RegistrationMode = 'FREE' | 'APPROVAL';
type GuestRole = 'PORTIERE' | 'DIFENSORE' | 'CENTROCAMPISTA' | 'ATTACCANTE';

interface InitialGuestPlayer {
  id: number;
  name: string;
  preferredRole: GuestRole;
}

interface CreateMatchForm {
  date: string;
  time: string;
  type: MatchType;
  selectedFieldId: number | null;
  deposit: number;
  description: string;
  onlyReliableUsers: boolean;
  minReliabilityScore: MinReliabilityScore;
  registrationMode: RegistrationMode;
}

@Component({
  selector: 'app-create-match',
  templateUrl: './create-match.page.html',
  styleUrls: ['./create-match.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
})
export class CreateMatchPage {
  matchTypes: MatchType[] = ['5vs5', '6vs6', '7vs7'];

  depositOptions = [0, 5, 10, 15, 20];

  minReliabilityOptions: MinReliabilityScore[] = [70, 80, 90];

  registrationModeOptions: {
    value: RegistrationMode;
    label: string;
  }[] = [
    { value: 'FREE', label: 'Iscrizione libera' },
    { value: 'APPROVAL', label: 'Con approvazione' },
  ];

  guestRoleOptions: { value: GuestRole; label: string }[] = [
  { value: 'PORTIERE', label: 'Portiere' },
  { value: 'DIFENSORE', label: 'Difensore' },
  { value: 'CENTROCAMPISTA', label: 'Centrocampista' },
  { value: 'ATTACCANTE', label: 'Attaccante' },
];

initialGuests: InitialGuestPlayer[] = [];

guestName = '';
guestRole: GuestRole = 'DIFENSORE';

creatorPreferredRole: string | null = null;

  isPremium = false;
  isLoadingPremiumStatus = false;
  isPublishing = false;

  isLoadingSportsCenters = false;
  isLoadingFields = false;

  showSportsCenterSelector = false;
  showFieldSelector = false;

  selectedSportsCenterId: number | null = null;
  selectedSportsCenterLabel = '';

  successMessage = '';
  errorMessage = '';
  infoMessage = '';

  sportsCenters: SportsCenter[] = [];
  availableFields: FieldAvailability[] = [];

  form: CreateMatchForm = {
    date: this.getDefaultDate(),
    time: '21:00',
    type: '5vs5',
    selectedFieldId: null,
    deposit: 10,
    description: '',
    onlyReliableUsers: false,
    minReliabilityScore: 80,
    registrationMode: 'FREE',
  };

  constructor(
    private readonly router: Router,
    private readonly usersService: UsersService,
    private readonly matchesService: MatchesService,
    private readonly sportsCentersService: SportsCentersService,
    private readonly fieldsService: FieldsService
  ) {
    addIcons({
      arrowBackOutline,
      calendarOutline,
      chevronForwardOutline,
      footballOutline,
      informationCircleOutline,
      locationOutline,
      timeOutline,
      personAddOutline,
      trashOutline,
    });
  }

  ionViewWillEnter(): void {
    this.loadPremiumStatus();
    this.loadSportsCenters();
  }

  goBack(): void {
    this.router.navigateByUrl('/tabs/home');
  }

  loadPremiumStatus(): void {
    this.clearMessages();
    this.isLoadingPremiumStatus = true;

    this.usersService.getMe().subscribe({
      next: (response) => {
        this.isPremium = response.data.user.isPremium;
        this.creatorPreferredRole = response.data.user.preferredRole ?? null;
        this.isLoadingPremiumStatus = false;

        if (!this.isPremium) {
          this.form.onlyReliableUsers = false;
          this.form.registrationMode = 'FREE';
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoadingPremiumStatus = false;
        this.isPremium = false;
        this.form.onlyReliableUsers = false;
        this.form.registrationMode = 'FREE';

        this.infoMessage =
          error.error?.message ||
          'Non è stato possibile verificare lo stato Premium.';
      },
    });
  }

  loadSportsCenters(): void {
    this.isLoadingSportsCenters = true;

    this.sportsCentersService.getSportsCenters().subscribe({
      next: (response) => {
        this.sportsCenters = response.data;
        this.isLoadingSportsCenters = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoadingSportsCenters = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile caricare i centri sportivi.';
      },
    });
  }

  loadFieldsAvailability(): void {
    this.clearMessages();

    if (!this.selectedSportsCenterId) {
      this.availableFields = [];
      return;
    }

    const startsAt = this.buildStartsAt();

    if (!startsAt) {
      this.availableFields = [];
      this.errorMessage = 'Data o orario non validi.';
      return;
    }

    this.isLoadingFields = true;

    this.fieldsService
      .getFieldsAvailability({
        sportsCenterId: this.selectedSportsCenterId,
        startsAt,
        durationMinutes: 90,
      })
      .subscribe({
        next: (response) => {
          this.availableFields = response.data;
          this.isLoadingFields = false;

          const selectedField = this.availableFields.find(
            (field) => field.id === this.form.selectedFieldId
          );

          if (!selectedField || !this.isFieldSelectable(selectedField)) {
            this.form.selectedFieldId = null;
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isLoadingFields = false;

          this.errorMessage =
            error.error?.message ||
            'Non è stato possibile verificare la disponibilità dei campi.';
        },
      });
  }

  selectMatchType(type: MatchType): void {
    this.form.type = type;
    this.form.selectedFieldId = null;
    if (this.initialPlayersCount > this.getMaxPlayersByType(type)) {
  this.initialGuests = this.initialGuests.slice(
    0,
    this.getMaxPlayersByType(type) - 1
  );
}

    if (this.selectedSportsCenterId) {
      this.loadFieldsAvailability();
    }
  }

  onDateOrTimeChange(): void {
    this.form.selectedFieldId = null;

    if (this.selectedSportsCenterId) {
      this.loadFieldsAvailability();
    }
  }

  openNativePicker(input: HTMLInputElement): void {
    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (pickerInput.showPicker) {
      pickerInput.showPicker();
      return;
    }

    pickerInput.focus();
    pickerInput.click();
  }

  toggleSportsCenterSelector(): void {
    this.clearMessages();
    this.showSportsCenterSelector = !this.showSportsCenterSelector;
    this.showFieldSelector = false;
  }

  toggleFieldSelector(): void {
    this.clearMessages();

    if (!this.selectedSportsCenterId) {
      this.errorMessage = 'Prima seleziona un centro sportivo.';
      return;
    }

    this.showFieldSelector = !this.showFieldSelector;
    this.showSportsCenterSelector = false;

    if (this.showFieldSelector) {
      this.loadFieldsAvailability();
    }
  }

  selectSportsCenter(sportsCenter: SportsCenter): void {
    this.selectedSportsCenterId = sportsCenter.id;
    this.selectedSportsCenterLabel = sportsCenter.name;

    this.form.selectedFieldId = null;
    this.availableFields = [];

    this.showSportsCenterSelector = false;
    this.showFieldSelector = false;

    this.clearMessages();
    this.loadFieldsAvailability();
  }

  selectField(field: FieldAvailability): void {
    if (!this.isFieldSelectable(field)) {
      return;
    }

    this.form.selectedFieldId = field.id;
    this.showFieldSelector = false;
    this.clearMessages();
  }

  toggleReliableUsers(): void {
    this.clearMessages();

    if (!this.isPremium) {
      this.form.onlyReliableUsers = false;
      this.form.registrationMode = 'FREE';
      this.infoMessage =
        'Il filtro “Solo utenti affidabili” è una funzione Premium. Attivala per usarla nelle tue partite.';

      this.router.navigate(['/premium']);
      return;
    }

    this.form.onlyReliableUsers = !this.form.onlyReliableUsers;

    if (!this.form.onlyReliableUsers) {
      this.form.registrationMode = 'FREE';
    }
  }

  selectMinReliabilityScore(score: MinReliabilityScore): void {
    this.form.minReliabilityScore = score;
  }

  selectRegistrationMode(mode: RegistrationMode): void {
    this.form.registrationMode = mode;
  }
 addInitialGuest(): void {
  this.clearMessages();

  const trimmedName = this.guestName.trim();

  if (trimmedName.length < 2) {
    this.errorMessage = 'Inserisci il nome del giocatore.';
    return;
  }

  if (this.initialPlayersCount >= this.maxPlayersForSelectedType) {
    this.errorMessage =
      'Hai già raggiunto il numero massimo di giocatori per questa partita.';
    return;
  }

  const nextGoalkeepersCount =
    this.countInitialGoalkeepers() + (this.guestRole === 'PORTIERE' ? 1 : 0);

  if (nextGoalkeepersCount > 2) {
    this.errorMessage = 'Non puoi inserire più di 2 portieri nella partita.';
    return;
  }

  this.initialGuests = [
    ...this.initialGuests,
    {
      id: Date.now(),
      name: trimmedName,
      preferredRole: this.guestRole,
    },
  ];

  this.guestName = '';
  this.guestRole = 'DIFENSORE';
}

removeInitialGuest(guestId: number): void {
  this.initialGuests = this.initialGuests.filter((guest) => guest.id !== guestId);
  this.clearMessages();
}

getGuestRoleLabel(role: GuestRole): string {
  const option = this.guestRoleOptions.find((item) => item.value === role);

  return option?.label || role;
}

get maxPlayersForSelectedType(): number {
  return this.getMaxPlayersByType(this.form.type);
}

get initialPlayersCount(): number {
  return 1 + this.initialGuests.length;
}

get remainingSpotsAfterGuests(): number {
  return Math.max(this.maxPlayersForSelectedType - this.initialPlayersCount, 0);
}

private countInitialGoalkeepers(): number {
  let count = 0;

  if (this.creatorPreferredRole === 'PORTIERE') {
    count += 1;
  }

  count += this.initialGuests.filter(
    (guest) => guest.preferredRole === 'PORTIERE'
  ).length;

  return count;
}

  publishMatch(): void {
    this.clearMessages();

    if (this.isPublishing) {
      return;
    }

    if (!this.form.date) {
      this.errorMessage = 'Inserisci la data della partita.';
      return;
    }

    if (!this.form.time) {
      this.errorMessage = 'Inserisci l’orario della partita.';
      return;
    }

    if (!this.selectedSportsCenterId) {
      this.errorMessage = 'Seleziona un centro sportivo.';
      return;
    }

    if (!this.form.selectedFieldId) {
      this.errorMessage = 'Seleziona un campo disponibile.';
      return;
    }

    const selectedField = this.selectedField;

    if (!selectedField || !this.isFieldSelectable(selectedField)) {
      this.errorMessage =
        'Il campo selezionato non è disponibile per questa partita.';
      return;
    }

    const startsAt = this.buildStartsAt();

    if (!startsAt) {
      this.errorMessage = 'Data o orario non validi.';
      return;
    }

    const usesPremiumOptions =
      this.form.onlyReliableUsers ||
      this.form.registrationMode === 'APPROVAL';

    if (usesPremiumOptions && !this.isPremium) {
      this.errorMessage =
        'Solo gli utenti Premium possono usare le opzioni avanzate.';
      return;
    }
   
    if (this.initialPlayersCount > this.getMaxPlayersByType(this.form.type)) {
  this.errorMessage =
    'Hai inserito troppi giocatori già presenti per questo tipo di partita.';
  return; 
   }
    const body: CreateMatchRequest = {
      title: this.buildMatchTitle(),
      description: this.form.description || undefined,
      fieldId: this.form.selectedFieldId,
      startsAt,
      durationMinutes: 90,
      maxPlayers: this.getMaxPlayersByType(this.form.type),
      pricePerPlayer: this.getPricePerPlayer(),
      depositAmount: this.form.deposit,
      onlyReliableUsers: this.isPremium && this.form.onlyReliableUsers,
      

      ...(this.isPremium && this.form.onlyReliableUsers
        ? {
            minReliabilityScore: this.form.minReliabilityScore,
          }
        : {}),

      requiresApproval:
        this.isPremium &&
        this.form.onlyReliableUsers &&
        this.form.registrationMode === 'APPROVAL',

        guests: this.initialGuests.map((guest) => ({
  name: guest.name,
  preferredRole: guest.preferredRole,
})),
    };

    this.isPublishing = true;

    this.matchesService.createMatch(body).subscribe({
      next: () => {
        this.isPublishing = false;
        this.successMessage = 'Partita pubblicata con successo.';

        setTimeout(() => {
          this.router.navigate(['/tabs/home']);
        }, 900);
      },
      error: (error: HttpErrorResponse) => {
        this.isPublishing = false;

        this.errorMessage =
          error.error?.message ||
          'Non è stato possibile pubblicare la partita. Riprova tra poco.';
      },
    });
  }

  get descriptionLength(): number {
    return this.form.description.length;
  }

  get selectedField(): FieldAvailability | null {
    return (
      this.availableFields.find((field) => field.id === this.form.selectedFieldId) ||
      null
    );
  }

  get selectedFieldLabel(): string {
    if (!this.selectedField) {
      return '';
    }

    return `${this.selectedField.name} · ${this.normalizeFieldSize(
      this.selectedField.size
    )}`;
  }

  get compatibleFields(): FieldAvailability[] {
    return this.availableFields.filter((field) => {
      return this.normalizeFieldSize(field.size) === this.form.type;
    });
  }

  isFieldSelectable(field: FieldAvailability): boolean {
    const hasCorrectSize = this.normalizeFieldSize(field.size) === this.form.type;

    return field.isAvailable && hasCorrectSize;
  }

  getFieldAvailabilityLabel(field: FieldAvailability): string {
    if (this.normalizeFieldSize(field.size) !== this.form.type) {
      return `Non compatibile con ${this.form.type}`;
    }

    if (!field.isAvailable) {
      return field.unavailableReason || 'Campo occupato in questo orario';
    }

    return 'Disponibile';
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.infoMessage = '';
  }

  private getDefaultDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tomorrow.toISOString().slice(0, 10);
  }

  private buildStartsAt(): string | null {
    const startsAt = new Date(`${this.form.date}T${this.form.time}:00`);

    if (Number.isNaN(startsAt.getTime())) {
      return null;
    }

    return startsAt.toISOString();
  }

  private getMaxPlayersByType(type: MatchType): number {
    if (type === '5vs5') {
      return 10;
    }

    if (type === '6vs6') {
      return 12;
    }

    return 14;
  }

  private getPricePerPlayer(): number {
    return this.form.deposit;
  }

  private buildMatchTitle(): string {
    return `Partita ${this.form.type}`;
  }

  private normalizeFieldSize(size: string): MatchType {
    const normalizedSize = size.trim().toLowerCase();

    if (normalizedSize === '5v5' || normalizedSize === '5vs5') {
      return '5vs5';
    }

    if (normalizedSize === '6v6' || normalizedSize === '6vs6') {
      return '6vs6';
    }

    if (normalizedSize === '7v7' || normalizedSize === '7vs7') {
      return '7vs7';
    }

    return this.form.type;
  }
}
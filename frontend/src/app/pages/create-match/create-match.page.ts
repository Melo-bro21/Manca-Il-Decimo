import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, calendarOutline, chevronForwardOutline, footballOutline,
  informationCircleOutline, locationOutline, personAddOutline, timeOutline, trashOutline,
} from 'ionicons/icons';

import { UsersService } from '../../core/services/users.service';
import { CreateMatchRequest, MatchesService } from '../../core/services/matches.service';
import { SportsCenter, SportsCentersService } from '../../core/services/sports-centers.service';
import { FieldAvailability, FieldsService } from '../../core/services/fields.service';

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

  registrationModeOptions: { value: RegistrationMode; label: string }[] = [
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
    deposit: 0, 
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
    addIcons({ arrowBackOutline, calendarOutline, chevronForwardOutline, footballOutline, informationCircleOutline, locationOutline, timeOutline, personAddOutline, trashOutline });
  }

  ionViewWillEnter(): void { this.loadPremiumStatus(); this.loadSportsCenters(); }
  goBack(): void { this.router.navigateByUrl('/tabs/home'); }

  loadPremiumStatus(): void {
    this.clearMessages();
    this.isLoadingPremiumStatus = true;
    this.usersService.getMe().subscribe({
      next: (response) => {
        this.isPremium = response.data.user.isPremium;
        this.creatorPreferredRole = response.data.user.preferredRole ?? null;
        this.isLoadingPremiumStatus = false;
      },
      error: () => { this.isLoadingPremiumStatus = false; this.isPremium = false; }
    });
  }

  loadSportsCenters(): void {
    this.isLoadingSportsCenters = true;
    this.sportsCentersService.getSportsCenters().subscribe({
      next: (response) => { this.sportsCenters = response.data; this.isLoadingSportsCenters = false; },
      error: () => { this.isLoadingSportsCenters = false; }
    });
  }

  loadFieldsAvailability(): void {
    if (!this.selectedSportsCenterId) { this.availableFields = []; return; }
    const startsAt = this.buildStartsAt();
    if (!startsAt) return;
    this.isLoadingFields = true;
    this.fieldsService.getFieldsAvailability({ sportsCenterId: this.selectedSportsCenterId, startsAt, durationMinutes: 90 }).subscribe({
      next: (response) => { this.availableFields = response.data; this.isLoadingFields = false; },
      error: () => { this.isLoadingFields = false; }
    });
  }

  selectMatchType(type: MatchType): void { this.form.type = type; this.form.selectedFieldId = null; if (this.selectedSportsCenterId) this.loadFieldsAvailability(); }
  onDateOrTimeChange(): void { this.form.selectedFieldId = null; if (this.selectedSportsCenterId) this.loadFieldsAvailability(); }
  
  openNativePicker(input: HTMLInputElement): void {
    const p = input as any;
    if (p.showPicker) p.showPicker(); else { input.focus(); input.click(); }
  }

  toggleSportsCenterSelector(): void { this.showSportsCenterSelector = !this.showSportsCenterSelector; this.showFieldSelector = false; }
  toggleFieldSelector(): void { if (!this.selectedSportsCenterId) return; this.showFieldSelector = !this.showFieldSelector; this.showSportsCenterSelector = false; if (this.showFieldSelector) this.loadFieldsAvailability(); }
  
  selectSportsCenter(s: SportsCenter): void { this.selectedSportsCenterId = s.id; this.selectedSportsCenterLabel = s.name; this.form.selectedFieldId = null; this.showSportsCenterSelector = false; this.loadFieldsAvailability(); }
  selectField(f: FieldAvailability): void { this.form.selectedFieldId = f.id; this.showFieldSelector = false; }
  
  toggleReliableUsers(): void {
    if (!this.isPremium) { this.router.navigate(['/premium']); return; }
    this.form.onlyReliableUsers = !this.form.onlyReliableUsers;
    if (!this.form.onlyReliableUsers) this.form.registrationMode = 'FREE';
  }

  selectMinReliabilityScore(s: MinReliabilityScore): void { this.form.minReliabilityScore = s; }
  selectRegistrationMode(m: RegistrationMode): void { this.form.registrationMode = m; }
  
  addInitialGuest(): void {
    if (this.guestName.trim().length < 2) return;
    this.initialGuests = [...this.initialGuests, { id: Date.now(), name: this.guestName.trim(), preferredRole: this.guestRole }];
    this.guestName = '';
  }

  removeInitialGuest(id: number): void { this.initialGuests = this.initialGuests.filter(g => g.id !== id); }
  getGuestRoleLabel(role: GuestRole): string { return this.guestRoleOptions.find(i => i.value === role)?.label || role; }

  get maxPlayersForSelectedType(): number { return this.getMaxPlayersByType(this.form.type); }
  get initialPlayersCount(): number { return 1 + this.initialGuests.length; }
  get remainingSpotsAfterGuests(): number { return Math.max(this.maxPlayersForSelectedType - this.initialPlayersCount, 0); }
  
  publishMatch(): void {
    this.clearMessages();
    if (this.isPublishing) return;
    const startsAt = this.buildStartsAt();
    if (!startsAt) { this.errorMessage = 'Data/Ora invalidi'; return; }
    
    const body: CreateMatchRequest = {
      title: `Partita ${this.form.type}`,
      description: this.form.description || undefined,
      fieldId: this.form.selectedFieldId!,
      startsAt,
      durationMinutes: 90,
      maxPlayers: this.maxPlayersForSelectedType,
      pricePerPlayer: 0,
      depositAmount: 0, // <--- FIX: aggiunto qui per soddisfare l'interfaccia
      onlyReliableUsers: this.isPremium && this.form.onlyReliableUsers,
      ...(this.isPremium && this.form.onlyReliableUsers ? { minReliabilityScore: this.form.minReliabilityScore } : {}),
      requiresApproval: this.isPremium && this.form.onlyReliableUsers && this.form.registrationMode === 'APPROVAL',
      guests: this.initialGuests.map((g) => ({ name: g.name, preferredRole: g.preferredRole })),
    };

    this.isPublishing = true;
    this.matchesService.createMatch(body).subscribe({
      next: () => { this.isPublishing = false; this.successMessage = 'Pubblicata!'; setTimeout(() => this.router.navigate(['/tabs/home']), 900); },
      error: (e) => { this.isPublishing = false; this.errorMessage = e.error?.message || 'Errore.'; }
    });
  }

  // GETTERS & HELPERS (Pubblici per l'HTML)
  get descriptionLength(): number { return this.form.description.length; }
  
  get selectedField(): FieldAvailability | null { 
    return this.availableFields.find(f => f.id === this.form.selectedFieldId) || null; 
  }
  
  get selectedFieldLabel(): string { 
    return this.selectedField ? `${this.selectedField.name}` : ''; 
  }
  
  get compatibleFields(): FieldAvailability[] { 
    return this.availableFields.filter(f => this.normalizeFieldSize(f.size) === this.form.type); 
  }
  
  isFieldSelectable(field: FieldAvailability): boolean { 
    return field.isAvailable && this.normalizeFieldSize(field.size) === this.form.type; 
  }
  
  getFieldAvailabilityLabel(field: FieldAvailability): string { 
    return field.isAvailable ? 'Disponibile' : 'Occupato'; 
  }

  private clearMessages(): void { this.successMessage = ''; this.errorMessage = ''; this.infoMessage = ''; }
  private getDefaultDate(): string { const t = new Date(); t.setDate(t.getDate() + 1); return t.toISOString().slice(0, 10); }
  private buildStartsAt(): string | null { const d = new Date(`${this.form.date}T${this.form.time}:00`); return isNaN(d.getTime()) ? null : d.toISOString(); }
  private getMaxPlayersByType(type: MatchType): number { return type === '5vs5' ? 10 : (type === '6vs6' ? 12 : 14); }
  private normalizeFieldSize(size: string): MatchType { const s = size.trim().toLowerCase(); return s.includes('5') ? '5vs5' : (s.includes('6') ? '6vs6' : '7vs7'); }
}
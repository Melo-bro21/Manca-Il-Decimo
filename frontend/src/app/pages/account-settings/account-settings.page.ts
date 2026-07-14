import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  callOutline,
  lockClosedOutline,
  mailOutline,
  personOutline,
  walkOutline,
} from 'ionicons/icons';

import {
  PreferredRole,
  UsersService,
} from '../../core/services/users.service';

interface AccountSettingsForm {
  name: string;
  email: string;
  phone: string;
  preferredRole: PreferredRole;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.page.html',
  styleUrls: ['./account-settings.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
})
export class AccountSettingsPage implements OnInit, AfterViewInit {
  @ViewChild('phoneField')
  private readonly phoneField?: ElementRef<HTMLElement>;

  @ViewChild('phoneInput')
  private readonly phoneInput?: ElementRef<HTMLInputElement>;

  @ViewChild('preferredRoleField')
  private readonly preferredRoleField?: ElementRef<HTMLElement>;

  @ViewChild('preferredRoleSelect')
  private readonly preferredRoleSelect?: ElementRef<HTMLSelectElement>;

  form: AccountSettingsForm = {
    name: '',
    email: '',
    phone: '',
    preferredRole: 'ATTACCANTE',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  preferredRoleOptions: { value: PreferredRole; label: string }[] = [
    { value: 'PORTIERE', label: 'Portiere' },
    { value: 'DIFENSORE', label: 'Difensore' },
    { value: 'CENTROCAMPISTA', label: 'Centrocampista' },
    { value: 'ATTACCANTE', label: 'Attaccante' },
  ];

  isLoadingProfile = false;
  isSaving = false;

  successMessage = '';
  errorMessage = '';

  showPhoneRequiredError = false;
  highlightPreferredRole = false;

  private readonly shouldFocusPreferredRole: boolean;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly usersService: UsersService
  ) {
    addIcons({
      arrowBackOutline,
      callOutline,
      lockClosedOutline,
      mailOutline,
      personOutline,
      walkOutline,
    });

    this.shouldFocusPreferredRole =
      this.route.snapshot.queryParamMap.get('focus') === 'preferredRole';
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  ngAfterViewInit(): void {
    this.focusPreferredRoleIfRequested();
  }

  get isPhoneMissing(): boolean {
    return !this.form.phone.trim();
  }

  goBack(): void {
    this.router.navigate(['/tabs/profile']);
  }

  loadProfile(): void {
    this.clearMessages();
    this.isLoadingProfile = true;

    this.usersService.getMe().subscribe({
      next: (response) => {
        const user = response.data.user;

        this.form.name = user.name ?? '';
        this.form.email = user.email;
        this.form.phone = user.phone ?? '';
        this.form.preferredRole = user.preferredRole ?? 'ATTACCANTE';

        this.showPhoneRequiredError = this.isPhoneMissing;
        this.isLoadingProfile = false;

        this.focusPreferredRoleIfRequested();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoadingProfile = false;
        this.errorMessage = this.getErrorMessage(
          error,
          'Impossibile caricare i dati dell’account.'
        );
      },
    });
  }

  saveChanges(): void {
    this.clearMessages();

    if (this.isSaving) {
      return;
    }

    if (!this.form.name.trim()) {
      this.errorMessage = 'Inserisci il nome.';
      return;
    }

    if (!this.form.email.trim()) {
      this.errorMessage = 'Inserisci l’email.';
      return;
    }

    if (this.isPhoneMissing) {
      this.showPhoneRequiredError = true;
      this.errorMessage =
        'Inserisci il numero di telefono: è obbligatorio per salvare le modifiche.';
      this.focusPhoneField();
      return;
    }

    const normalizedPhone = this.normalizePhone(this.form.phone);

    if (!this.isValidPhone(normalizedPhone)) {
      this.showPhoneRequiredError = true;
      this.errorMessage =
        'Inserisci un numero di telefono valido. Puoi usare solo numeri, eventualmente con prefisso +39.';
      this.focusPhoneField();
      return;
    }

    const wantsToChangePassword =
      this.form.currentPassword ||
      this.form.newPassword ||
      this.form.confirmPassword;

    if (wantsToChangePassword) {
      if (
        !this.form.currentPassword ||
        !this.form.newPassword ||
        !this.form.confirmPassword
      ) {
        this.errorMessage =
          'Per cambiare password, compila tutti i campi della sezione Sicurezza.';
        return;
      }

      if (this.form.newPassword.length < 8) {
        this.errorMessage =
          'La nuova password deve contenere almeno 8 caratteri.';
        return;
      }

      if (this.form.newPassword !== this.form.confirmPassword) {
        this.errorMessage = 'La nuova password e la conferma non coincidono.';
        return;
      }
    }

    this.isSaving = true;

    this.usersService
      .updateMe({
        name: this.form.name.trim(),
        email: this.form.email.trim(),
        phone: normalizedPhone,
        preferredRole: this.form.preferredRole,
      })
      .subscribe({
        next: () => {
          if (wantsToChangePassword) {
            this.savePassword();
            return;
          }

          this.isSaving = false;
          this.successMessage = 'Dati account aggiornati correttamente.';
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Impossibile aggiornare i dati dell’account.'
          );
        },
      });
  }

  cancel(): void {
    if (this.isSaving) {
      return;
    }

    this.goBack();
  }

  onPhoneChange(): void {
    this.form.phone = this.form.phone.replace(/[^\d+\s().-]/g, '');

    if (!this.isPhoneMissing) {
      this.showPhoneRequiredError = false;
    }
  }

  private savePassword(): void {
    this.usersService
      .changePassword({
        currentPassword: this.form.currentPassword,
        newPassword: this.form.newPassword,
        confirmPassword: this.form.confirmPassword,
      })
      .subscribe({
        next: () => {
          this.isSaving = false;

          this.form.currentPassword = '';
          this.form.newPassword = '';
          this.form.confirmPassword = '';

          this.successMessage =
            'Dati account e password aggiornati correttamente.';
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving = false;
          this.errorMessage = this.getErrorMessage(
            error,
            'Dati account aggiornati, ma non è stato possibile cambiare la password.'
          );
        },
      });
  }

  private focusPhoneField(): void {
    setTimeout(() => {
      this.phoneField?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      this.phoneInput?.nativeElement.focus();
    });
  }

  private focusPreferredRoleIfRequested(): void {
    if (!this.shouldFocusPreferredRole || this.isLoadingProfile) {
      return;
    }

    setTimeout(() => {
      this.highlightPreferredRole = true;

      this.preferredRoleField?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      this.preferredRoleSelect?.nativeElement.focus();

      setTimeout(() => {
        this.highlightPreferredRole = false;
      }, 2200);
    });
  }

  private normalizePhone(value: string): string {
    return value.trim().replace(/[\s().-]/g, '');
  }

  private isValidPhone(value: string): boolean {
    return /^(\+39)?\d{8,15}$/.test(value);
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private getErrorMessage(
    error: HttpErrorResponse,
    fallbackMessage: string
  ): string {
    return error.error?.message || fallbackMessage;
  }
}
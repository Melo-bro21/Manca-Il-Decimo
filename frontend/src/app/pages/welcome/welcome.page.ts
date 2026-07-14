import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: true,
  imports: [IonContent],
})
export class WelcomePage {
  constructor(
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  continueAsGuest(): void {
    this.authService.logout();

    this.router.navigateByUrl('/tabs/home', {
      replaceUrl: true,
    });
  }
}
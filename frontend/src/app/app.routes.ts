import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },

  {
    path: 'welcome',
    loadComponent: () =>
      import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then(
        (m) => m.ResetPasswordPage
      ),
  },

  {
    path: 'tabs',
    loadComponent: () =>
      import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'my-matches',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/my-matches/my-matches.page').then(
            (m) => m.MyMatchesPage
          ),
      },
      {
        path: 'create-match',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/create-match/create-match.page').then(
            (m) => m.CreateMatchPage
          ),
      },
      {
        path: 'find-field',
        loadComponent: () =>
          import('./pages/find-field/find-field.page').then(
            (m) => m.FindFieldPage
          ),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },
    ],
  },

  {
    path: 'home',
    redirectTo: 'tabs/home',
    pathMatch: 'full',
  },
  {
    path: 'my-matches',
    redirectTo: 'tabs/my-matches',
    pathMatch: 'full',
  },
  {
    path: 'create-match',
    redirectTo: 'tabs/create-match',
    pathMatch: 'full',
  },
  {
    path: 'find-field',
    redirectTo: 'tabs/find-field',
    pathMatch: 'full',
  },
  {
    path: 'profile',
    redirectTo: 'tabs/profile',
    pathMatch: 'full',
  },

  {
    path: 'matches/:id',
    loadComponent: () =>
      import('./pages/match-detail/match-detail.page').then(
        (m) => m.MatchDetailPage
      ),
  },

  {
    path: 'checkout/:matchId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/checkout/checkout.page').then((m) => m.CheckoutPage),
  },
  {
    path: 'wallet',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/wallet/wallet.page').then((m) => m.WalletPage),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/notifications/notifications.page').then(
        (m) => m.NotificationsPage
      ),
  },
  {
    path: 'account-settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/account-settings/account-settings.page').then(
        (m) => m.AccountSettingsPage
      ),
  },
  {
    path: 'premium',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/premium/premium.page').then((m) => m.PremiumPage),
  },
  {
    path: 'matches/:id/requests',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/match-requests/match-requests.page').then(
        (m) => m.MatchRequestsPage
      ),
  },
  {
    path: 'matches/:id/participants',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/match-participants/match-participants.page').then(
        (m) => m.MatchParticipantsPage
      ),
  },

  {
  path: 'matches/:id/manage',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./pages/match-management/match-management.page').then(
      (m) => m.MatchManagementPage
    ),
},

{
  path: 'admin',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./pages/admin-dashboard/admin-dashboard.page').then(
      (m) => m.AdminDashboardPage
    ),
},

  {
    path: '**',
    redirectTo: 'welcome',
  },
];
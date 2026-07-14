import { Injectable } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
// Verifica che questo percorso sia corretto rispetto alla posizione del file
import { environment } from '../../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private stripePromise: Promise<Stripe | null>;

  constructor() {
    // Carica Stripe usando la tua chiave pubblica
    this.stripePromise = loadStripe('pk_test_LA_TUA_CHIAVE_PUBBLICA_QUI');
  }

  async getStripe() {
    return await this.stripePromise;
  }
}
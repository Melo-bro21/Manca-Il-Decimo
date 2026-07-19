import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MatchCardData } from '../../models/match-card.model';

@Component({
  selector: 'app-match-card',
  templateUrl: './match-card.component.html',
  styleUrls: ['./match-card.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class MatchCardComponent {
  @Input({ required: true }) match!: MatchCardData;

  @Output() cardClick = new EventEmitter<number>();

  onCardClick(): void {
    this.cardClick.emit(this.match.id);
  }
}
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { JarvisApiService } from '../../services/jarvis-api.service';
import { IdentifyRequirementsResponse } from '../../models/ai-requirements.model';

@Component({
  selector: 'app-ai-requirements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-requirements.component.html',
})
export class AiRequirementsComponent {
  solicitud = '';

  result: IdentifyRequirementsResponse | null = null;

  isLoading = false;
  errorMessage = '';

  constructor(private readonly jarvisApi: JarvisApiService) {}

  analyze(): void {
    const text = this.solicitud.trim();

    if (!text) {
      this.errorMessage = 'Escribe una solicitud para analizar.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.result = null;

    this.jarvisApi
      .identifyRequirements({
        solicitud: text,
        usuario_id: 'user_001',
        cliente_id: 'cliente_001',
      })
      .subscribe({
        next: (response) => {
          this.result = response;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error identificando requisitos:', error);
          this.errorMessage = 'No se pudieron identificar los requisitos.';
          this.isLoading = false;
        },
      });
  }

  confidencePercent(): number {
    return Math.round((this.result?.confianza || 0) * 100);
  }
}
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { JarvisApiService } from '../../services/jarvis-api.service';
import { ClassifyResponse } from '../../models/ai-classification.model';

@Component({
  selector: 'app-ai-classification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-classification.component.html',
})
export class AiClassificationComponent {
  solicitud = '';
  result: ClassifyResponse | null = null;

  isLoading = false;
  errorMessage = '';

  constructor(private readonly jarvisApi: JarvisApiService) {}

  classify(): void {
    const text = this.solicitud.trim();

    if (!text) {
      this.errorMessage = 'Escribe una solicitud para clasificar.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.result = null;

    this.jarvisApi
      .classifyRequest({
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
          console.error('Error clasificando solicitud:', error);
          this.errorMessage = 'No se pudo clasificar la solicitud.';
          this.isLoading = false;
        },
      });
  }

  confidencePercent(): number {
    return Math.round((this.result?.confianza || 0) * 100);
  }

  getPriorityClass(priority: string): string {
    const classes: Record<string, string> = {
      BAJA: 'border-slate-400/40 text-slate-300 bg-slate-400/10',
      MEDIA: 'border-blue-400/40 text-blue-300 bg-blue-400/10',
      ALTA: 'border-orange-400/40 text-orange-300 bg-orange-400/10',
      URGENTE: 'border-red-400/40 text-red-300 bg-red-400/10',
    };

    return classes[priority] || 'border-slate-400/40 text-slate-300 bg-slate-400/10';
  }

  getHumanReviewClass(required: boolean): string {
    return required
      ? 'border-orange-400/40 text-orange-300 bg-orange-400/10'
      : 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10';
  }
}
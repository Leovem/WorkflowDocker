import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { AiReportInterpreterComponent } from '../../../Inteligencia_y_Comunicacion/components/ai-report-interpreter/ai-report-interpreter.component';

@Component({
  selector: 'app-ai-document-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    AiReportInterpreterComponent,
  ],
  templateUrl: './ai-document-reports-page.component.html',
})
export class AiDocumentReportsPageComponent {}
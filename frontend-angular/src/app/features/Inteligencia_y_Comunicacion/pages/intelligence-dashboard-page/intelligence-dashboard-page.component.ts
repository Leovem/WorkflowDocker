import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { AiRequirementsComponent } from '../../components/ai-requirements/ai-requirements.component';
import { AiClassificationComponent } from '../../components/ai-classification/ai-classification.component';
import { AiReportInterpreterComponent } from '../../components/ai-report-interpreter/ai-report-interpreter.component';

@Component({
  selector: 'app-intelligence-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    AiRequirementsComponent,
    AiClassificationComponent,
    AiReportInterpreterComponent,
  ],
  templateUrl: './intelligence-dashboard-page.component.html',
})
export class IntelligenceDashboardPageComponent {
  activeTab: 'requirements' | 'classification' | 'reports' = 'requirements';

  setActiveTab(tab: 'requirements' | 'classification' | 'reports'): void {
    this.activeTab = tab;
  }
}
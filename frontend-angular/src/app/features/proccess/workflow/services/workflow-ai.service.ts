import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatMessage1, CopilotService } from './copilot.service';

@Injectable({
  providedIn: 'root',
})
export class WorkflowAiService {
  constructor(private readonly copilotService: CopilotService) {}

  askJarvis(prompt: string, diagramSnapshot: any): Observable<ChatMessage1> {
    return this.copilotService.askJarvis(prompt, diagramSnapshot);
  }

  buildOnboardingPrompt(): string {
    return `[SYSTEM: INICIAR_ONBOARDING] El usuario ha entrado al editor. Preséntate como Jarvis, dale la bienvenida e invítalo a diseñar su flujo BPMN.`;
  }

  buildDiagramInstructionPrompt(userPrompt: string): string {
    return `[SYSTEM: EDITAR_DIAGRAMA] ${userPrompt}`;
  }

  buildNormalizePrompt(): string {
    return `[SYSTEM: NORMALIZAR_DIAGRAMA] Revisa el diagrama actual y sugiere correcciones de estructura, nombres, calles y conexiones.`;
  }

  buildAnalyzePrompt(): string {
    return `[SYSTEM: ANALIZAR_DIAGRAMA] Analiza el diagrama actual, detecta problemas de estructura, posibles cuellos de botella, nodos sin responsable, conexiones incorrectas y mejoras recomendadas.`;
  }
}
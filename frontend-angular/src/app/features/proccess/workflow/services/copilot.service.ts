import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

// Definimos la estructura según tu modelo.py
export interface ChatMessage1 {
  role: 'user' | 'assistant';
  content: string;
  hasAction?: boolean;
  actionPayload?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CopilotService {
  // URL de tu servidor FastAPI (ia.py)
  private readonly API_URL = `${environment.iaApiUrl}/copilot/ask`;

  constructor(private http: HttpClient) {}

  /**
   * Envía el prompt y el estado del diagrama a Jarvis
   */
  askJarvis(prompt: string, diagram: any): Observable<ChatMessage1> {
    const body = {
      prompt: prompt,
      currentDiagram: diagram
    };
    return this.http.post<ChatMessage1>(this.API_URL, body);
  }
}
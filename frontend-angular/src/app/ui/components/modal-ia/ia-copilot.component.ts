import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  hasAction?: boolean;
  actionPayload?: any;
}

// Declaramos la variable global para la API de dictado del navegador
declare var webkitSpeechRecognition: any;

@Component({
  selector: 'app-ai-copilot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ia-copilot.component.html'
})
export class AiCopilotComponent implements OnInit, OnDestroy {
  @Input() isAiTyping: boolean = false;
  @Input() chatMessages: ChatMessage[] = [];

  @Output() closePanel = new EventEmitter<void>();
  @Output() sendMessage = new EventEmitter<string>();
  @Output() applySuggestion = new EventEmitter<any>();

  userPrompt: string = '';
  
  // 🎙️ Variables para el control de voz
  isRecording: boolean = false;
  recognition: any;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.initSpeechRecognition();
  }

  ngOnDestroy() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }

  // 🎙️ Inicializa el motor de escucha
  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false; // Se detiene cuando haces una pausa
      this.recognition.interimResults = true; // Muestra lo que vas diciendo en tiempo real
      this.recognition.lang = 'es-ES'; // Idioma Español

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Si ya terminó la frase, la agregamos al input
        if (finalTranscript) {
          this.userPrompt += (this.userPrompt ? ' ' : '') + finalTranscript;
          this.cdr.detectChanges();
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error("Error en el micrófono:", event.error);
        this.isRecording = false;
        this.cdr.detectChanges();
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.cdr.detectChanges();
      };
    } else {
      console.warn("La API de reconocimiento de voz no está soportada en este navegador.");
    }
  }

  // 🎙️ Activa o apaga el micrófono
  toggleRecording() {
    if (!this.recognition) {
      alert("Tu navegador no soporta el reconocimiento de voz (Usa Chrome o Edge).");
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
    } else {
      this.recognition.start();
      this.isRecording = true;
    }
  }

  cerrar() {
    this.closePanel.emit();
  }

  enviarMensaje() {
    if (!this.userPrompt.trim()) return;
    this.sendMessage.emit(this.userPrompt);
    this.userPrompt = ''; 
  }

  preguntarRapido(prompt: string) {
    this.sendMessage.emit(prompt);
  }

  aplicarCambios(payload: any) {
    this.applySuggestion.emit(payload);
  }
}
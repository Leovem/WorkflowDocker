import { Injectable, NgZone } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Subject, BehaviorSubject, Observable} from 'rxjs';
import { environment } from '../../../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class VoiceService {
  private recognition: any;
  public transcript$ = new Subject<string>();
  public isListening = false;

  private apiUrl = environment.iaApiUrl;
  public isProcessing$ = new BehaviorSubject<boolean>(false);

  constructor(private zone: NgZone, private http: HttpClient) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES'; // Español
      this.recognition.continuous = true; // Se detiene al hacer pausa
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        this.zone.run(() => this.transcript$.next(text));
      };

      this.recognition.onend = () => {
        this.zone.run(() => this.isListening = false);
      };

      this.recognition.onerror = (event: any) => {
        console.warn("⚠️ Error de micrófono:", event.error);
        
        // Manejo de errores específicos
        if (event.error === 'not-allowed') {
          alert("Debes dar permiso al navegador para usar el micrófono.");
        } else if (event.error === 'network') {
          alert("Error de red 🌐: El dictado por voz requiere conexión a internet. Por favor, revisa tu conexión o desactiva tu VPN.");
        } else if (event.error === 'no-speech') {
          // Si el usuario presiona y no dice nada, simplemente lo apagamos en silencio
          console.log("No se detectó voz.");
        } else {
          alert("El micrófono se detuvo inesperadamente. Intenta nuevamente.");
        }

        // Siempre apagamos el estado visual de "Escuchando..."
        this.zone.run(() => this.isListening = false);
      };

    } else {
      console.warn("El navegador no soporta Web Speech API.");
    }
  }

  
  startListening() {
    if (!this.recognition) return alert("Tu navegador no soporta dictado por voz.");
    this.isListening = true;
    this.recognition.start();
  }
  

/*
startListening() {
    this.isListening = true;

    // ==========================================
    // 🛠️ MODO PRUEBA LOCAL (Borrar en producción)
    // ==========================================
    console.log("🎙️ MODO PRUEBA: Simulando que el usuario está hablando...");
    
    setTimeout(() => {
      // Simulamos lo que el funcionario diría por voz
      const textoSimulado = "una de las observaciones mas grandes esque la laptop esta dañado y no tiene reparo, la decion tecnica es aprobar, el usuario o cliente es juan perez que viene en santa cruz, que tiene un abance tecnologico de punto en ciber e ia.";
      
      console.log("✅ Audio simulado terminado. Texto capturado:", textoSimulado);
      
      this.stopListening();
      
      // Enviamos el texto al componente (lo que dispara a Jarvis en FastAPI)
      this.zone.run(() => this.transcript$.next(textoSimulado));
    }, 3000); // 3 segundos de "grabación"
  }
*/



  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }


  public smartFill(transcription: string, fieldNames: string[]): Observable<any> {
    this.isProcessing$.next(true);

    console.log("enviando texto al agente.", transcription)
    return this.http.post(`${this.apiUrl}/jarvis/smart-fill`, {
        transcription: transcription,
        fields: fieldNames
    })

  }
}
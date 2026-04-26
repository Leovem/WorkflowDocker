import { Component } from '@angular/core';
import { Auth } from '../../../../core/services/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../../../../ui/components/input/input';
import { ButtonComponent } from '../../../../ui/components/button/button';
import { SseService } from '../../../motor/funcionario/service/sse.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputComponent,
    ButtonComponent
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  credentials = { name: '', passwordHash: '' };
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private auth: Auth, private router: Router, private sseService: SseService) { }

  signIn(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.credentials.name || !this.credentials.passwordHash) {
      this.errorMessage = 'Por favor, completa todos los campos.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = ''; // Limpiamos errores anteriores

    this.auth.login(this.credentials).subscribe({
      next: (res: any) => { // 💡 Asegúrate de ponerle ': any' o el tipo de tu interfaz de Login
        console.log('Login exitoso', res);
        this.isLoading = false;

        // =========================================================
        // 🚀 NUEVA LÓGICA SSE: Iniciar notificaciones si es Funcionario
        // =========================================================
        
        // 1. Extraemos los datos del payload de respuesta. 
        // (⚠️ Ajusta estos nombres si tu backend los devuelve diferente, ej: res.accessToken, res.rol)
        const token = res.token; 
        const role = res.role;
        const departamentId = res.departamentId;
        console.log('🎯 Datos del login - Role:', role, 'Department ID:', departamentId);

        // 2. Verificamos el rol antes de encender la antena
        if (role === 'Funcionario' || role === 'FUNCIONARIO') {
          if (departamentId && token) {
            this.sseService.connect(departamentId, token);
            console.log('📡 Antena SSE encendida para el departamento:', departamentId);
          } else {
            console.warn('⚠️ Es funcionario, pero el backend no devolvió el departmentId o el token.');
          }
        }
        // =========================================================

        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error de login:', err);

        // Intentamos leer el mensaje específico del servidor si existe,
        // de lo contrario usamos un mensaje genérico.
        if (err.status === 401 || err.status === 403) {
          this.errorMessage = "Usuario o contraseña incorrecta.";
        } else if (err.error && typeof err.error === 'string') {
          this.errorMessage = err.error; // Mensaje devuelto por Spring Security
        } else if (err.error && err.error.message) {
          this.errorMessage = err.error.message; // Mensaje estructurado
        } else {
          this.errorMessage = "Ocurrió un error al intentar acceder. Verifica tu conexión.";
        }

        // Limpiamos la contraseña por seguridad
        this.credentials.passwordHash = '';
      }
    });
  }
}
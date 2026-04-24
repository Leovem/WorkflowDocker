import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './ui/components/sidebar/sidebar';
import { Auth } from './core/services/auth';
import { SseService } from './features/motor/funcionario/service/sse.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('WorkFlow');

  router = inject(Router);
  auth = inject(Auth);
  sseService = inject(SseService);
  showSidebar = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const isLoginRoute = event.urlAfterRedirects === '/login' || event.url === '/login';
      // Checking isLoggedIn on navigation end is better for performance since getting auth decodes jwt
      this.showSidebar.set(!isLoginRoute && this.auth.isLoggedIn());
    });
  }

  // 🚀 NUEVO: Se ejecuta al cargar o recargar (F5) la aplicación
  ngOnInit() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role'); // Asegúrate de que esto se guarda en el Login
    const deptId = localStorage.getItem('departamentId');

    // Si hay sesión activa y es funcionario, reconectamos la antena silenciosamente
    if (token && deptId && (role === 'Funcionario' || role === 'FUNCIONARIO')) {
      console.log('🔄 Recuperando conexión SSE tras refrescar la página...');
      this.sseService.connect(deptId, token);
    }
  }
}

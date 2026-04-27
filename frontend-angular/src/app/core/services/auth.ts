import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  //private apiUrl = "http://localhost:8080/api/auth";
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => {
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", res.user); // guardamos nombre de usuario directo
        localStorage.setItem("role", res.role); // guardamos rol directo
        localStorage.setItem("department", res.departament); // guardamos id del departamento
        localStorage.setItem("departamentId", res.departamentId);
      })
    )
  }

  getToken(): string | null {
    return localStorage.getItem("token");
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Decodificamos el payload del JWT (la segunda parte entre los puntos)
      const payloadBase64 = token.split('.')[1];
      const payloadJson = window.atob(payloadBase64);
      const decodedPayload = JSON.parse(payloadJson);

      const currentTime = Math.floor(Date.now() / 1000);

      // Si el tiempo actual es menor a la expiración, la sesión sigue viva
      if (decodedPayload.exp && decodedPayload.exp < currentTime) {
        console.warn("Sesión expirada");
        this.logout();
        return false;
      }

      return true;
    } catch (e) {
      this.logout();
      return false;
    }
  }

  logout(): void {
    localStorage.clear();
    window.location.href = '/login';
  }

  getUserRole(): string | null {
    return localStorage.getItem("role");
  }

  hasAdminAccess(): boolean {
    const role = this.getUserRole();
    if (!role) return false;

    // Convertir a string y a mayusculas para estandarizar validacion
    const roleStr = String(role).toUpperCase();
    return roleStr === 'ROOT' || roleStr === 'ADMINISTRADOR';
  }

  hasReceptionistAccess(): boolean {
    const role = this.getUserRole();
    if (!role) return false;

    const roleStr = String(role).toUpperCase();
    return roleStr === 'RECEPCIONISTA';
  }


  hasFuncionarioAccess(): boolean {
    const role = this.getUserRole();
    if (!role) return false;

    const roleStr = String(role).toUpperCase();
    return roleStr === 'FUNCIONARIO';
  }

}

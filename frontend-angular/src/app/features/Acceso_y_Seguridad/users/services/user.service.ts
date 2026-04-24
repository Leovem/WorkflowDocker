import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role } from '../../roles/services/role.service';
import { Department } from '../../departments/services/department.service';

export interface User {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role?: Role;
  departamento?: Department;
  isActive?: boolean;
  active?: boolean;
}

export interface UserRequest {
  name: string;
  email: string;
  password?: string;
  roleId?: string;
  departamentoId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) { }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  createUser(user: UserRequest): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  updateUser(id: string, user: UserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    // Es un borrado lógico pero usa DELETE HTTP
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Policy } from '../models/policy.model';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private readonly apiUrl = 'http://localhost:8080';

    constructor(private http: HttpClient) { }

    getPoliticas(): Observable<Policy[]> {
        return this.http.get<Policy[]>(`${this.apiUrl}/api/policies`);
    }

    getPolitica(id: string): Observable<any> {
        return this.http.get<Policy>(`${this.apiUrl}/api/policies/${id}`);
    }

    sincronizarPolitica(payload: Policy): Observable<any> {
        if (payload.id) {
            return this.http.put(`${this.apiUrl}/api/policies/${payload.id}`, payload);
        } else {
            return this.http.post(`${this.apiUrl}/api/policies`, payload);
        }
    }

    eliminarPolitica(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/api/policies/${id}`);
    }

    procesarIA(payload: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/ia`, payload);
    }
}

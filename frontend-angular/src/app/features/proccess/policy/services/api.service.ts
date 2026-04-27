import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Policy } from '../models/policy.model';
import { environment } from '../../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    //private readonly apiUrl = 'http://localhost:8080';
    private readonly apiUrl = `${environment.apiUrl}`

    constructor(private http: HttpClient) { }

    getPoliticas(): Observable<Policy[]> {
        return this.http.get<Policy[]>(`${this.apiUrl}/policies`);
    }


    getPoliticasActivos(): Observable<Policy[]> {
        return this.http.get<Policy[]>(`${this.apiUrl}/policies/active`)
    }

    getPolitica(id: string): Observable<any> {
        return this.http.get<Policy>(`${this.apiUrl}/policies/${id}`);
    }

    sincronizarPolitica(payload: Policy): Observable<any> {
        if (payload.id) {
            return this.http.put(`${this.apiUrl}/policies/${payload.id}`, payload);
        } else {
            return this.http.post(`${this.apiUrl}/policies`, payload);
        }
    }

    eliminarPolitica(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/policies/${id}`);
    }

    procesarIA(payload: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/ia`, payload);
    }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
// 1. Importamos el environment
import { environment } from '../../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class InstanceService {
    // 2. Construimos la URL dinámicamente
    private apiUrl = `${environment.apiUrl}/instance`;

    constructor(private http: HttpClient) { }

    createInstance(data: any): Observable<any> {
        // 🚀 FORZAMOS EL FORMATO JSON ESTRÍCTO
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });

        // Enviamos la data con los headers explícitos
        return this.http.post(`${this.apiUrl}/start`, data, { headers });
    }


    getAllInstances(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/all`);
    }

    // 1. Usa /current-node pasándole el ID del DEPARTAMENTO
    getPendingTasks(departmentId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/${departmentId}/current-node`);
    }

    // 2. Usa /complete pasándole el ID de la INSTANCIA
    completeTask(instanceId: string, nodeId: string, formData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/${instanceId}/complete/${nodeId}`, formData);
    }


    // 🚀 NUEVO: Traer una instancia completa por su ID
    getInstanceById(id: string) {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }
}
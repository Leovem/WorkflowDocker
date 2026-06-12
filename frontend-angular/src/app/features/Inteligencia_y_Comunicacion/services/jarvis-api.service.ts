import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  IdentifyRequirementsRequest,
  IdentifyRequirementsResponse,
} from '../models/ai-requirements.model';

import {
  ClassifyRequest,
  ClassifyResponse,
} from '../models/ai-classification.model';

import {
  InterpretReportRequest,
  InterpretReportResponse,
} from '../models/ai-report.model';

@Injectable({
  providedIn: 'root',
})
export class JarvisApiService {
  private readonly baseUrl = environment.iaApiUrl;

  constructor(private readonly http: HttpClient) {}

  identifyRequirements(
    payload: IdentifyRequirementsRequest
  ): Observable<IdentifyRequirementsResponse> {
    return this.http.post<IdentifyRequirementsResponse>(
      `${this.baseUrl}/jarvis/identificar-requisitos`,
      payload
    );
  }

  classifyRequest(payload: ClassifyRequest): Observable<ClassifyResponse> {
    return this.http.post<ClassifyResponse>(
      `${this.baseUrl}/jarvis/clasificar-solicitud`,
      payload
    );
  }

  interpretReport(
    payload: InterpretReportRequest
  ): Observable<InterpretReportResponse> {
    return this.http.post<InterpretReportResponse>(
      `${this.baseUrl}/jarvis/interpretar-reporte`,
      payload
    );
  }
}
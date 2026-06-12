import { Injectable } from '@angular/core';
import * as joint from '@joint/core';

export interface WorkflowValidationIssue {
  type: 'ERROR' | 'WARNING';
  message: string;
  nodeId?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationIssue[];
  warnings: WorkflowValidationIssue[];
}

@Injectable({
  providedIn: 'root',
})
export class WorkflowValidationService {
  validateGraph(graph: joint.dia.Graph): WorkflowValidationResult {
    const errors: WorkflowValidationIssue[] = [];
    const warnings: WorkflowValidationIssue[] = [];

    const elements = graph.getElements();
    const links = graph.getLinks();

    const workflowNodes = elements.filter((element: any) => !this.isLane(element));

    const startNodes = workflowNodes.filter((node: any) =>
      this.normalizeNodeType(this.getNodeType(node)) === 'INICIO'
    );

    const endNodes = workflowNodes.filter((node: any) =>
      this.normalizeNodeType(this.getNodeType(node)) === 'FIN'
    );

    if (workflowNodes.length === 0) {
      errors.push({
        type: 'ERROR',
        message: 'El workflow debe tener al menos un nodo.',
      });
    }

    if (startNodes.length === 0) {
      errors.push({
        type: 'ERROR',
        message: 'El workflow debe tener al menos un nodo de inicio.',
      });
    }

    if (startNodes.length > 1) {
      warnings.push({
        type: 'WARNING',
        message: 'El workflow tiene más de un nodo de inicio.',
      });
    }

    if (endNodes.length === 0) {
      errors.push({
        type: 'ERROR',
        message: 'El workflow debe tener al menos un nodo final.',
      });
    }

    workflowNodes.forEach((node: any) => {
      this.validateNode(node, links, errors, warnings);
    });

    links.forEach((link: any) => {
      this.validateLink(link, errors, warnings);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateNode(
    node: any,
    links: joint.dia.Link[],
    errors: WorkflowValidationIssue[],
    warnings: WorkflowValidationIssue[]
  ): void {
    const nodeType = this.normalizeNodeType(this.getNodeType(node));
    const nodeId = String(node.id || '');
    const nodeName = this.getCellLabel(node) || 'Nodo sin nombre';

    const incoming = links.filter((link: any) => link.target()?.id === node.id);
    const outgoing = links.filter((link: any) => link.source()?.id === node.id);

    if (!nodeName || nodeName === 'Nodo sin nombre') {
      warnings.push({
        type: 'WARNING',
        nodeId,
        message: `El nodo ${nodeId} no tiene nombre definido.`,
      });
    }

    if (nodeType !== 'INICIO' && incoming.length === 0) {
      warnings.push({
        type: 'WARNING',
        nodeId,
        message: `El nodo "${nodeName}" no tiene conexiones de entrada.`,
      });
    }

    if (nodeType !== 'FIN' && outgoing.length === 0) {
      warnings.push({
        type: 'WARNING',
        nodeId,
        message: `El nodo "${nodeName}" no tiene conexiones de salida.`,
      });
    }

    if (nodeType === 'INICIO' && incoming.length > 0) {
      warnings.push({
        type: 'WARNING',
        nodeId,
        message: `El nodo de inicio "${nodeName}" no debería tener conexiones de entrada.`,
      });
    }

    if (nodeType === 'FIN' && outgoing.length > 0) {
      warnings.push({
        type: 'WARNING',
        nodeId,
        message: `El nodo final "${nodeName}" no debería tener conexiones de salida.`,
      });
    }

    if (nodeType === 'IF' && outgoing.length < 2) {
      errors.push({
        type: 'ERROR',
        nodeId,
        message: `El nodo de decisión "${nodeName}" debe tener al menos dos salidas.`,
      });
    }

    this.validateDocumentConfiguration(node, warnings);
  }

  private validateDocumentConfiguration(
    node: any,
    warnings: WorkflowValidationIssue[]
  ): void {
    const userData = node.get('userData') || {};
    const nodeId = String(node.id || '');
    const nodeName = this.getCellLabel(node) || 'Nodo sin nombre';

    const requiredDocuments =
      userData.requiredDocuments ||
      userData.documents?.requiredDocuments ||
      userData.configuration?.documents?.requiredDocuments ||
      [];

    const requiresDocumentUpload =
      userData.requiresDocumentUpload ??
      userData.documents?.requiresDocumentUpload ??
      userData.configuration?.documents?.requiresDocumentUpload ??
      false;

    const requiresDocumentReview =
      userData.requiresDocumentReview ??
      userData.documents?.requiresDocumentReview ??
      userData.configuration?.documents?.requiresDocumentReview ??
      false;

    if (
      (requiresDocumentUpload || requiresDocumentReview) &&
      (!Array.isArray(requiredDocuments) || requiredDocuments.length === 0)
    ) {
      warnings.push({
        type: 'WARNING',
        nodeId,
        message: `El nodo "${nodeName}" usa gestión documental, pero no tiene documentos requeridos definidos.`,
      });
    }
  }

  private validateLink(
    link: any,
    errors: WorkflowValidationIssue[],
    warnings: WorkflowValidationIssue[]
  ): void {
    const source = link.source?.();
    const target = link.target?.();

    if (!source?.id) {
      errors.push({
        type: 'ERROR',
        message: `Existe una conexión sin nodo origen.`,
      });
    }

    if (!target?.id) {
      errors.push({
        type: 'ERROR',
        message: `Existe una conexión sin nodo destino.`,
      });
    }

    if (source?.id && target?.id && source.id === target.id) {
      warnings.push({
        type: 'WARNING',
        nodeId: source.id,
        message: `Existe una conexión que apunta al mismo nodo.`,
      });
    }
  }

  private isLane(element: joint.dia.Element): boolean {
    return (
      element.get('type') === 'workflow.Lane' ||
      element.get('isLane') === true ||
      element.get('nodeType') === 'LANE'
    );
  }

  private getNodeType(node: any): string {
    return (
      node.get('nodeType') ||
      node.get('workflowType') ||
      node.get('businessType') ||
      node.get('type') ||
      'ACTIVIDAD'
    );
  }

  private normalizeNodeType(type: string): string {
    const upper = String(type || '').toUpperCase();

    if (upper.includes('INICIO') || upper.includes('START')) return 'INICIO';
    if (upper.includes('FIN') || upper.includes('END')) return 'FIN';
    if (upper.includes('IF') || upper.includes('DECISION')) return 'IF';
    if (upper.includes('LOOP')) return 'LOOP';
    if (upper.includes('FOR')) return 'FOR';
    if (upper.includes('JOIN')) return 'JOIN';
    if (upper.includes('FORK')) return 'FORK';
    if (upper.includes('MERGE')) return 'MERGE';

    return upper;
  }

  private getCellLabel(cell: any): string {
    return (
      cell.attr?.('label/text') ||
      cell.attr?.('text/text') ||
      cell.get('name') ||
      cell.get('label') ||
      ''
    );
  }
}
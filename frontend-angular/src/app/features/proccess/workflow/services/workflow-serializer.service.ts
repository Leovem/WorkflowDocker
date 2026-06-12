import { Injectable } from '@angular/core';
import * as joint from '@joint/core';

import {
  SerializedWorkflow,
  WorkflowGlobalRequirements,
  WorkflowEditorPropertiesForm,
} from '../models/workflow-editor.model';

import { WorkflowDocumentConfigService } from './workflow-document-config.service';

@Injectable({
  providedIn: 'root',
})
export class WorkflowSerializerService {
  constructor(
    private readonly documentConfigService: WorkflowDocumentConfigService
  ) {}

  serializeWorkflow(
    graph: joint.dia.Graph,
    globalRequirements: WorkflowGlobalRequirements
  ): SerializedWorkflow {
    const cells = graph.getCells();

    const lanes = cells.filter((cell) => this.isLane(cell));
    const nodes = cells.filter((cell) => this.isWorkflowNode(cell));
    const links = cells.filter((cell) => cell.isLink());

    return {
      globalRequirements,

      swimlanes: lanes.map((lane: any, index: number) =>
        this.serializeLane(lane, index)
      ),

      nodes: nodes.map((node: any) => this.serializeNode(node, lanes)),

      edges: links.map((link: any) => this.serializeEdge(link)),
    };
  }

  getJointEngineState(graph: joint.dia.Graph): any {
    return graph.toJSON();
  }

  private serializeLane(lane: any, index: number): any {
    const laneId = this.toStringId(lane.id);
    const position = lane.position?.();
    const size = lane.size?.();

    return {
      id: laneId,

      departmentId:
        lane.get('departmentId') ||
        lane.get('deptId') ||
        lane.get('department')?.id ||
        laneId,

      name:
        lane.attr?.('label/text') ||
        lane.attr?.('text/text') ||
        lane.get('name') ||
        lane.get('label') ||
        'Departamento',

      order: lane.get('order') ?? index,

      positionX: position?.x ?? 0,
      positionY: position?.y ?? 0,
      dimensionWidth: size?.width ?? 300,
      dimensionHeight: size?.height ?? 200,
    };
  }

  private serializeNode(node: any, lanes: joint.dia.Cell[]): any {
    const userData = node.get('userData') || {};
    const nodeId = this.toStringId(node.id);
    const position = node.position?.();
    const size = node.size?.();

    const detectedLane = this.findLaneForNode(node, lanes);
    const detectedLaneId = detectedLane ? this.toStringId(detectedLane.id) : null;

    const documentForm: WorkflowEditorPropertiesForm = {
      id: nodeId,
      type: this.getNodeType(node),
      title: this.getCellLabel(node),
      description: node.get('nodeDescription') || '',

      requiredDocuments:
        userData.requiredDocuments ||
        userData.documents?.requiredDocuments ||
        userData.configuration?.documents?.requiredDocuments ||
        [],

      requiresDocumentUpload:
        userData.requiresDocumentUpload ??
        userData.documents?.requiresDocumentUpload ??
        userData.configuration?.documents?.requiresDocumentUpload ??
        false,

      requiresDocumentReview:
        userData.requiresDocumentReview ??
        userData.documents?.requiresDocumentReview ??
        userData.configuration?.documents?.requiresDocumentReview ??
        false,
    };

    const documents =
      this.documentConfigService.buildDocumentConfigurationFromForm(documentForm);

    return {
      id: nodeId,

      type: this.getNodeType(node),

      // IMPORTANTE:
      // Este valor debe ser el ID de la calle, NO el ID del departamento.
      swimlaneId: detectedLaneId,

      name: this.getCellLabel(node) || 'Actividad',
      description: node.get('nodeDescription') || '',

      configuration: {
        multimedia: userData.requirements || null,
        mediaLabels: userData.mediaLabels || null,
        formFields: userData.customFields || [],

        documents,

        logic: {
          variable: userData.variable || null,
          operator: userData.operador || null,
          value: userData.value || null,
          mergeStrategy: userData.mergeStrategy || null,
        },
      },

      positionX: position?.x ?? 0,
      positionY: position?.y ?? 0,
      dimensionWidth: size?.width ?? 120,
      dimensionHeight: size?.height ?? 60,
    };
  }

  private serializeEdge(link: any): any {
    const source = link.source?.();
    const target = link.target?.();

    return {
      id: this.toStringId(link.id),

      sourceNodeId: source?.id || null,
      targetNodeId: target?.id || null,

      sourcePort: source?.port || null,
      targetPort: target?.port || null,

      label: this.getLinkLabel(link),

      conditionExpression:
        link.get('conditionExpression') ||
        link.get('condition') ||
        link.get('guard') ||
        null,
    };
  }

  private findLaneForNode(
    node: any,
    lanes: joint.dia.Cell[]
  ): joint.dia.Cell | null {
    const nodePosition = node.position?.();
    const nodeSize = node.size?.();

    if (!nodePosition || !nodeSize) {
      return null;
    }

    const nodeCenterX = nodePosition.x + nodeSize.width / 2;
    const nodeCenterY = nodePosition.y + nodeSize.height / 2;

    for (const lane of lanes as any[]) {
      const lanePosition = lane.position?.();
      const laneSize = lane.size?.();

      if (!lanePosition || !laneSize) {
        continue;
      }

      const insideX =
        nodeCenterX >= lanePosition.x &&
        nodeCenterX <= lanePosition.x + laneSize.width;

      const insideY =
        nodeCenterY >= lanePosition.y &&
        nodeCenterY <= lanePosition.y + laneSize.height;

      if (insideX && insideY) {
        return lane;
      }
    }

    return null;
  }

  private isLane(cell: joint.dia.Cell): boolean {
    return (
      cell.get('type') === 'workflow.Lane' ||
      cell.get('isLane') === true ||
      cell.get('nodeType') === 'LANE' ||
      cell.get('nodeType') === 'lane'
    );
  }

  private isWorkflowNode(cell: joint.dia.Cell): boolean {
    return !cell.isLink() && !this.isLane(cell);
  }

  private getNodeType(node: any): string {
    const rawType =
      node.get('nodeType') ||
      node.get('workflowType') ||
      node.get('businessType') ||
      node.get('type') ||
      'ACTIVIDAD';

    return this.normalizeNodeType(rawType);
  }

  private normalizeNodeType(type: string): string {
    const upper = String(type || '').trim().toUpperCase();

    const map: Record<string, string> = {
      INICIO: 'start',
      START: 'start',

      FIN: 'end',
      END: 'end',

      IF: 'decision',
      DECISION: 'decision',

      ACTIVIDAD: 'action',
      ACTION: 'action',
      ACTIVITY: 'action',

      LOOP: 'loop',
      FOR: 'for',
      JOIN: 'join',
      FORK: 'fork',
      MERGE: 'merge',
      LANE: 'lane',
    };

    return map[upper] || 'action';
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

  private getLinkLabel(link: any): string {
    const labels = link.labels?.();

    if (Array.isArray(labels) && labels.length > 0) {
      const firstLabel = labels[0];

      return (
        firstLabel?.attrs?.text?.text ||
        firstLabel?.attrs?.label?.text ||
        firstLabel?.attrs?.['text']?.text ||
        ''
      );
    }

    return link.get('label') || '';
  }

  private toStringId(id: any): string {
    return String(id || '');
  }
}
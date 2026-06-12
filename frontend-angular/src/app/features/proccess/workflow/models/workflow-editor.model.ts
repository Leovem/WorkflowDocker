import * as joint from '@joint/core';

export interface NodeRequirements {
  [key: string]: any;
  document: boolean;
  photo: boolean;
  video: boolean;
  audio: boolean;
}

export interface MediaLabels {
  [key: string]: any;
  document: string;
  photo: string;
  video: string;
  audio: string;
}

export interface WorkflowDocumentConfiguration {
  requiredDocuments: string[];
  requiresDocumentUpload: boolean;
  requiresDocumentReview: boolean;
}

export interface WorkflowNodeLogicConfiguration {
  variable?: string | null;
  operator?: string | null;
  value?: string | null;
  mergeStrategy?: string | null;
}

export interface WorkflowNodeConfiguration {
  multimedia?: NodeRequirements | null;
  mediaLabels?: MediaLabels | null;
  formFields?: any[];
  documents?: WorkflowDocumentConfiguration;
  logic?: WorkflowNodeLogicConfiguration;
}

export interface WorkflowEditorPropertiesForm {
  title: string;
  id: string;
  type: string;
  description: string;

  requirements?: NodeRequirements;
  mediaLabels?: MediaLabels;
  customFields?: any[];

  variable?: string;
  operador?: string;
  value?: string;
  mergeStrategy?: string;

  requiredDocuments?: string[];
  requiresDocumentUpload?: boolean;
  requiresDocumentReview?: boolean;
}

export interface WorkflowGlobalRequirements {
  description: string;
  document: boolean;
  photo: boolean;
  video: boolean;
  audio: boolean;
  mediaLabels: MediaLabels;
  customFields: any[];
}

export interface SerializedWorkflow {
  globalRequirements: WorkflowGlobalRequirements;
  swimlanes: any[];
  nodes: any[];
  edges: any[];
}

export interface WorkflowEditorState {
  graph: joint.dia.Graph;
  paper: joint.dia.Paper;
}

export interface WorkflowCanvasContext {
  graph: joint.dia.Graph;
  paper: joint.dia.Paper;
  paperContainer: HTMLElement;
}
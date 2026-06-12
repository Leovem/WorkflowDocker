import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-flow-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flow-sidebar.component.html',
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #050505; }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #10b981;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #34d399; }
  `]
})
export class FlowSidebarComponent {
  @Input() deptos: any[] = [];

  @Output() dragStartNode = new EventEmitter<any>();

  isOpen = true;

  toggleSidebar(): void {
    this.isOpen = !this.isOpen;
  }

  onDragStart(
    event: DragEvent,
    nodeType: string,
    label: string,
    extraData: any = {}
  ): void {
    const data = {
      nodeType,
      type: nodeType,
      label,
      name: label,
      dimension: this.getDimensionForType(nodeType),
      ...extraData
    };

    this.dragStartNode.emit(data);

    if (event.dataTransfer) {
      event.dataTransfer.setData('nodeType', nodeType);
      event.dataTransfer.setData('type', nodeType);
      event.dataTransfer.setData('label', label);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  private getDimensionForType(type: string): { width: number; height: number } {
    const normalizedType = type.toLowerCase();

    if (normalizedType === 'decision' || normalizedType === 'if') {
      return { width: 120, height: 90 };
    }

    if (
      normalizedType === 'syncbar' ||
      normalizedType === 'sync' ||
      normalizedType === 'fork' ||
      normalizedType === 'join'
    ) {
      return { width: 120, height: 30 };
    }

    if (
      normalizedType === 'start' ||
      normalizedType === 'initial' ||
      normalizedType === 'inicio' ||
      normalizedType === 'end' ||
      normalizedType === 'final' ||
      normalizedType === 'fin'
    ) {
      return { width: 80, height: 80 };
    }

    if (
      normalizedType === 'lane' ||
      normalizedType === 'swimlane' ||
      normalizedType === 'departamento'
    ) {
      return { width: 900, height: 180 };
    }

    return { width: 170, height: 70 };
  }
}
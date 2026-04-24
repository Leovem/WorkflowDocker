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
  // Recibe los departamentos desde el editor principal
  @Input() deptos: any[] = [];


  // Evento para notificar al editor cuando inicia el arrastre
  @Output() dragStartNode = new EventEmitter<any>();

  isOpen = true;

  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }

  // Método que emite los datos del nodo al iniciar el drag
  onDragStart(event: DragEvent, nodeType: string, label: string, extraData: any = {}) {
    const data = {
      nodeType,
      label,
      dimension: this.getDimensionForType(nodeType),
      ...extraData
    };
    this.dragStartNode.emit(data);

    // Configura la imagen de arrastre si es necesario o pasa datos al dataTransfer
    if (event.dataTransfer) {
      event.dataTransfer.setData('nodeType', nodeType);
      event.dataTransfer.setData('label', label);
      event.dataTransfer.effectAllowed = 'move';
    }
  }


  private getDimensionForType(type: string) {
    if (type === 'decision') return { width: 100, height: 100 };
    if (type === 'syncBar') return { width: 160, height: 20 };
    return { width: 250, height: 150 };
  }
}
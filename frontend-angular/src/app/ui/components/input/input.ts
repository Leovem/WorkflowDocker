import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2 w-full">
      @if (label) {
        <label class="text-sm font-medium leading-none text-slate-200 ml-1">{{ label }}</label>
      }
      <input 
        [type]="type" 
        [value]="value" 
        (input)="onInput($event)"
        [placeholder]="placeholder"
        class="flex h-10 w-full rounded-md border border-slate-800 bg-transparent px-3 py-2 text-sm 
               ring-offset-[#0a0a0a] placeholder:text-slate-500 focus-visible:outline-none 
               focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 
               transition-all text-white disabled:opacity-50"
      >
    </div>
  `
})
export class InputComponent {
  @Input() label: string = '';
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  
  // --- ESTO ES LO QUE BUSCA EL COMPILADOR ---
  @Input() value: string = ''; 
  @Output() valueChange = new EventEmitter<string>(); 

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Emitimos el valor cada vez que el usuario escribe
    this.valueChange.emit(input.value); 
  }
}
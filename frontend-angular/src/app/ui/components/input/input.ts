import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-1.5 w-full">
      @if (label) {
        <label class="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">{{ label }}</label>
      }
      <input 
        [type]="type" 
        [value]="value" 
        (input)="onInput($event)"
        [placeholder]="placeholder"
        class="flex h-11 w-full rounded-xl border border-slate-800/80 bg-[#0d111a]/60 px-3.5 py-2 text-sm 
               ring-offset-[#05070a] placeholder:text-slate-600 focus-visible:outline-none 
               focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 
               focus-visible:border-cyan-500/50 transition-all duration-200 text-white 
               disabled:opacity-50"
      >
    </div>
  `
})
export class InputComponent {
  @Input() label: string = '';
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  
  @Input() value: string = ''; 
  @Output() valueChange = new EventEmitter<string>(); 

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.valueChange.emit(input.value); 
  }
}
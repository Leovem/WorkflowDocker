import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  template: `
    <button 
      [disabled]="disabled"
      [type]="type"
      (click)="onClick.emit($event)"
      class="inline-flex items-center justify-center rounded-xl text-sm font-bold tracking-wide transition-all duration-200
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 
             focus-visible:ring-offset-2 disabled:opacity-40 bg-cyan-500 text-slate-950 
             hover:bg-cyan-400 h-11 px-4 py-2 w-full shadow-[0_4px_20px_rgba(6,182,212,0.2)] 
             hover:shadow-[0_4px_25px_rgba(6,182,212,0.35)] active:scale-[0.98] mt-2 disabled:pointer-events-none">
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' = 'button';
  @Output() onClick = new EventEmitter<Event>();
  @Input() disabled: boolean = false;
}
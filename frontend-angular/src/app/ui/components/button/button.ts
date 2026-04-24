import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  template: `
    <button 
      [disabled]="disabled"
      [type]="type"
      (click)="onClick.emit($event)"
      class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors 
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 
             focus-visible:ring-offset-2 disabled:opacity-50 bg-emerald-600 text-white 
             hover:bg-emerald-500 h-10 px-4 py-2 w-full shadow-lg shadow-emerald-900/20 
             active:scale-[0.98] mt-2 ">
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' = 'button';
  @Output() onClick = new EventEmitter<Event>();
  @Input() disabled: boolean = false;
}
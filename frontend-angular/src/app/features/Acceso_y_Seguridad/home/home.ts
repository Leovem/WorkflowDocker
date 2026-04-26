import { Component, OnInit } from '@angular/core';
import { Auth } from '../../../core/services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './dashboard.scss',
})
export class Home implements OnInit {
  userName: string | null = '';
  greeting: string = 'Hola';
  currentDate: string = '';

  constructor(private auth: Auth) { }

  ngOnInit(): void {
    this.userName = localStorage.getItem('user') || 'Usuario';
    this.setDynamicGreeting();
  }

  setDynamicGreeting(): void {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.greeting = 'Buenos días';
    } else if (hour >= 12 && hour < 19) {
      this.greeting = 'Buenas tardes';
    } else {
      this.greeting = 'Buenas noches';
    }

    this.currentDate = new Date().toLocaleDateString('es-ES', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    });
  }

  onLogout(): void {
    this.auth.logout();
  }
}
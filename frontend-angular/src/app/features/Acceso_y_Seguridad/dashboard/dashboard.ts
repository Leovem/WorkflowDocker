import { Component, OnInit } from '@angular/core';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  userName: string | null = '';

  constructor(private auth: Auth) { }

  ngOnInit(): void {
    this.userName = localStorage.getItem('user');
  }

  onLogout(): void {
    this.auth.logout();
  }
}

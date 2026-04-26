import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Home, Package, Building2, Users, BarChart3, LogOut, Shield, GitBranch } from 'lucide-angular';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-ui-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  // Estados reactivos
  isCollapsed = signal(false);
  isOpen = signal(false);

  role = '';
  isAdmin = false;
  userName = '';

  constructor(private authService: Auth) {
    this.userName = localStorage.getItem('user') || '';
    this.role = localStorage.getItem('role') || '';
    this.isAdmin = this.authService.hasAdminAccess();
  }

  readonly HomeIcon = Home;
  readonly AssetsIcon = Package;
  readonly DeptosIcon = Building2;
  readonly UsersIcon = Users;
  readonly RolesIcon = Shield;
  readonly ReportsIcon = BarChart3;
  readonly WorkflowIcon = GitBranch;
  readonly LogoutIcon = LogOut;

  menuGroups = [
    {
      title: 'Menú',
      items: [
        { label: 'Inicio', path: '/home', icon: this.HomeIcon }
      ],
      allowedRoles: ['ROOT', 'ADMINISTRADOR', 'FUNCIONARIO', 'RECEPCIONISTA']
    },
    {
      title: 'Administración',
      items: [
        { label: 'Usuarios', path: '/usuarios', icon: this.UsersIcon },
        { label: 'Roles', path: '/roles', icon: this.RolesIcon },
        { label: 'Departamentos', path: '/departamentos', icon: this.DeptosIcon },
        { label: 'Workflow', path: '/workflow', icon: this.WorkflowIcon },
        { label: 'dashboard', path: '/dashboard', icon: this.AssetsIcon}
      ],
      allowedRoles: ['ROOT', 'ADMINISTRADOR']
    },
    // Plantillas vacías para los otros roles, se llenarán luego
    {
      title: 'Funcionario',
      items: [
        { label: 'Actividades', path: '/tareas', icon: this.WorkflowIcon }
      ],
      allowedRoles: ['FUNCIONARIO']
    },
    {
      title: 'Recepción',
      items: [
        { label: 'Crear Trámites', path: '/tramites', icon: this.WorkflowIcon },
        { label: 'Historial de Trámites', path: '/historial', icon: this.WorkflowIcon }
      ],
      allowedRoles: ['RECEPCIONISTA']
    }
  ];

  get visibleMenuGroups() {
    const currentRole = String(this.role).toUpperCase();
    return this.menuGroups
      .filter(group => group.allowedRoles.includes(currentRole))
      .filter(group => group.items.length > 0); // No mostrar grupos vacíos
  }

  toggleCollapse() {
    this.isCollapsed.update(s => !s);
  }

  toggleMobile() {
    this.isOpen.update(s => !s);
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }
}
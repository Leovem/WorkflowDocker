import { Routes } from '@angular/router';
import { Login } from './features/Acceso_y_Seguridad/auth/login/login';
import { authGuard } from './core/guards/auth-guard';
import { funcionarioGuard, receptionistGuard, roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
    {
        path: 'dashboard',
        loadComponent: () => import ('./features/Intelegencia_y_Comunicacion/Analytics/dashboard').then(m => m.DashboardComponent),
        canActivate: [authGuard, roleGuard]
    },
    {

        path: 'home',
        loadComponent: () => import('./features/Acceso_y_Seguridad/home/home').then(m => m.Home),
        canActivate: [authGuard]
    },
    {
        path: 'usuarios',
        loadComponent: () => import('./features/Acceso_y_Seguridad/users/users').then(m => m.Users),
        canActivate: [authGuard, roleGuard]
    },
    {
        path: 'roles',
        loadComponent: () => import('./features/Acceso_y_Seguridad/roles/roles').then(m => m.Roles),
        canActivate: [authGuard, roleGuard]
    },
    {
        path: 'departamentos',
        loadComponent: () => import('./features/Acceso_y_Seguridad/departments/departments').then(m => m.Departments),
        canActivate: [authGuard, roleGuard]
    },
    {
        path: 'workflow',
        loadComponent: () => import('./features/proccess/workflow/workflow').then(m => m.Workflow),
        canActivate: [authGuard, roleGuard]
    },
    {
        path: 'tramites',
        loadComponent: () => import('./features/motor/perfilEfimero/receptionist').then(m => m.ReceptionistComponent),
        canActivate: [authGuard, receptionistGuard]
    },
    {
        path: 'historial',
        loadComponent: () => import('./features/motor/Instance/all-Instance').then(m => m.AllInstances),
        canActivate: [authGuard, receptionistGuard]
    },
    {
        path: 'tareas',
        loadComponent: () => import('./features/motor/funcionario/inbox.component').then(m => m.InboxComponent),
        canActivate: [authGuard, funcionarioGuard]
    },
    { path: '**', redirectTo: 'login' }

];

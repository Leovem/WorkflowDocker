import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (authService.hasAdminAccess()) {
    return true;
  } else {
    router.navigate(['/home']); // O a una vista Not Authorized si existe
    return false;
  }
};

export const receptionistGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (authService.hasReceptionistAccess()) {
    return true;
  } else {
    router.navigate(['/home']); // O a una vista Not Authorized si existe
    return false;
  }
};

export const funcionarioGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (authService.hasFuncionarioAccess()) {
    return true;
  } else {
    router.navigate(['/home']); // O a una vista Not Authorized si existe
    return false;
  }
};

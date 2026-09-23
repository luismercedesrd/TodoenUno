import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  saveSession(token: string, name: string): void {
    localStorage.setItem('token', token);
    localStorage.setItem('userName', name);
  }

  getUserName(): string {
    return localStorage.getItem('userName') ?? '';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    this.router.navigate(['/login']);
  }
}

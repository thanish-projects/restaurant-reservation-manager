import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ToastComponent } from './components/toast/toast.component';
import { AiChatComponent } from './components/ai-chat/ai-chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, AiChatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  constructor(public auth: AuthService) {}

  onLogout(): void {
    this.auth.logout();
  }
}

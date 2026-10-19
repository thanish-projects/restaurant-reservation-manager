import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="toast-area">
      <div
        *ngFor="let t of toast.toasts"
        class="toast"
        [class.error]="t.type === 'error'"
        (click)="toast.dismiss(t.id)"
      >
        <span class="toast-icon">{{ t.type === 'error' ? '⚠️' : '✅' }}</span>
        <div class="toast-body">
          <div class="toast-title">{{ t.type === 'error' ? 'Notification Alert' : 'System Notice' }}</div>
          <div class="toast-text">{{ t.text }}</div>
        </div>
        <span class="toast-close" title="Dismiss">✕</span>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-area {
        position: fixed;
        top: 24px;
        right: 24px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 1000;
        pointer-events: none;
      }
      .toast {
        pointer-events: auto;
        background: #0f172a;
        color: #f8fafc;
        border-left: 4px solid #10b981;
        padding: 14px 18px;
        border-radius: 12px;
        min-width: 300px;
        max-width: 420px;
        cursor: pointer;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.4), 0 0 1px 1px rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        transition: transform 0.15s ease, opacity 0.15s ease;
      }
      .toast:hover {
        transform: translateY(-2px);
      }
      .toast.error {
        border-left-color: #ef4444;
      }
      .toast-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
      .toast-body {
        flex: 1;
      }
      .toast-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        margin-bottom: 2px;
      }
      .toast-text {
        font-size: 13.5px;
        font-weight: 500;
        color: #ffffff;
      }
      .toast-close {
        color: #64748b;
        font-size: 12px;
        padding: 4px;
        transition: color 0.15s;
      }
      .toast:hover .toast-close {
        color: #ffffff;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }
    `,
  ],
})
export class ToastComponent {
  constructor(public toast: ToastService) {}
}

import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiChatService, ChatMessage } from '../../services/ai-chat.service';
import { LineBreaksPipe } from '../../pipes/line-breaks.pipe';

/**
 * AiChatComponent
 *
 * Floating chat widget powered by the multi-agent orchestration system.
 * All AI calls go through FreeLLMAPI — zero Antigravity credits consumed.
 *
 * Agent pipeline (all via FreeLLMAPI):
 *  - Orchestrator (gemini-3.8-flash) : classifies intent, extracts entities
 *  - Booking Agent (gemini-3.7-flash): reservation queries + live RAG context
 *  - Table Agent   (gemini-3.7-flash): table queries + live RAG context
 *  - FAQ Agent     (gemini-2.5-flash): general questions, no DB needed
 */
@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LineBreaksPipe],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.css'],
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  isOpen = false;
  isLoading = false;
  userInput = '';
  messages: ChatMessage[] = [];
  errorMessage = '';

  /** Maps agent keys to friendly display labels */
  private readonly agentLabels: Record<string, string> = {
    booking_agent: '📅 Booking Agent',
    table_agent: '🪑 Table Agent',
    faq_agent: '💬 FAQ Agent',
    faq_agent_fallback: '💬 Assistant',
    error: '⚠️ System',
  };

  /** Maps intent keys to human-readable labels */
  private readonly intentLabels: Record<string, string> = {
    booking_query: 'Booking Query',
    table_query: 'Table Query',
    faq: 'General',
    multi_intent: 'Multi-topic',
    unclear: 'General',
    error: 'Error',
  };

  constructor(private aiChatService: AiChatService) {}

  ngOnInit(): void {
    this.messages.push({
      role: 'assistant',
      content:
        '👋 Hi! I\'m your Restaurant AI Assistant powered by multi-agent orchestration.\n\n' +
        'I can help you with:\n' +
        '• 📅 Booking availability & reservations\n' +
        '• 🪑 Table information & capacity\n' +
        '• 💬 General restaurant questions\n\n' +
        'What would you like to know?',
      agent: 'faq_agent',
      intent: 'faq',
      model: 'gemini-2.5-flash',
      timestamp: new Date(),
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    this.errorMessage = '';
  }

  sendMessage(): void {
    const message = this.userInput.trim();
    if (!message || this.isLoading) return;

    // Push user message into the chat
    this.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    this.userInput = '';
    this.isLoading = true;
    this.errorMessage = '';

    // Build conversation history (all turns except the one just added)
    // Passed to the backend so agents have conversational context
    const conversationHistory = this.messages
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    this.aiChatService.sendMessage(message, conversationHistory).subscribe({
      next: (response) => {
        this.messages.push({
          role: 'assistant',
          content: response.reply,
          agent: response.agent,
          intent: response.intent,
          model: response.model,
          timestamp: new Date(),
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[AiChat] Error:', err);
        this.errorMessage =
          err.status === 401
            ? 'Please log in to use the AI assistant.'
            : err.status === 0
            ? 'Cannot reach the server. Is the backend running?'
            : 'Something went wrong. Please try again.';
        this.isLoading = false;
      },
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  getAgentLabel(agent: string | undefined): string {
    if (!agent) return '';
    return this.agentLabels[agent] ?? '🤖 AI Agent';
  }

  getIntentLabel(intent: string | undefined): string {
    if (!intent) return '';
    return this.intentLabels[intent] ?? intent;
  }

  clearChat(): void {
    this.messages = [];
    this.errorMessage = '';
    this.ngOnInit();
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }
}

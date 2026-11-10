import { streamChat } from '../core/ai-api.js';
import { bus } from '../core/bus.js';

export class Chat extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.messages = [];
    this.isProcessing = false;
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.querySelector('form').addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async handleSubmit(e) {
    e.preventDefault();
    const input = this.shadowRoot.querySelector('textarea');
    const text = input.value.trim();
    if (!text || this.isProcessing) return;

    this.messages.push({ role: 'user', content: text });
    input.value = '';
    this.isProcessing = true;
    this.render();

    const assistantMsg = { role: 'assistant', content: '' };
    this.messages.push(assistantMsg);
    this.render();

    try {
      await streamChat(
        text,
        (chunk) => {
          assistantMsg.content += chunk;
          this.updateLastMessage();
        },
        (toolMsg) => {
          bus.emit('terminal:log', { type: 'success', text: `[TOOL] ${toolMsg}` });
        }
      );
    } catch (err) {
      bus.emit('terminal:log', { type: 'error', text: `Chat Error: ${err.message}` });
      assistantMsg.content += `\n[Error: ${err.message}]`;
      this.updateLastMessage();
    } finally {
      this.isProcessing = false;
      this.render();
    }
  }

  updateLastMessage() {
    const output = this.shadowRoot.querySelector('.chat-output');
    const lastBubble = output.lastElementChild;
    if (lastBubble) {
      lastBubble.querySelector('.content').textContent = this.messages[this.messages.length - 1].content;
      output.scrollTop = output.scrollHeight;
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; height: 100%; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
        .chat-output { flex: 1; overflow-y: auto; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }
        .message { max-width: 85%; padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-base); line-height: 1.6; }
        .message.user { align-self: flex-end; background: var(--color-accent); color: white; }
        .message.assistant { align-self: flex-start; background: var(--color-surface); border: 1px solid var(--color-border); }
        .input-area { padding: var(--space-3); border-top: 1px solid var(--color-border); display: flex; gap: var(--space-2); background: var(--color-surface); }
        textarea { flex: 1; resize: none; height: 80px; background: var(--color-bg); }
        .empty-state { text-align: center; color: var(--color-text-muted); margin-top: var(--space-7); font-size: var(--text-sm); }
      </style>
      <div class="chat-output">
        ${this.messages.length === 0 ? '<div class="empty-state">Ready. Ask me to run Python, search the web, or manage files.</div>' : ''}
        ${this.messages.map(m => `
          <div class="message ${m.role}">
            <div class="content">${m.content}</div>
          </div>
        `).join('')}
        ${this.isProcessing && !this.messages[this.messages.length-1].content ? '<div class="message assistant"><div class="content">Thinking...</div></div>' : ''}
      </div>
      <form class="input-area">
        <textarea name="prompt" placeholder="Type a message... (Shift+Enter for newline)" ${this.isProcessing ? 'disabled' : ''}></textarea>
        <button type="submit" ${this.isProcessing ? 'disabled' : ''}>Send</button>
      </form>
    `;
  }
}
customElements.define('x-chat', Chat);
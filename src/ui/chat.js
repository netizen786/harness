import { streamChat } from '../core/ai-api.js';
import { bus } from '../core/bus.js';

const MAX_FILE_BYTES = 100 * 1024;
const MAX_TOTAL_FILE_BYTES = 300 * 1024;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export class Chat extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.messages = [];
    this.isProcessing = false;
  }

  connectedCallback() { this.render(); }

  async handleSubmit(event) {
    event.preventDefault();
    if (this.isProcessing) return;
    const textarea = this.shadowRoot.querySelector('textarea[name="prompt"]');
    const fileInput = this.shadowRoot.querySelector('input[type="file"]');
    const text = textarea.value.trim();
    const files = [...(fileInput.files || [])];
    if (!text && files.length === 0) return;

    this.isProcessing = true;
    const sendButton = this.shadowRoot.querySelector('[type="submit"]');
    sendButton.disabled = true;
    let requestText = text;
    const attachmentNames = [];
    try {
      let totalBytes = 0;
      const fileContents = [];
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 100 KB. Attach smaller text files.`);
        totalBytes += file.size;
        if (totalBytes > MAX_TOTAL_FILE_BYTES) throw new Error('Attachments exceed the 300 KB total limit.');
        const content = await file.text();
        attachmentNames.push(file.name);
        fileContents.push(`\n\n--- Attached file: ${file.name} ---\n${content}\n--- End of ${file.name} ---`);
      }
      requestText = [text, ...fileContents].filter(Boolean).join('\n\n');
    } catch (error) {
      this.isProcessing = false;
      this.render();
      this.addError(`Could not attach file: ${error.message}`);
      return;
    }

    this.messages.push({ role: 'user', content: text || 'Please review the attached file(s).', attachments: attachmentNames });
    const assistantMessage = { role: 'assistant', content: '' };
    this.messages.push(assistantMessage);
    this.render();

    try {
      await streamChat(
        requestText,
        chunk => {
          assistantMessage.content += chunk;
          this.updateLastMessage();
        },
        toolMessage => bus.emit('terminal:log', { type: 'success', text: `[TOOL] ${toolMessage}` })
      );
    } catch (error) {
      assistantMessage.content = `Error: ${error.message || error}`;
      bus.emit('terminal:log', { type: 'error', text: `Chat Error: ${error.message || error}` });
    } finally {
      this.isProcessing = false;
      this.render();
    }
  }

  addError(message) {
    this.messages.push({ role: 'assistant', content: message });
    this.render();
  }

  updateLastMessage() {
    const output = this.shadowRoot.querySelector('.chat-output');
    const bubbles = output?.querySelectorAll('.message.assistant .content');
    if (bubbles?.length) bubbles[bubbles.length - 1].textContent = this.messages[this.messages.length - 1].content;
    if (output) output.scrollTop = output.scrollHeight;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; min-height: 0; height: 100%; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
        .chat-output { flex: 1; min-height: 0; overflow-y: auto; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }
        .message { max-width: 85%; padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-base); line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
        .message.user { align-self: flex-end; background: var(--color-accent); color: white; }
        .message.assistant { align-self: flex-start; background: var(--color-surface); border: 1px solid var(--color-border); }
        .attachment { display: block; margin-top: 6px; font-size: var(--text-sm); opacity: .8; }
        .input-area { padding: var(--space-3); border-top: 1px solid var(--color-border); display: grid; grid-template-columns: 1fr auto; gap: var(--space-2); background: var(--color-surface); }
        textarea { grid-column: 1 / -1; width: 100%; min-height: 70px; resize: vertical; padding: 8px; color: var(--color-text); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font: inherit; }
        .file-picker { min-width: 0; align-self: center; color: var(--color-text-muted); font-size: var(--text-sm); }
        button { padding: var(--space-2) var(--space-3); color: white; background: var(--color-accent); border: 0; border-radius: var(--radius-sm); cursor: pointer; }
        button:disabled { opacity: .5; cursor: wait; }
        .empty-state { text-align: center; color: var(--color-text-muted); margin: auto; font-size: var(--text-sm); }
      </style>
      <div class="chat-output" aria-live="polite">
        ${this.messages.length === 0 ? '<div class="empty-state">Ready. Add an API key in Settings to chat. You can also attach text files.</div>' : ''}
        ${this.messages.map(message => `<div class="message ${message.role === 'user' ? 'user' : 'assistant'}"><div class="content">${escapeHTML(message.content)}</div>${message.attachments?.length ? `<small class="attachment">Attached: ${message.attachments.map(escapeHTML).join(', ')}</small>` : ''}</div>`).join('')}
        ${this.isProcessing ? '<div class="message assistant"><div class="content">Thinking…</div></div>' : ''}
      </div>
      <form class="input-area">
        <textarea name="prompt" placeholder="Type a message… (Shift+Enter for newline)" ${this.isProcessing ? 'disabled' : ''}></textarea>
        <input class="file-picker" type="file" multiple accept=".txt,.md,.csv,.json,.py,.js,.html,.css,.xml,.yaml,.yml,.log,.svg,text/*" aria-label="Attach text files" ${this.isProcessing ? 'disabled' : ''}>
        <button type="submit" ${this.isProcessing ? 'disabled' : ''}>${this.isProcessing ? 'Sending…' : 'Send'}</button>
      </form>
    `;
    this.shadowRoot.querySelector('form').addEventListener('submit', event => this.handleSubmit(event));
  }
}
customElements.define('x-chat', Chat);

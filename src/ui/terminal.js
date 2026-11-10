import { bus } from '../core/bus.js';

export class Terminal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.logs = [];
  }

  connectedCallback() {
    this.render();
    bus.on('terminal:log', (msg) => {
      this.logs.push(msg);
      this.render();
      const container = this.shadowRoot.querySelector('.output');
      if (container) container.scrollTop = container.scrollHeight;
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; flex-direction: column; height: 100%; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
        .header { padding: var(--space-2) var(--space-3); background: var(--color-surface); border-bottom: 1px solid var(--color-border); font-size: var(--text-sm); font-weight: var(--font-medium); display: flex; justify-content: space-between; }
        .output { flex: 1; padding: var(--space-3); font-family: var(--font-mono); font-size: var(--text-sm); overflow-y: auto; color: var(--color-text-muted); }
        .log-entry { margin-bottom: var(--space-2); white-space: pre-wrap; word-break: break-word; }
        .log-entry.error { color: var(--color-error); }
        .log-entry.success { color: var(--color-success); }
        .empty { color: var(--color-text-muted); opacity: 0.5; font-style: italic; }
      </style>
      <div class="header">
        <span>TERMINAL</span>
        <button id="clear-btn">Clear</button>
      </div>
      <div class="output">
        ${this.logs.length === 0 ? '<div class="empty">No output yet. Run Python or use tools to see logs here.</div>' : ''}
        ${this.logs.map(log => `<div class="log-entry ${log.type}">${log.text}</div>`).join('')}
      </div>
    `;

    this.shadowRoot.getElementById('clear-btn').addEventListener('click', () => {
      this.logs = [];
      this.render();
    });
  }
}
customElements.define('x-terminal', Terminal);

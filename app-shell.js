import './terminal.js';
import './chat.js';
import './status-bar.js';

export class AppShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: grid; grid-template-rows: auto 1fr auto; height: 100vh; width: 100vw; }
        header { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); background: var(--color-surface); display: flex; align-items: center; gap: var(--space-3); }
        h1 { font-size: var(--text-lg); font-weight: var(--font-medium); letter-spacing: -0.02em; }
        .badge { font-size: var(--text-sm); color: var(--color-text-muted); font-family: var(--font-mono); }
        main { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); padding: var(--space-4); overflow: hidden; }
        @media (max-width: 768px) {
          main { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
        }
      </style>
      <header>
        <h1>⬢ HARNESS</h1>
        <span class="badge">v1.4.2</span>
      </header>
      <main>
        <x-chat></x-chat>
        <x-terminal></x-terminal>
      </main>
      <x-status></x-status>
    `;
  }
}
customElements.define('x-app', AppShell);
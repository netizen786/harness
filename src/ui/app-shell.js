import './terminal.js';
import './chat.js';
import './status-bar.js';
import './settings-panel.js';
import './pwa-install.js';

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
        .actions { margin-left: auto; display: flex; align-items: center; gap: var(--space-2); }
        .actions button { cursor: pointer; }
        main { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); padding: var(--space-4); overflow: hidden; min-height: 0; }
        @media (max-width: 768px) {
          :host { height: 100dvh; }
          main { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
          header { padding: var(--space-2) var(--space-3); }
          h1 { font-size: var(--text-base); }
          .badge { display: none; }
          .actions { gap: 4px; }
          .actions button { padding: 6px 8px; font-size: var(--text-sm); }
        }
      </style>
      <header>
        <h1>⬢ HARNESS</h1>
        <span class="badge">v1.4.2</span>
        <div class="actions">
          <x-pwa-install></x-pwa-install>
          <button type="button" id="settings-btn">Settings</button>
        </div>
      </header>
      <main>
        <x-chat></x-chat>
        <x-terminal></x-terminal>
      </main>
      <x-status></x-status>
      <x-settings hidden></x-settings>
    `;
    this.shadowRoot.getElementById('settings-btn').addEventListener('click', () => {
      this.shadowRoot.querySelector('x-settings').open();
    });
  }
}
customElements.define('x-app', AppShell);

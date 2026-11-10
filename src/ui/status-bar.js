import { bus } from '../core/bus.js';
import { FEATURES } from '../core/flags.js';
import { getPyodideStatus } from '../core/pyodide-runner.js';

export class StatusBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.updateStatus = () => this.render();
  }

  connectedCallback() {
    this.render();
    bus.on('pyodide:ready', this.updateStatus);
    bus.on('pyodide:error', this.updateStatus);
    window.addEventListener('online', this.updateStatus);
    window.addEventListener('offline', this.updateStatus);
  }

  disconnectedCallback() {
    bus.off('pyodide:ready', this.updateStatus);
    bus.off('pyodide:error', this.updateStatus);
    window.removeEventListener('online', this.updateStatus);
    window.removeEventListener('offline', this.updateStatus);
  }

  render() {
    const pyStatus = getPyodideStatus();
    const isOnline = navigator.onLine;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; gap: var(--space-4); padding: var(--space-2) var(--space-4); background: var(--color-surface); border-top: 1px solid var(--color-border); font-size: var(--text-sm); }
        .indicator { display: flex; align-items: center; gap: var(--space-2); }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-error); }
        .dot.ready, .dot.online { background: var(--color-success); }
        .flag { padding: 0 var(--space-1); background: var(--color-bg); border-radius: var(--radius-sm); border: 1px solid var(--color-border); }
        .flag.active { border-color: var(--color-accent); color: var(--color-accent); }
      </style>
      <div class="indicator">
        <span class="dot ${pyStatus === 'ready' ? 'ready' : ''}"></span>
        Pyodide: ${pyStatus}
      </div>
      <div class="indicator">
        <span class="dot ${isOnline ? 'online' : ''}"></span>
        ${isOnline ? 'Online' : 'Offline'}
      </div>
      <div style="flex:1"></div>
      <div class="indicator">
        ${Object.entries(FEATURES).map(([key, val]) => `<span class="flag ${val ? 'active' : ''}">${key}</span>`).join('')}
      </div>
    `;
  }
}
customElements.define('x-status', StatusBar);

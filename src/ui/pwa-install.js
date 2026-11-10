export class PwaInstall extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.installPrompt = null;
    this.onBeforeInstall = event => {
      event.preventDefault();
      this.installPrompt = event;
      this.render('Install app');
    };
    this.onInstalled = () => {
      this.installPrompt = null;
      this.render('App installed');
    };
  }

  connectedCallback() {
    window.addEventListener('beforeinstallprompt', this.onBeforeInstall);
    window.addEventListener('appinstalled', this.onInstalled);
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstall);
    window.removeEventListener('appinstalled', this.onInstalled);
  }

  async install() {
    if (!this.installPrompt) {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      this.render(isIOS ? 'On iPhone/iPad: Share → Add to Home Screen' : 'Install from your browser menu');
      return;
    }
    this.installPrompt.prompt();
    await this.installPrompt.userChoice;
    this.installPrompt = null;
    this.render('Install app');
  }

  render(label) {
    const installed = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-flex; }
        button { padding: 7px 10px; color: var(--color-text); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); cursor: pointer; font: inherit; font-size: var(--text-sm); }
        button:hover { background: var(--color-surface-hover); }
        button:disabled { opacity: .7; cursor: default; }
      </style>
      <button type="button" ${installed ? 'disabled' : ''} title="Install HARNESS as an app">${installed ? 'Installed' : label || 'Install'}</button>
    `;
    if (!installed) this.shadowRoot.querySelector('button').addEventListener('click', () => this.install());
  }
}
customElements.define('x-pwa-install', PwaInstall);

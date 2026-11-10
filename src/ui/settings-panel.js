import { getSetting, setSetting } from '../core/store.js';

const MODEL_OPTIONS = [
  ['gpt-4o-mini', 'GPT-4o mini (fast, lower cost)'],
  ['gpt-4o', 'GPT-4o'],
  ['gpt-4.1-mini', 'GPT-4.1 mini'],
  ['gpt-4.1', 'GPT-4.1'],
  ['o4-mini', 'o4-mini']
];

export class SettingsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.loadSettings();
  }

  async loadSettings() {
    const status = this.shadowRoot.querySelector('[data-status]');
    try {
      const [model, openaiKey, tavilyKey] = await Promise.all([
        getSetting('openai_model', 'gpt-4o-mini'),
        getSetting('openai_api_key', ''),
        getSetting('tavily_api_key', '')
      ]);
      const modelSelect = this.shadowRoot.querySelector('[name="model"]');
      if (modelSelect && ![...modelSelect.options].some(option => option.value === model)) {
        const custom = document.createElement('option');
        custom.value = model;
        custom.textContent = `${model} (saved)`;
        modelSelect.append(custom);
      }
      if (modelSelect) modelSelect.value = model;
      this.shadowRoot.querySelector('[name="openai-key"]').placeholder = openaiKey ? 'Key saved in this browser (enter to replace)' : 'Paste OpenAI API key';
      this.shadowRoot.querySelector('[name="tavily-key"]').placeholder = tavilyKey ? 'Key saved in this browser (enter to replace)' : 'Paste Tavily API key';
      if (status) status.textContent = 'Settings are stored in this browser only.';
    } catch (error) {
      if (status) status.textContent = `Could not load settings: ${error.message}`;
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host([hidden]) { display: none !important; }
        :host { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 16px; }
        .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.75); }
        .panel { position: relative; width: min(560px, 100%); max-height: min(90vh, 760px); overflow: auto; padding: 24px; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 16px 50px #0009; display: grid; gap: 16px; font: 14px/1.5 var(--font-sans); }
        header, .actions, .key-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        h2 { font-size: 20px; } h3 { font-size: 15px; margin-bottom: 4px; }
        p, small { color: var(--color-text-muted); }
        label { display: grid; gap: 6px; }
        input, select { width: 100%; padding: 10px; color: var(--color-text); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 6px; font: inherit; }
        button { padding: 8px 12px; color: var(--color-text); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; font: inherit; }
        button.primary { background: var(--color-accent); border-color: var(--color-accent); color: white; }
        button:hover { filter: brightness(1.15); }
        .key-row input { flex: 1; min-width: 0; }
        [data-status] { min-height: 1.5em; color: var(--color-success); }
        .warning { padding: 10px; border-left: 3px solid var(--color-accent); background: var(--color-bg); }
        @media (max-width: 480px) { .panel { padding: 18px; } }
      </style>
      <div class="backdrop" data-close></div>
      <section class="panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header><h2 id="settings-title">Settings</h2><button type="button" data-close aria-label="Close settings">Close</button></header>
        <p class="warning">API keys are saved in this browser’s IndexedDB. They are not sent anywhere except the provider you choose, but anyone using this browser profile may be able to access them.</p>
        <label>OpenAI model
          <select name="model">${MODEL_OPTIONS.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}<option value="custom">Custom model ID…</option></select>
        </label>
        <label name="custom-model-wrap" hidden>Custom model ID
          <input name="custom-model" placeholder="Provider model identifier">
        </label>
        <section><h3>OpenAI API key</h3><div class="key-row"><input name="openai-key" type="password" autocomplete="new-password" placeholder="Paste OpenAI API key"><button type="button" data-clear="openai_api_key">Clear</button></div></section>
        <section><h3>Tavily search API key</h3><div class="key-row"><input name="tavily-key" type="password" autocomplete="new-password" placeholder="Paste Tavily API key"><button type="button" data-clear="tavily_api_key">Clear</button></div></section>
        <small>Model availability depends on your OpenAI account. Search requires a Tavily key. Python and the virtual file tools do not require API keys.</small>
        <p data-status role="status" aria-live="polite"></p>
        <div class="actions"><span></span><button class="primary" type="button" data-save>Save settings</button></div>
      </section>
    `;

    this.shadowRoot.querySelectorAll('[data-close]').forEach(element => element.addEventListener('click', () => this.close()));
    this.shadowRoot.querySelector('[data-save]').addEventListener('click', () => this.saveSettings());
    this.shadowRoot.querySelector('[name="model"]').addEventListener('change', event => {
      this.shadowRoot.querySelector('[name="custom-model-wrap"]').hidden = event.target.value !== 'custom';
    });
    this.shadowRoot.querySelectorAll('[data-clear]').forEach(button => button.addEventListener('click', async () => {
      try {
        await setSetting(button.dataset.clear, '');
        button.closest('.key-row').querySelector('input').value = '';
        button.closest('.key-row').querySelector('input').placeholder = 'No key saved';
        this.setStatus('Saved key cleared from this browser.');
      } catch (error) { this.setStatus(`Could not clear key: ${error.message}`, true); }
    }));
    this.shadowRoot.querySelector('.panel').addEventListener('keydown', event => {
      if (event.key === 'Escape') this.close();
    });
  }

  async saveSettings() {
    const status = this.shadowRoot.querySelector('[data-status]');
    const selectedModel = this.shadowRoot.querySelector('[name="model"]').value;
    const customModel = this.shadowRoot.querySelector('[name="custom-model"]').value.trim();
    const model = selectedModel === 'custom' ? customModel : selectedModel;
    if (!model) {
      this.setStatus('Enter a custom model ID before saving.', true);
      return;
    }
    const openaiKey = this.shadowRoot.querySelector('[name="openai-key"]').value.trim();
    const tavilyKey = this.shadowRoot.querySelector('[name="tavily-key"]').value.trim();
    const saveButton = this.shadowRoot.querySelector('[data-save]');
    saveButton.disabled = true;
    if (status) status.textContent = 'Saving…';
    try {
      await setSetting('openai_model', model);
      if (openaiKey) await setSetting('openai_api_key', openaiKey);
      if (tavilyKey) await setSetting('tavily_api_key', tavilyKey);
      this.shadowRoot.querySelector('[name="openai-key"]').value = '';
      this.shadowRoot.querySelector('[name="tavily-key"]').value = '';
      await this.loadSettings();
      this.setStatus('Settings saved.');
    } catch (error) {
      this.setStatus(`Could not save settings: ${error.message}`, true);
    } finally { saveButton.disabled = false; }
  }

  setStatus(message, isError = false) {
    const status = this.shadowRoot.querySelector('[data-status]');
    if (status) {
      status.textContent = message;
      status.style.color = isError ? 'var(--color-error)' : 'var(--color-success)';
    }
  }

  open() {
    this.hidden = false;
    this.shadowRoot.querySelector('[name="openai-key"]')?.focus();
  }

  close() { this.hidden = true; }
}

customElements.define('x-settings', SettingsPanel);

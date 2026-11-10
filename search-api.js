import { getSetting } from './store.js';

const providers = {
  tavily: async (query) => {
    const apiKey = await getSetting('tavily_api_key', '');
    if (!apiKey) throw new Error('Tavily API key not set in Settings.');
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, search_depth: 'basic' })
    });
    
    if (!response.ok) throw new Error(`Tavily API error: ${response.status}`);
    const data = await response.json();
    return data.results.map(r => ({ title: r.title, url: r.url, snippet: r.content }));
  }
};

export async function searchWeb(query) {
  // Provider map allows easy addition of Brave, etc. without if/else chains
  const activeProvider = 'tavily'; 
  try {
    const results = await providers[activeProvider](query);
    return { ok: true, results };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
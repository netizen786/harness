import { FEATURES, isFeatureEnabled } from './flags.js';
import { runPython } from './pyodide-runner.js';
import { searchWeb } from './search-api.js';
import { fsRead, fsWrite, fsList } from './virtual-fs.js';
import * as remoteBrowserStub from './remote-browser.stub.js';
import * as fsAccessStub from './fs-access.stub.js';

const tools = new Map();

export function registerTool({ name, description, schema, handler, enabledByFlag }) {
  tools.set(name, { name, description, schema, handler, enabledByFlag });
}

export function getEnabledTools() {
  const enabled = [];
  for (const [name, tool] of tools.entries()) {
    if (tool.enabledByFlag === null || isFeatureEnabled(tool.enabledByFlag)) {
      enabled.push({
        name: tool.name,
        description: tool.description,
        parameters: tool.schema
      });
    }
  }
  return enabled;
}

export async function executeTool(name, args) {
  const tool = tools.get(name);
  if (!tool) throw new Error(`Tool '${name}' not found in registry.`);
  if (tool.enabledByFlag && !isFeatureEnabled(tool.enabledByFlag)) {
    throw new Error(`FEATURE_DISABLED: ${name} is disabled by flag ${tool.enabledByFlag}`);
  }
  return await tool.handler(args);
}

export function initRegistry() {
  if (FEATURES.pythonSandbox) {
    registerTool({
      name: 'run_python',
      description: 'Execute Python code in a secure sandbox. Use asyncio.sleep instead of time.sleep. No os.system or subprocess.',
      schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
      handler: async ({ code }) => await runPython(code),
      enabledByFlag: 'pythonSandbox'
    });
  }

  if (FEATURES.search) {
    registerTool({
      name: 'search_web',
      description: 'Search the web for real-time information. Returns title, url, and snippet.',
      schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      handler: async ({ query }) => await searchWeb(query),
      enabledByFlag: 'search'
    });
  }

  registerTool({
    name: 'fs_read',
    description: 'Read a file from the virtual in-memory filesystem.',
    schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    handler: async ({ path }) => await fsRead(path),
    enabledByFlag: null
  });

  registerTool({
    name: 'fs_write',
    description: 'Write content to a file in the virtual in-memory filesystem.',
    schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
    handler: async ({ path, content }) => await fsWrite(path, content),
    enabledByFlag: null
  });

  registerTool({
    name: 'fs_list',
    description: 'List contents of a directory in the virtual filesystem.',
    schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    handler: async ({ path }) => await fsList(path),
    enabledByFlag: null
  });

  registerTool({
    name: 'browse_url',
    description: 'Open and scrape a URL using a remote browser.',
    schema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    handler: remoteBrowserStub.browseUrl,
    enabledByFlag: 'remoteBrowser'
  });

  registerTool({
    name: 'open_local_folder',
    description: 'Request access to a local folder via File System Access API.',
    schema: { type: 'object', properties: {}, required: [] },
    handler: fsAccessStub.openLocalFolder,
    enabledByFlag: 'localFolder'
  });
}

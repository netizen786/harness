import { getEnabledTools, executeTool } from './registry.js';
import { getSetting } from './store.js';

const SYSTEM_PROMPT = `You are an autonomous agent running in a browser-based harness.
RULES FOR PYTHON SANDBOX:
1. All execution is async. Use asyncio.sleep, NEVER time.sleep.
2. No input(), threads, subprocess, os.system, or sockets.
3. Filesystem is in-memory. Use /workspace/ paths. Never hardcode C:\\ or /home/user.
4. Serialize only primitives (str, int, float, bool, list, dict). No DOM nodes.
5. Wrap code in try/except. Catch ModuleNotFoundError and pip install if needed (simulated).
Always think step-by-step. Use tools when needed. Return errors gracefully.`;

const providers = {
  openai: async (messages, tools) => {
    const apiKey = await getSetting('openai_api_key', '');
    if (!apiKey) throw new Error('OpenAI API key is missing. Open Settings and add your API key.');
    const model = await getSetting('openai_model', 'gpt-4o-mini');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        stream: true
      })
    });

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json();
        detail = body.error?.message || '';
      } catch { /* use HTTP status if response isn't JSON */ }
      throw new Error(`OpenAI API error (${response.status})${detail ? `: ${detail}` : ''}`);
    }
    if (!response.body) throw new Error('OpenAI returned an empty response stream.');
    return response.body;
  }
};

export async function streamChat(userMessage, onChunk, onToolCall) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage }
  ];

  let continueLoop = true;
  let finalText = '';
  let toolRounds = 0;

  while (continueLoop) {
    if (toolRounds > 8) throw new Error('Stopped after 8 tool rounds to prevent an endless tool-call loop.');
    const enabledTools = getEnabledTools().map(tool => ({ type: 'function', function: tool }));
    const stream = await providers.openai(messages, enabledTools);

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const currentToolCalls = [];
    const assistantMessage = { role: 'assistant', content: '', tool_calls: [] };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          let parsed;
          try { parsed = JSON.parse(jsonStr); } catch { continue; }
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            assistantMessage.content += delta.content;
            finalText += delta.content;
            onChunk(delta.content);
          }
          for (const call of delta?.tool_calls || []) {
            const index = call.index ?? 0;
            if (!currentToolCalls[index]) {
              currentToolCalls[index] = { id: call.id || '', type: call.type || 'function', function: { name: '', arguments: '' } };
            }
            if (call.id) currentToolCalls[index].id = call.id;
            if (call.function?.name) currentToolCalls[index].function.name += call.function.name;
            if (call.function?.arguments) currentToolCalls[index].function.arguments += call.function.arguments;
          }
        }
      }
      buffer += decoder.decode();
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw new Error(`Chat stream failed: ${error.message || error}`);
    }

    const calls = currentToolCalls.filter(Boolean);
    if (calls.length) {
      toolRounds += 1;
      assistantMessage.tool_calls = calls.map(call => ({
        ...call,
        function: { ...call.function, arguments: JSON.parse(call.function.arguments || '{}') }
      }));
      messages.push(assistantMessage);

      for (const call of assistantMessage.tool_calls) {
        onToolCall(`Executing: ${call.function.name}...`);
        try {
          const result = await executeTool(call.function.name, call.function.arguments);
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
        } catch (error) {
          messages.push({ role: 'tool', tool_call_id: call.id, content: `Tool execution failed: ${error.message}` });
        }
      }
    } else {
      continueLoop = false;
    }
  }

  return finalText;
}

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
    if (!apiKey) throw new Error('OpenAI API key not set.');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools: tools.length > 0 ? tools : undefined,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
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

  while (continueLoop) {
    const enabledTools = getEnabledTools().map(t => ({ type: 'function', function: t }));
    const stream = await providers.openai(messages, enabledTools);

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let currentToolCalls = [];
    let assistantMessage = { role: 'assistant', content: '', tool_calls: [] };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

        for (const line of lines) {
          const jsonStr = line.replace('data: ', '').trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices[0]?.delta;

            if (delta?.content) {
              assistantMessage.content += delta.content;
              finalText += delta.content;
              onChunk(delta.content);
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!currentToolCalls[tc.index]) currentToolCalls[tc.index] = { id: tc.id, type: tc.type, function: { name: '', arguments: '' } };
                if (tc.function?.name) currentToolCalls[tc.index].function.name += tc.function.name;
                if (tc.function?.arguments) currentToolCalls[tc.index].function.arguments += tc.function.arguments;
              }
            }
          } catch (e) { /* ignore parse errors in stream */ }
        }
      }
    } catch (err) {
      onChunk(`\n[ERROR: Stream failed - ${err.message}]`);
      break;
    }

    if (currentToolCalls.length > 0) {
      assistantMessage.tool_calls = currentToolCalls.map(tc => ({
        ...tc,
        function: { ...tc.function, arguments: JSON.parse(tc.function.arguments || '{}') }
      }));
      messages.push(assistantMessage);

      for (const tc of assistantMessage.tool_calls) {
        onToolCall(`Executing: ${tc.function.name}...`);
        try {
          const result = await executeTool(tc.function.name, tc.function.arguments);
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result)
          });
        } catch (err) {
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: `Tool execution failed: ${err.message}`
          });
        }
      }
    } else {
      continueLoop = false;
    }
  }

  return finalText;
}

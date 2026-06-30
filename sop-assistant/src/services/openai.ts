import { config } from '../config.js';

const EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export async function embed(texts: string[]): Promise<number[][]> {
  const response = await fetch(EMBEDDINGS_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ model: config.OPENAI_EMBED_MODEL, input: texts })
  });

  if (!response.ok) {
    throw new Error(`OpenAI embeddings failed: ${response.status} ${await safeText(response)}`);
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return data.data.map((entry) => entry.embedding);
}

export async function chat(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: config.OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI chat failed: ${response.status} ${await safeText(response)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.OPENAI_API_KEY}`
  };
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

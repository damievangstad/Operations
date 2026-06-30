import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiEnabled, config } from '../config.js';
import { chat, embed } from './openai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = path.resolve(__dirname, '../knowledge');
const TOP_K = 4;

type Chunk = {
  source: string;
  heading: string;
  text: string;
  embedding?: number[];
};

let chunks: Chunk[] = [];
let indexReady = false;

export function getIndexStatus() {
  return { aiEnabled, indexReady, chunkCount: chunks.length };
}

export async function buildIndex(): Promise<void> {
  chunks = loadChunks();

  if (!aiEnabled) {
    console.log(`[rag] AI disabled (no OPENAI_API_KEY). Loaded ${chunks.length} chunks for echo mode.`);
    indexReady = false;
    return;
  }

  const embeddings = await embed(chunks.map((chunk) => `${chunk.heading}\n${chunk.text}`));
  chunks.forEach((chunk, index) => {
    chunk.embedding = embeddings[index];
  });
  indexReady = true;
  console.log(`[rag] Indexed ${chunks.length} chunks from ${KNOWLEDGE_DIR}.`);
}

export async function answer(question: string): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) {
    return 'Send me a question about how we run events and I will look it up in the SOPs.';
  }

  if (!aiEnabled) {
    return [
      'Plumbing test: I received your message.',
      `You asked: "${trimmed}"`,
      `Loaded ${chunks.length} SOP section(s). Add an OPENAI_API_KEY to switch on real answers.`
    ].join('\n');
  }

  if (!indexReady) {
    return `I am still warming up — try again in a moment, or contact ${config.ESCALATION_CONTACT}.`;
  }

  const [questionEmbedding] = await embed([trimmed]);
  const top = rankBySimilarity(questionEmbedding).slice(0, TOP_K);

  const context = top.map((chunk) => `SOP section "${chunk.heading}":\n${chunk.text}`).join('\n\n');

  const systemPrompt = [
    'You are the field assistant for Vangstad Creamery, a mobile ice cream cart catering business.',
    'Answer the contractor using ONLY the SOP context provided.',
    'Be brief and practical — they are usually on a phone at an event.',
    'End your reply by naming the exact SOP section heading you used, formatted like: (from: Cleanup and breakdown).',
    `If the answer is not in the context, say you are not sure and tell them to contact ${config.ESCALATION_CONTACT}. Never guess.`
  ].join(' ');

  const userPrompt = `SOP context:\n${context}\n\nContractor question: ${trimmed}`;

  try {
    const reply = await chat(systemPrompt, userPrompt);
    return reply || `I am not sure about that one — please contact ${config.ESCALATION_CONTACT}.`;
  } catch (error) {
    console.error('[rag] answer failed:', error);
    return `Something went wrong on my end. Please contact ${config.ESCALATION_CONTACT}.`;
  }
}

function rankBySimilarity(query: number[]): Chunk[] {
  return chunks
    .filter((chunk) => Array.isArray(chunk.embedding))
    .map((chunk) => ({ chunk, score: cosineSimilarity(query, chunk.embedding as number[]) }))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.chunk);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function loadChunks(): Chunk[] {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    return [];
  }

  const files = fs.readdirSync(KNOWLEDGE_DIR).filter((file) => file.endsWith('.md'));
  const result: Chunk[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), 'utf8');
    for (const section of splitByHeading(raw)) {
      result.push({ source: file.replace(/\.md$/, ''), heading: section.heading, text: section.text });
    }
  }

  return result;
}

function splitByHeading(markdown: string): Array<{ heading: string; text: string }> {
  const lines = markdown.split(/\r?\n/);
  const sections: Array<{ heading: string; text: string }> = [];
  let heading = 'Overview';
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) {
      sections.push({ heading, text });
    }
    buffer = [];
  };

  for (const line of lines) {
    const match = /^#{1,6}\s+(.*)$/.exec(line);
    if (match) {
      flush();
      heading = match[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  return sections;
}

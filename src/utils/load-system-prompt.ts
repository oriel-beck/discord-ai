import { readFile } from 'fs/promises';

export default async function loadSystemPrompt(path: string) {
  const file = await readFile(path, { encoding: 'utf-8' });
  if (!file) throw new Error(`Cannot find a system prompt file at ${path}`);
  process.env.SYSTEM_PROMPT = file;
  return true;
}

import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const getCurrentDate: ToolFunction = async () => {
  const date = new Date();
  return { data: `timestamp: ${date.getTime()}\nISO timestamp: ${date.toISOString()}\nReadable: ${date.toLocaleDateString()}` };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_current_date_time',
    description: 'Get the current date and time, allows for calculating relative time to valid timestamps',
  },
};

export default getCurrentDate;

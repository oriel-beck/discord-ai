import { tool } from '@langchain/core/tools';

export default () => tool(
  () => {
    const date = new Date();
    return { data: `timestamp: ${date.getTime()}\nISO timestamp: ${date.toISOString()}\nReadable: ${date.toLocaleDateString()}` };
  },
  {
    name: 'get_current_date_time',
    description: 'Get the current date and time, allows for calculating relative time to valid timestamps',
  }
);;
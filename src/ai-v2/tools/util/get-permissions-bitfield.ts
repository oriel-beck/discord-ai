import { tool } from '@langchain/core/tools';
import { PermissionsBitField } from 'discord.js';
import { bigint, object } from 'zod';
import { discordIdSchema } from '../../constants.js';

const schema = object({
  sourceId: discordIdSchema,
  bitfield: bigint({ message: 'Bitfield must be a permission bifield' }).describe('A permissions bitfield'),
});

export default () =>
  tool(
    async ({ sourceId, bitfield }) => {
      const bits = new PermissionsBitField(bitfield);
      return { data: `Source: ${sourceId}, permissions: ${bits.toArray().join(', ')}` };
    },
    {
      name: 'convert_permissions_bitfield',
      description: 'Converts a permission bitfield (such as 11264) to a permission names array.',
      schema,
    }
  );

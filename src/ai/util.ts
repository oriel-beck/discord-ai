import { ZodObject, ZodObjectDef } from 'zod';

/**
 * Recursively removes `minLength` from a Zod schema converted to JSON Schema
 * @param schema - The JSON schema object
 * @returns The cleaned schema without `minLength`
 */
export function cleanSchema(schema: ZodObjectDef) {
  if (typeof schema !== 'object' || schema === null) return schema;

  // Create a copy to avoid mutating the original schema
  const cleanedSchema = schema instanceof ZodObject ? (schema as any) : schema.shape();

  if ('minLength' in cleanedSchema) {
    delete cleanedSchema.minLength; // Remove the minLength property
  }

  // Recursively clean nested objects (e.g., properties)
  if (cleanedSchema.properties) {
    for (const key in cleanedSchema.properties) {
      cleanedSchema.properties[key] = cleanSchema(cleanedSchema.properties[key]);
    }
  }

  return cleanedSchema;
}

import { z } from "zod";

/**
 * Converts a basic Zod type to a JSON Schema object.
 * Supports: ZodString, ZodNumber, ZodRecord, ZodOptional, ZodObject
 */
function zodTypeToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const def = (schema as any)._def;
  if (!def) return {};

  switch (def.typeName) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodRecord":
      return {
        type: "object",
        additionalProperties: def.valueType ? zodTypeToJsonSchema(def.valueType) : true,
      };
    case "ZodOptional":
      return zodTypeToJsonSchema(def.innerType);
    case "ZodObject": {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodTypeToJsonSchema(value as z.ZodTypeAny);
        if (!((value as z.ZodTypeAny).isOptional?.())) {
          required.push(key);
        }
      }
      return {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }
    default:
      return {};
  }
}

/**
 * Wraps a Zod object schema so it satisfies the MCP v2 SDK's `StandardSchemaWithJSON`
 * interface. Zod 3.25 implements `~standard` but does not include `jsonSchema`,
 * which the MCP v2 SDK requires. This helper adds the missing property.
 */
export function wrapZodSchema<T extends z.ZodObject<any>>(schema: T): T & {
  "~standard": T extends { "~standard": infer S } ? S & {
    jsonSchema: { input: () => Record<string, unknown>; output: () => Record<string, unknown> };
  } : never;
} {
  const jsonSchema = zodTypeToJsonSchema(schema);
  const standard = (schema as any)["~standard"];
  (schema as any)["~standard"] = {
    ...standard,
    jsonSchema: {
      input: () => jsonSchema,
      output: () => jsonSchema,
    },
  };
  return schema as any;
}

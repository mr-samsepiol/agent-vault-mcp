import type { FastifyRequest, FastifyReply } from "fastify";

export function createAuthHook(apiKey: string) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<Error | undefined> => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      reply.code(401).send({ error: "Missing Authorization header" });
      return new Error("Unauthorized");
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      reply.code(401).send({ error: "Invalid Authorization format. Use: Bearer <api-key>" });
      return new Error("Unauthorized");
    }

    const token = parts[1];
    if (token !== apiKey) {
      reply.code(401).send({ error: "Invalid API key" });
      return new Error("Unauthorized");
    }

    return undefined;
  };
};

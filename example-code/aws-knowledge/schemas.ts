import { StringEnum } from "@mariozechner/pi-ai";
import { Type, type Static } from "typebox";

export const ResourceTypeSchema = StringEnum(["product", "api", "cfn"] as const, {
  description: "Resource lookup mode for regional availability.",
});

export const SearchDocumentationSchema = Type.Object({
  search_phrase: Type.String({ minLength: 1 }),
  topics: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { maxItems: 3 })),
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
});
export type SearchDocumentationInput = Static<typeof SearchDocumentationSchema>;

export const ReadDocumentationRequestSchema = Type.Object({
  url: Type.String({ minLength: 1 }),
  start_index: Type.Optional(Type.Integer({ minimum: 0 })),
  max_length: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const ReadDocumentationSchema = Type.Object({
  requests: Type.Array(ReadDocumentationRequestSchema, { minItems: 1 }),
});
export type ReadDocumentationInput = Static<typeof ReadDocumentationSchema>;

export const RecommendSchema = Type.Object({
  url: Type.String({ minLength: 1 }),
});
export type RecommendInput = Static<typeof RecommendSchema>;

export const ListRegionsSchema = Type.Object({});
export type ListRegionsInput = Static<typeof ListRegionsSchema>;

export const GetRegionalAvailabilitySchema = Type.Object({
  resource_type: ResourceTypeSchema,
  region: Type.Optional(Type.String({ minLength: 1 })),
  regions: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, maxItems: 10 })),
  filters: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })),
  next_token: Type.Optional(Type.String({ minLength: 1 })),
});
export type GetRegionalAvailabilityInput = Static<typeof GetRegionalAvailabilitySchema>;

export const RetrieveAgentSopSchema = Type.Object({
  sop_name: Type.String({ minLength: 1 }),
});
export type RetrieveAgentSopInput = Static<typeof RetrieveAgentSopSchema>;

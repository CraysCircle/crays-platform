import { costLimitPlugin } from "@escape.tech/graphql-armor-cost-limit";
import { maxDepthPlugin } from "@escape.tech/graphql-armor-max-depth";
import { maxTokensPlugin } from "@escape.tech/graphql-armor-max-tokens";
import { usePersistedOperations as persistedOperationsPlugin } from "@graphql-yoga/plugin-persisted-operations";
import { createYoga } from "graphql-yoga";
import {
  createCraysGraphQLContext,
  type CraysGraphQLContext,
  type CraysGraphQLNextContext,
} from "./context";
import { getCraysPersistedOperation } from "./persisted-operations";
import { getCraysGraphQLRuntimeConfig } from "./runtime-config";
import { createCraysGraphQLSchema } from "./schema";

export function createCraysGraphQLServer() {
  const runtime = getCraysGraphQLRuntimeConfig();

  return createYoga<CraysGraphQLNextContext, CraysGraphQLContext>({
    schema: createCraysGraphQLSchema(),
    graphqlEndpoint: runtime.endpoint,
    fetchAPI: { Response },
    graphiql: runtime.introspectionEnabled,
    maskedErrors: true,
    context: ({ request }) => createCraysGraphQLContext(request, runtime),
    plugins: [
      maxTokensPlugin({ n: runtime.maximumTokens, exposeLimits: false }),
      maxDepthPlugin({ n: runtime.maximumDepth, exposeLimits: false, ignoreIntrospection: true }),
      costLimitPlugin({ maxCost: runtime.maximumCost, exposeLimits: false, ignoreIntrospection: true }),
      persistedOperationsPlugin<CraysGraphQLContext>({
        allowArbitraryOperations: !runtime.persistedOperationsRequired,
        getPersistedOperation: (operationId) => getCraysPersistedOperation(operationId),
      }),
    ],
  });
}

import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { openFrontArenaRulesText } from "./rules";

export function createOpenFrontArenaMcpServer(): McpServer {
  const server = new McpServer({
    name: "openfront-agent-arena-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "openfront_get_rules",
    {
      title: "Get Agent Arena Rules",
      description:
        "Return the current local OpenFront Agent Arena rules summary.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => ({
      content: [
        {
          type: "text",
          text: openFrontArenaRulesText,
        },
      ],
    }),
  );

  server.registerResource(
    "openfront_rules",
    "openfront://rules",
    {
      title: "OpenFront Agent Arena Rules",
      description:
        "Concise embedded rules summary for the local Agent Arena MVP.",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.toString(),
          mimeType: "text/plain",
          text: openFrontArenaRulesText,
        },
      ],
    }),
  );

  return server;
}

export async function runOpenFrontArenaMcpStdioServer(): Promise<void> {
  const server = createOpenFrontArenaMcpServer();
  await server.connect(new StdioServerTransport());
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await runOpenFrontArenaMcpStdioServer();
}

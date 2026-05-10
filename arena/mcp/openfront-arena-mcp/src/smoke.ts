import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { expectCondition, expectJsonEqual } from "../../../runner/src/smokeAssert";
import { createOpenFrontArenaMcpServer } from "./server";

const server = createOpenFrontArenaMcpServer();
const client = new Client({
  name: "openfront-agent-arena-mcp-smoke",
  version: "0.1.0",
});
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

try {
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  const tools = await client.listTools();
  expectJsonEqual(
    "mcp tools",
    tools.tools.map((tool) => tool.name),
    ["openfront_get_rules"],
  );
  expectCondition(
    "mcp get rules tool is read only",
    tools.tools.every(
      (tool) =>
        tool.annotations?.readOnlyHint === true &&
        tool.annotations.destructiveHint === false &&
        tool.annotations.openWorldHint === false,
    ),
    { tools },
  );

  const rules = await client.callTool({
    name: "openfront_get_rules",
  });
  const firstContent = rules.content[0];
  expectCondition(
    "mcp get rules content",
    firstContent?.type === "text" &&
      firstContent.text.includes("OpenFront Agent Arena rules summary") &&
      firstContent.text.includes("does not need filesystem access"),
    { rules },
  );

  const resources = await client.listResources();
  expectJsonEqual(
    "mcp resources",
    resources.resources.map((resource) => resource.uri),
    ["openfront://rules"],
  );

  const resource = await client.readResource({
    uri: "openfront://rules",
  });
  const firstResource = resource.contents[0];
  expectCondition(
    "mcp rules resource",
    firstResource?.uri === "openfront://rules" &&
      "text" in firstResource &&
      typeof firstResource.text === "string" &&
      firstResource.text.includes("OpenFront Agent Arena rules summary"),
    { resource },
  );

  console.log("OpenFront Agent Arena MCP smoke check passed.");
  console.log(
    JSON.stringify(
      {
        tools: tools.tools.map((tool) => tool.name),
        resources: resources.resources.map((item) => item.uri),
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
  await server.close();
}

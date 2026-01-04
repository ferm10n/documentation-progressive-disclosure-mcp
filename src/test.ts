#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

async function testServer() {
  console.log("Starting MCP server test...\n");

  // Start the server
  const serverProcess = spawn("node", ["build/index.js"], {
    cwd: process.cwd(),
  });

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"],
  });

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    console.log("✓ Connected to server\n");

    // List available tools
    console.log("=== Listing tools ===");
    const toolsResponse = await client.listTools();
    console.log("Available tools:");
    toolsResponse.tools.forEach((tool) => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Test 1: Probe documentation
    console.log("=== Test 1: Probing documentation ===");
    const probeResult = await client.callTool({
      name: "probe_documentation",
      arguments: {
        path: "/tmp/test-docs/api-doc.md",
      },
    });
    const probeContent = probeResult.content as any[];
    console.log(probeContent[0].text);
    console.log();

    // Test 2: Probe with filter
    console.log("=== Test 2: Probing with filter (Analytics) ===");
    const probeFilterResult = await client.callTool({
      name: "probe_documentation",
      arguments: {
        path: "/tmp/test-docs/api-doc.md",
        filter: "Analytics",
      },
    });
    const probeFilterContent = probeFilterResult.content as any[];
    console.log(probeFilterContent[0].text);
    console.log();

    // Test 3: Dump documentation
    console.log("=== Test 3: Dumping documentation ===");
    const dumpResult = await client.callTool({
      name: "dump_documentation",
      arguments: {
        path: "/tmp/test-docs/api-doc.md",
      },
    });
    const dumpContent = dumpResult.content as any[];
    console.log(`Content length: ${dumpContent[0].text.length} characters`);
    console.log("First 200 characters:");
    console.log(dumpContent[0].text.substring(0, 200) + "...\n");

    // Test 4: Dump with filter
    console.log("=== Test 4: Dumping with filter (GET) ===");
    const dumpFilterResult = await client.callTool({
      name: "dump_documentation",
      arguments: {
        path: "/tmp/test-docs/api-doc.md",
        filter: "GET",
      },
    });
    const dumpFilterContent = dumpFilterResult.content as any[];
    console.log(dumpFilterContent[0].text);
    console.log();

    // Test 5: Give feedback
    console.log("=== Test 5: Giving feedback ===");
    const feedbackResult = await client.callTool({
      name: "give_feedback",
      arguments: {
        path: "/tmp/test-docs/api-doc.md",
        useful_content: "This section about endpoints was helpful",
      },
    });
    const feedbackContent = feedbackResult.content as any[];
    console.log(feedbackContent[0].text);
    console.log();

    console.log("✓ All tests completed successfully!");
  } catch (error) {
    console.error("Error during testing:", error);
    process.exit(1);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

testServer().catch(console.error);

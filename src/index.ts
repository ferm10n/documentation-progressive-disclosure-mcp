#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";

interface DumpedDoc {
  path: string;
  content: string;
  timestamp: number;
}

// Store dumped documentation for feedback
// Documents older than 1 hour will be cleaned up
const dumpedDocs: Map<string, DumpedDoc> = new Map();
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const MAX_DOCUMENT_AGE_MS = 60 * 60 * 1000; // 1 hour

// Periodically clean up old dumped documents to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [path, doc] of dumpedDocs.entries()) {
    if (now - doc.timestamp > MAX_DOCUMENT_AGE_MS) {
      dumpedDocs.delete(path);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Parse markdown file and extract headers
 */
async function extractHeaders(filePath: string, filterExpr?: string): Promise<string[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const headers: string[] = [];

  for (const line of lines) {
    // Match markdown headers (# Header, ## Header, etc.)
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      const indent = "  ".repeat(level - 1);
      headers.push(`${indent}${"#".repeat(level)} ${title}`);
    }
  }

  // Apply filter if provided
  if (filterExpr) {
    const filterLower = filterExpr.toLowerCase();
    return headers.filter((h) => h.toLowerCase().includes(filterLower));
  }

  return headers;
}

/**
 * Read and optionally filter markdown documentation
 */
async function dumpDocumentation(
  filePath: string,
  filterExpr?: string
): Promise<string> {
  const content = await fs.readFile(filePath, "utf-8");

  // Store the dumped documentation for feedback
  dumpedDocs.set(filePath, {
    path: filePath,
    content: content,
    timestamp: Date.now(),
  });

  // Apply filter if provided
  if (filterExpr) {
    const lines = content.split("\n");
    const filterLower = filterExpr.toLowerCase();
    const filteredLines = lines.filter((line) =>
      line.toLowerCase().includes(filterLower)
    );
    return filteredLines.join("\n");
  }

  return content;
}

/**
 * Calculate percentage of dumped documentation that is useful
 */
function calculateUsefulnessPercentage(
  filePath: string,
  usefulContent: string
): number {
  const dumpedDoc = dumpedDocs.get(filePath);

  if (!dumpedDoc) {
    throw new Error(
      `No dumped documentation found for ${filePath}. Please dump the documentation first.`
    );
  }

  const totalLength = dumpedDoc.content.length;
  const usefulLength = usefulContent.length;

  if (totalLength === 0) {
    return 0;
  }

  const percentage = (usefulLength / totalLength) * 100;
  return Math.round(percentage * 100) / 100; // Round to 2 decimal places
}

const server = new Server(
  {
    name: "documentation-progressive-disclosure",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: "probe_documentation",
    description:
      "Probe a markdown documentation file to see what topics and headers are present. Returns a hierarchical list of headers without the full content.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the markdown file to probe",
        },
        filter: {
          type: "string",
          description: "Optional filter expression to narrow down headers (case-insensitive substring match)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "dump_documentation",
    description:
      "Dump the entire contents of a markdown documentation file. Use this after probing to get the full documentation.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the markdown file to dump",
        },
        filter: {
          type: "string",
          description: "Optional filter expression to show only matching lines (case-insensitive substring match)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "give_feedback",
    description:
      "Provide feedback on what percentage of the dumped documentation was useful. This helps track the effectiveness of progressive disclosure.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the markdown file that was previously dumped",
        },
        useful_content: {
          type: "string",
          description: "The portion of the dumped content that was actually useful",
        },
      },
      required: ["path", "useful_content"],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "probe_documentation") {
      if (!args) {
        return {
          content: [{ type: "text", text: "Error: Missing arguments" }],
          isError: true,
        };
      }
      const filePath = args.path as string;
      const filter = args.filter as string | undefined;

      // Validate file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          content: [
            {
              type: "text",
              text: `Error: File not found: ${filePath}`,
            },
          ],
        };
      }

      const headers = await extractHeaders(filePath, filter);

      if (headers.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: filter
                ? `No headers found matching filter: ${filter}`
                : "No headers found in the document",
            },
          ],
        };
      }

      const result = `Headers in ${path.basename(filePath)}:\n\n${headers.join("\n")}`;

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } else if (name === "dump_documentation") {
      if (!args) {
        return {
          content: [{ type: "text", text: "Error: Missing arguments" }],
          isError: true,
        };
      }
      const filePath = args.path as string;
      const filter = args.filter as string | undefined;

      // Validate file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          content: [
            {
              type: "text",
              text: `Error: File not found: ${filePath}`,
            },
          ],
        };
      }

      const content = await dumpDocumentation(filePath, filter);

      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    } else if (name === "give_feedback") {
      if (!args) {
        return {
          content: [{ type: "text", text: "Error: Missing arguments" }],
          isError: true,
        };
      }
      const filePath = args.path as string;
      const usefulContent = args.useful_content as string;

      try {
        const percentage = calculateUsefulnessPercentage(
          filePath,
          usefulContent
        );

        return {
          content: [
            {
              type: "text",
              text: `Usefulness feedback for ${path.basename(filePath)}:\n\n` +
                `Useful content: ${usefulContent.length} characters\n` +
                `Total dumped: ${dumpedDocs.get(filePath)?.content.length || 0} characters\n` +
                `Usefulness percentage: ${percentage}%`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}. Available tools: probe_documentation, dump_documentation, give_feedback`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Documentation Progressive Disclosure MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

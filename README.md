# documentation-progressive-disclosure-mcp

An MCP server that provides access to documentation using progressive disclosure, to avoid context bloat and navigating large sets of documentation.

## Overview

This MCP server allows AI assistants to efficiently explore documentation by first "probing" to see what topics are available, then selectively "dumping" relevant sections. It also supports feedback tracking to measure the usefulness of dumped content.

## Features

### Three Core Tools

1. **probe_documentation** - See what topics/headers are present without loading full content
   - Inputs: path to markdown file, optional filter expression
   - Returns: Hierarchical list of headers (with indentation based on header level)

2. **dump_documentation** - Get the full documentation content
   - Inputs: path to markdown file, optional filter expression
   - Returns: Complete markdown content (or filtered subset)

3. **give_feedback** - Track what percentage of dumped content was useful
   - Inputs: path to file, useful content string
   - Returns: Usefulness percentage calculation

## Installation

```bash
npm install
npm run build
```

## Quick Start

Try it with the included example documentation:

```bash
# Build the project
npm run build

# Run the test suite (uses example-docs.md)
node build/test.js
```

The repository includes `example-docs.md` that you can use to explore the server's functionality.

## Usage

### As an MCP Server

Add to your MCP settings configuration (e.g., for Claude Desktop):

```json
{
  "mcpServers": {
    "documentation-progressive-disclosure": {
      "command": "node",
      "args": ["/path/to/documentation-progressive-disclosure-mcp/build/index.js"]
    }
  }
}
```

### Testing

Run the included test script:

```bash
npm run build
node build/test.js
```

## Example Workflow

1. **Probe** to see what's available:
   ```javascript
   probe_documentation({
     path: "/path/to/docs.md",
     filter: "API"  // optional: only show headers containing "API"
   })
   ```

2. **Dump** specific sections:
   ```javascript
   dump_documentation({
     path: "/path/to/docs.md",
     filter: "Authentication"  // optional: only show lines containing "Authentication"
   })
   ```

3. **Give feedback** on usefulness:
   ```javascript
   give_feedback({
     path: "/path/to/docs.md",
     useful_content: "The authentication section was helpful"
   })
   ```

## Benefits

- **Reduced Context Bloat**: Only load documentation that's actually needed
- **Better Navigation**: Understand structure before diving deep
- **Feedback Loop**: Track which parts of documentation are actually useful
- **Flexible Filtering**: Find specific topics quickly with case-insensitive matching

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
node build/test.js
```

## Requirements

- Node.js 18+
- TypeScript 5+
- @modelcontextprotocol/sdk

## License

ISC


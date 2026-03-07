#!/usr/bin/env node

/**
 * ESM Import Patcher for @github/copilot-sdk
 * 
 * Patches broken ESM imports in @github/copilot-sdk for Node 24+ compatibility.
 * 
 * Root cause: @github/copilot-sdk@0.1.32 has inconsistent ESM imports:
 * - session.js imports "vscode-jsonrpc/node" (BROKEN - missing .js extension)
 * - client.js imports "vscode-jsonrpc/node.js" (correct)
 * 
 * Node 24+ enforces strict ESM resolution requiring .js extensions.
 * This is a temporary workaround until copilot-sdk fixes upstream.
 * 
 * Issue: bradygaster/squad#XXX
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Patch session.js in @github/copilot-sdk
 */
function patchCopilotSdk() {
  // Try multiple possible locations (npm workspaces can hoist dependencies)
  const possiblePaths = [
    // squad-cli package node_modules
    join(__dirname, '..', 'node_modules', '@github', 'copilot-sdk', 'dist', 'session.js'),
    // Workspace root node_modules (common with npm workspaces)
    join(__dirname, '..', '..', '..', 'node_modules', '@github', 'copilot-sdk', 'dist', 'session.js'),
    // Global install location (node_modules at parent of package)
    join(__dirname, '..', '..', '@github', 'copilot-sdk', 'dist', 'session.js'),
  ];

  let sessionJsPath = null;
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      sessionJsPath = path;
      break;
    }
  }

  if (!sessionJsPath) {
    // copilot-sdk not installed (maybe optionalDependency or CI without install)
    // This is fine - exit silently
    return false;
  }

  try {
    let content = readFileSync(sessionJsPath, 'utf8');
    
    // Replace extensionless import with .js extension
    const patched = content.replace(
      /from\s+["']vscode-jsonrpc\/node["']/g,
      'from "vscode-jsonrpc/node.js"'
    );

    if (patched !== content) {
      writeFileSync(sessionJsPath, patched, 'utf8');
      console.log('✅ Patched @github/copilot-sdk ESM imports for Node 24+ compatibility');
      return true;
    } else {
      // Already patched or upstream fixed
      return false;
    }
  } catch (err) {
    console.warn('⚠️  Failed to patch @github/copilot-sdk ESM imports:', err.message);
    console.warn('    This may cause issues on Node 24+ if copilot-sdk loads.');
    return false;
  }
}

// Run patch
patchCopilotSdk();
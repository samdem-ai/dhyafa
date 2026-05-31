// Metro config for a pnpm monorepo (Turborepo).
// Reference: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Two levels up: apps/customer → apps → workspace root
const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo so Metro sees packages/* changes.
config.watchFolders = [workspaceRoot];

// 2. Let Metro resolve packages from both the project and the root node_modules.
//    Disable hierarchical lookup so pnpm's hoisting is respected consistently.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Without this, Metro's hierarchical resolution can pick up the wrong version
// of a package when the same dep exists at multiple levels in the tree.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;

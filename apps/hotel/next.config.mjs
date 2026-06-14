import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone server output for slim Docker images. outputFileTracingRoot points
  // at the monorepo root so the trace includes the @dyafa/* workspace packages.
  output: 'standalone',
  outputFileTracingRoot: join(__dirname, '../../'),
  transpilePackages: [
    '@dyafa/design-tokens',
    '@dyafa/i18n',
    '@dyafa/api-client',
    '@dyafa/types',
    '@dyafa/ui',
  ],
};

export default nextConfig;

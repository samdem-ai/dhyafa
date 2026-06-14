import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone server output for slim Docker images. outputFileTracingRoot points
  // at the monorepo root so the trace includes the @dyafa/* workspace packages.
  // The standalone trace-copy uses symlinks, which require elevated privileges on
  // Windows; set DYAFA_DISABLE_STANDALONE=1 to skip it for local Windows builds
  // (Docker/Linux builds keep it on by default).
  output: process.env.DYAFA_DISABLE_STANDALONE ? undefined : 'standalone',
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

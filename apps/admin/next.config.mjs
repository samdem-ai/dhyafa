/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@dyafa/design-tokens',
    '@dyafa/i18n',
    '@dyafa/api-client',
    '@dyafa/types',
  ],
};

export default nextConfig;

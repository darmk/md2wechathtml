import type { NextConfig } from 'next';
import { siteBasePath } from './lib/site-path';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: siteBasePath,
  trailingSlash: true,
};

export default nextConfig;

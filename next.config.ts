import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:lng(en|es)/management/how-to/:slug*',
        destination: '/management/how-to/:slug*',
        permanent: false,
      },
      {
        source: '/:lng(en|es)/management/how-to',
        destination: '/management/how-to',
        permanent: false,
      },
      {
        source: '/:lng(en|es)/management',
        destination: '/management',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

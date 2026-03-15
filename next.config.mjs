/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@huggingface/transformers"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("@huggingface/transformers");
    }
    return config;
  },
};

export default nextConfig;

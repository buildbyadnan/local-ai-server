import type { NextConfig } from "next";

// M13 — this box runs offline: nothing here may reach the network, at
// build time or at runtime. Two Next 16 defaults would otherwise phone
// home, so both are switched off before anything reads them:
//
//   - telemetry (on by default, opt-out) posts to telemetry.nextjs.org;
//     the env var is captured when the Telemetry object is constructed,
//     which happens after this file is loaded — so setting it here covers
//     `next build`, `next dev` and `next start` on every platform, with no
//     shell-specific syntax in the scripts.
//   - experimental.agentUpgrade defaults to "security", which makes every
//     build POST security advisories to registry.npmjs.org.
//
// Verified with strace + a global fetch() hook: zero outbound sockets,
// zero DNS queries, zero fetch calls across a full build.
process.env.NEXT_TELEMETRY_DISABLED ??= "1";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    agentUpgrade: false,
  },
};

export default nextConfig;

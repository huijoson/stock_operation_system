const { execSync } = require('child_process')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Use git commit hash so identical code always produces the same build ID.
  // This prevents _next/static/<buildId> mismatches during rolling restarts.
  generateBuildId: async () => {
    try {
      return execSync('git rev-parse --short HEAD').toString().trim()
    } catch {
      // Stable fallback: prefer Vercel-injected commit SHA, otherwise a fixed string.
      return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local-dev'
    }
  },
}

module.exports = nextConfig

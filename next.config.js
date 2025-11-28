/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cgoisveithzvituzyoga.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cgoisveithzvituzyoga.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig


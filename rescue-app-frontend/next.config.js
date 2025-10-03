/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true, // This is a common default setting, good to keep
	images: {
	  remotePatterns: [
		{
		  // Configuration for your Azure Blob Storage images
		  protocol: 'https',
		  hostname: 'rescueappstorage.blob.core.windows.net', // IMPORTANT: Verify this is your exact storage hostname
		  port: '', // Keep empty for default port
		  pathname: '/animal-images/**', // Allows images from the 'animal-images' container and subfolders
		},
		{
		  // Configuration for Google User Content (often used for Auth0 profile pics)
		  protocol: 'https',
		  hostname: 'lh3.googleusercontent.com',
		  port: '',
		  pathname: '/a/**', // Allows paths starting with /a/ which is common for Google profile pics
		 },
		 // Add any other external image domains you might use here in the future
	  ],
	},
	async rewrites() {
    return [
      {
        // This will match /api/ANYTHING... EXCEPT for /api/auth/...
        source: '/api/:path((?!auth).*)',
        destination: `${process.env.API_BASE_URL}/api/:path*`, // The :path* here will be populated by the value from the source
      },
    ]
  },
  };

  module.exports = nextConfig;

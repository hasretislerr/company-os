import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Tünel servisleri (Localtunnel/Ngrok) üzerinden statik dosyaların 
  // daha güvenli yüklenmesi için assetPrefix boş bırakıldı (relative).
  // Ancak ChunkLoadError için experimental optimizasyonlar eklenebilir.
  experimental: {
    optimisticClientCache: true,
  },
  // Tünel domainlerinde CORS ve hydration sorunlarını azaltmak için
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8086/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:8086/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;

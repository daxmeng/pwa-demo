// 导入 Workbox 模块
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { setCacheNameDetails } from "workbox-core";

// 缓存配置常量
const CACHE_CONFIG = {
  names: {
    images: "bestShort-images-0709",
    cdn: "bestShort-cdn-0709",
    static: "bestShort-static-0709",
    preCache: "bestShort",
  },
  expiration: {
    images: {
      maxEntries: 200,
      purgeOnQuotaError: true,
    },
    cdn: {
      maxEntries: 100,
      purgeOnQuotaError: true,
    },
    static: {
      maxEntries: 100,
      purgeOnQuotaError: true,
    },
  },
  timeout: {
    api: 5,
  },
};

// 资源类型配置
const RESOURCE_TYPES = {
  // images: ["image"],
  // imageExtensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"],
  imageOrigins: ["https://img.staticdj.com"],
  static: ["font"],
  staticExtensions: [".woff", ".woff2", ".ttf", ".eot"],
  cdnOrigins: [
    "https://app-assets.staticdj.com",
    "https://cn.static.shoplazza.com",
    "https://static.staticdj.com",
  ],
};

// 设置缓存名称前缀
setCacheNameDetails({
  prefix: CACHE_CONFIG.names.preCache,
  suffix: "",
});

// 排除checkout预加载资源
const isCheckoutPreloadResource = (pathname) => {
  const excludePaths = ["pm", "apple-pay-sdk.js", "pay.js"];
  return excludePaths.some((path) => pathname.includes(path));
};

// 工具函数：检查是否为图片资源
const isImageResource = ({ request, url }) => {
  return RESOURCE_TYPES.imageOrigins.includes(url.origin);
};

// 工具函数：检查是否为CDN资源
const isCdnResource = ({ url }) => {
  return (
    !isCheckoutPreloadResource(url.pathname) &&
    RESOURCE_TYPES.cdnOrigins.includes(url.origin)
  );
};

// 工具函数：检查是否为静态资源
const isStaticResource = ({ request, url }) => {
  return (
    RESOURCE_TYPES.static.includes(request.destination) ||
    RESOURCE_TYPES.staticExtensions.some((ext) =>
      url.pathname.toLowerCase().endsWith(ext)
    )
  );
};

// 1. 图片资源缓存 - CacheFirst 策略
registerRoute(
  isImageResource,
  new CacheFirst({
    cacheName: CACHE_CONFIG.names.images,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin(CACHE_CONFIG.expiration.images),
    ],
  })
);

// 2. 第三方CDN资源 - CacheFirst 策略
registerRoute(
  isCdnResource,
  new CacheFirst({
    cacheName: CACHE_CONFIG.names.cdn,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      {
        cachedResponseWillBeUsed: async ({ cachedResponse }) => {
          return cachedResponse?.type === "opaque" ? null : cachedResponse;
        },
      },
      new ExpirationPlugin(CACHE_CONFIG.expiration.cdn),
    ],
  })
);

// 3. 静态资源缓存 - CacheFirst 策略
registerRoute(
  isStaticResource,
  new CacheFirst({
    cacheName: CACHE_CONFIG.names.static,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin(CACHE_CONFIG.expiration.static),
    ],
  })
);

// 4. 预缓存关键资源
const precacheManifest = [];
precacheAndRoute(precacheManifest);
console.log("Workbox 缓存策略配置完成");

// Service Worker 生命周期事件处理
self.addEventListener("install", (event) => {
  console.log("Service Worker 安装中...");
  self.skipWaiting(); // 立即激活新版本
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker 激活中...");

  const cacheWhitelist = [
    CACHE_CONFIG.names.html,
    CACHE_CONFIG.names.images,
    CACHE_CONFIG.names.cdn,
    CACHE_CONFIG.names.static,
    `${CACHE_CONFIG.names.preCache}-precache-v2`,
  ];

  event.waitUntil(
    (async () => {
      try {
        const keyList = await caches.keys();
        const deletePromises = keyList
          .filter((key) => !cacheWhitelist.includes(key))
          .map((key) => {
            console.log(`删除旧缓存: ${key}`);
            return caches.delete(key);
          });

        await Promise.all(deletePromises);
        await self.clients.claim(); // 立即控制所有客户端
        console.log("缓存清理完成");
      } catch (error) {
        console.error("缓存清理失败:", error);
      }
    })()
  );
});

// 可选的高级功能配置对象
const ADVANCED_CONFIG = {
  // API 请求缓存配置
  api: {
    enabled: false,
    cacheName: "api-data",
    networkTimeout: CACHE_CONFIG.timeout.api,
    maxEntries: 50,
    maxAge: 10 * 60, // 10分钟
  },

  // 自定义缓存配置
  custom: {
    enabled: false,
    cacheName: "custom-cache",
    maxEntries: 20,
    maxAge: 60 * 60, // 1小时
  },

  // 离线回退配置
  offline: {
    enabled: false,
    htmlFallback: "/offline.html",
    imageFallback: "/images/offline-placeholder.png",
  },

  // 性能监控配置
  monitoring: {
    enabled: false,
  },
};

// 工具函数：获取缓存统计信息
const getCacheStats = async () => {
  try {
    const cacheNames = await caches.keys();
    const cachePromises = cacheNames.map(async (cacheName) => {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      return {
        name: cacheName,
        count: keys.length,
      };
    });

    const results = await Promise.all(cachePromises);
    const totalEntries = results.reduce((sum, cache) => sum + cache.count, 0);

    return {
      caches: results,
      totalEntries,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("获取缓存统计失败:", error);
    return null;
  }
};

// 消息处理器
self.addEventListener("message", async (event) => {
  const { data } = event;

  if (!data?.type) return;

  try {
    switch (data.type) {
      case "GET_CACHE_STATS":
        if (ADVANCED_CONFIG.monitoring.enabled) {
          const stats = await getCacheStats();
          event.ports[0]?.postMessage(stats);
        }
        break;

      case "CLEAR_CACHE":
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        console.log("所有缓存已清除");
        break;

      case "SKIP_WAITING":
        self.skipWaiting();
        break;

      default:
        console.log(`未知消息类型: ${data.type}`);
    }
  } catch (error) {
    console.error(`处理消息失败 (${data.type}):`, error);
  }
});

// 导出配置对象供其他模块使用
export { CACHE_CONFIG, RESOURCE_TYPES, ADVANCED_CONFIG };

// 注释掉的高级功能示例（可根据需要启用）

/*
// API 请求缓存 - NetworkFirst 策略
if (ADVANCED_CONFIG.api.enabled) {
  registerRoute(
    isApiRequest,
    new NetworkFirst({
      cacheName: ADVANCED_CONFIG.api.cacheName,
      networkTimeoutSeconds: ADVANCED_CONFIG.api.networkTimeout,
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new ExpirationPlugin({
          maxEntries: ADVANCED_CONFIG.api.maxEntries,
          maxAgeSeconds: ADVANCED_CONFIG.api.maxAge,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );
}

// 自定义缓存策略
if (ADVANCED_CONFIG.custom.enabled) {
  registerRoute(
    ({ request, url }) => {
      return (
        url.searchParams.has('cache') ||
        request.headers.get('x-cache-control') === 'cache'
      );
    },
    new CacheFirst({
      cacheName: ADVANCED_CONFIG.custom.cacheName,
      plugins: [
        {
          cacheWillUpdate: async ({ response, request }) => {
            if (response.status === 200) {
              console.log(`缓存响应: ${request.url}`);
              return response;
            }
            return null;
          },
          cacheDidUpdate: async ({ request }) => {
            console.log(`缓存已更新: ${request.url}`);
          },
        },
        new ExpirationPlugin({
          maxEntries: ADVANCED_CONFIG.custom.maxEntries,
          maxAgeSeconds: ADVANCED_CONFIG.custom.maxAge,
          purgeOnQuotaError: true,
        }),
      ],
    })
  );
}

// 条件缓存示例
registerRoute(
  /\/dynamic-content\//,
  new NetworkFirst({
    cacheName: 'dynamic-content',
    plugins: [
      {
        cacheWillUpdate: async ({ response, request }) => {
          const cacheControl = response.headers.get('cache-control');
          const noCacheValues = ['no-cache', 'no-store'];
          
          if (cacheControl && noCacheValues.some(value => cacheControl.includes(value))) {
            console.log(`响应标记为不缓存: ${request.url}`);
            return null;
          }

          const contentLength = response.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 1024 * 1024) {
            console.log(`响应过大，不缓存: ${request.url}`);
            return null;
          }

          return response;
        },
      },
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// 离线回退策略
if (ADVANCED_CONFIG.offline.enabled) {
  setCatchHandler(async ({ request }) => {
    if (request.mode === 'navigate') {
      return caches.match(ADVANCED_CONFIG.offline.htmlFallback);
    }

    if (request.destination === 'image') {
      return caches.match(ADVANCED_CONFIG.offline.imageFallback);
    }

    return new Response('离线状态，无法加载资源', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  });
}
*/

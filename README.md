# service-worker

## 构建

`npm run build`

## SW 代码配置

- 把构建产物 sw.js 上传到 cdn，获取地址
- 在 C 端，把上面的 js 地址路径配置到相关 web 页面

## 清理缓存

```js
(function () {
  if ("serviceWorker" in navigator) {
    // 取消注册所有 Service Worker
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });

    // 清除缓存存储
    caches.keys().then((cacheNames) => {
      for (const cacheName of cacheNames) {
        caches.delete(cacheName);
      }
    });
  }
})();
```

- 注册 sw

```js
(function () {
  if ("serviceWorker" in navigator) {
    // 当整个页面及其所有依赖资源（如图片、样式表、脚本等）全部加载完成后触发
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/cdn/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("SW registered");
        });
    });
  }
})();
```

```nginx
location /cdn/sw.js {
  add_header Service-Worker-Allowed /;
}
```

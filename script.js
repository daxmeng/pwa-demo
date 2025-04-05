// 通用安装逻辑
let deferredPrompt;
// 注册 Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js") // 路径需与网站根目录对应
    .then(() => console.log("Service Worker 注册成功"))
    .catch((e) => console.log("Service Worker 注册错误：", e));
}
// 安卓PWA安装事件
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById("installBtn");
  installBtn.style.display = "block";

  installBtn.addEventListener("click", async () => {
    installBtn.style.display = "none";
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("用户响应：", outcome);
    deferredPrompt = null;
  });
});

// 检测iOS且未安装
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  const isStandalone = window.navigator.standalone;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isSafari && !isStandalone) {
    showiOSInstallTip();
  }
}

function showiOSInstallTip() {
  const tip = document.createElement("div");
  tip.innerHTML = `
            <div style="position: fixed; top:120px; background:#fff; padding:15px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.2); z-index: 9999">
                <p>点击底部<img src="share-icon.png" width="20">选择「添加到主屏幕」</p>
                <button onclick="this.parentElement.remove()">关闭</button>
            </div>
        `;
  document.body.appendChild(tip);
}

// 安装完成检测
window.addEventListener("appinstalled", () => {
  console.log("应用已安装");
  document.getElementById("installBtn").style.display = "none";
});

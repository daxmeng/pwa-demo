(function () {
  const addBtn = document.getElementById("installBtn");

  // 通用安装逻辑
  let deferredPrompt;
  function initPWA() {
    console.log("是否支持PWA：", "onbeforeinstallprompt" in window);

    // 安卓PWA安装事件
    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("安卓未加桌");
      e.preventDefault();
      deferredPrompt = e;
      // toggleMainPopup(true);
      addBtn.addEventListener("click", async () => {
        // toggleMainPopup(false);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
      });
    });

    // 安卓安装完成检测
    window.addEventListener("appinstalled", () => {
      console.log("安卓已加桌");
    });

    // 检测IOS且未安装
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      const isStandalone = window.navigator.standalone;
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );
      if (isSafari && !isStandalone) {
        console.log("IOS未加桌");
        // toggleMainPopup(true);
        addBtn.addEventListener("click", async () => {
          // toggleIOSPopup(true);
        });
        // closeBtn.addEventListener("click", function (e) {
        //   toggleIOSPopup(false);
        // });
      }
    }
  }

  initPWA();
})();

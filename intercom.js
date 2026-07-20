(function () {
  var APP_ID = "kzb8vgsq";

  if (typeof window === "undefined") {
    return;
  }

  if (window.__teboIntercomInitialized) {
    return;
  }

  window.__teboIntercomInitialized = true;
  window.intercomSettings = {
    api_base: "https://api-iam.intercom.io",
    app_id: APP_ID,
    alignment: "right",
    horizontal_padding: 24,
    vertical_padding: 24,
  };

  var w = window;
  var existingIntercom = w.Intercom;
  var framesWatchStarted = false;

  function injectIntercomPositionStyles() {
    if (document.getElementById("teboa-intercom-position-styles")) {
      return;
    }

    var style = document.createElement("style");
    style.id = "teboa-intercom-position-styles";
    style.textContent =
      'iframe[name="intercom-notification-stack-frame"] {' +
      "position: fixed !important;" +
      "right: 24px !important;" +
      "left: auto !important;" +
      "bottom: 96px !important;" +
      "top: auto !important;" +
      "transform: none !important;" +
      "}" +
      'iframe[name="intercom-messenger-frame"] {' +
      "max-width: calc(100vw - 32px) !important;" +
      "max-height: calc(100dvh - 96px) !important;" +
      "}" +
      "@media (max-width: 640px) {" +
      'iframe[name="intercom-notification-stack-frame"] {' +
      "right: 16px !important;" +
      "bottom: 80px !important;" +
      "max-width: calc(100vw - 32px) !important;" +
      "}" +
      'iframe[name="intercom-messenger-frame"] {' +
      "width: calc(100vw - 32px) !important;" +
      "max-height: calc(100dvh - 96px) !important;" +
      "}" +
      "}";

    document.head.appendChild(style);
  }

  function positionIntercomFrames() {
    injectIntercomPositionStyles();

    var rightOffset = window.matchMedia("(max-width: 640px)").matches ? "16px" : "24px";
    var bottomOffset = window.matchMedia("(max-width: 640px)").matches ? "80px" : "96px";
    var maxWidth = window.matchMedia("(max-width: 640px)").matches ? "calc(100vw - 32px)" : "";
    var frames = document.querySelectorAll('iframe[name="intercom-notification-stack-frame"]');

    frames.forEach(function (frame) {
      frame.style.setProperty("position", "fixed", "important");
      frame.style.setProperty("right", rightOffset, "important");
      frame.style.setProperty("left", "auto", "important");
      frame.style.setProperty("bottom", bottomOffset, "important");
      frame.style.setProperty("top", "auto", "important");
      frame.style.setProperty("transform", "none", "important");

      if (maxWidth) {
        frame.style.setProperty("max-width", maxWidth, "important");
      }

    });
  }

  function watchIntercomFrames() {
    if (framesWatchStarted) {
      return;
    }

    framesWatchStarted = true;
    positionIntercomFrames();

    var observer = new MutationObserver(positionIntercomFrames);
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", positionIntercomFrames);
    window.setInterval(positionIntercomFrames, 1000);
  }

  if (typeof existingIntercom === "function") {
    existingIntercom("reattach_activator");
    existingIntercom("update", w.intercomSettings);
    watchIntercomFrames();
    return;
  }

  var queue = function () {
    queue.c(arguments);
  };

  queue.q = [];
  queue.c = function (args) {
    queue.q.push(args);
  };

  w.Intercom = queue;
  watchIntercomFrames();

  function loadWidget() {
    if (document.getElementById("teboa-intercom-widget")) {
      return;
    }

    var script = document.createElement("script");
    script.id = "teboa-intercom-widget";
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://widget.intercom.io/widget/" + APP_ID;
    script.onload = watchIntercomFrames;

    var firstScript = document.getElementsByTagName("script")[0];

    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
      return;
    }

    document.head.appendChild(script);
  }

  if (document.readyState === "complete") {
    loadWidget();
  } else if (w.attachEvent) {
    w.attachEvent("onload", loadWidget);
  } else {
    w.addEventListener("load", loadWidget, false);
  }
})();

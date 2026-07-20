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
  };

  var w = window;
  var existingIntercom = w.Intercom;
  var AUTO_SHOW_KEY = "teboa_intercom_auto_shown";

  function scheduleAutoShow() {
    try {
      if (window.sessionStorage.getItem(AUTO_SHOW_KEY) === "1") {
        return;
      }

      window.sessionStorage.setItem(AUTO_SHOW_KEY, "1");
    } catch {
      return;
    }

    window.setTimeout(function () {
      if (typeof w.Intercom === "function") {
        w.Intercom("show");
      }
    }, 6500);
  }

  if (typeof existingIntercom === "function") {
    existingIntercom("reattach_activator");
    existingIntercom("update", w.intercomSettings);
    scheduleAutoShow();
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

  function loadWidget() {
    if (document.getElementById("teboa-intercom-widget")) {
      return;
    }

    var script = document.createElement("script");
    script.id = "teboa-intercom-widget";
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://widget.intercom.io/widget/" + APP_ID;
    script.onload = scheduleAutoShow;

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

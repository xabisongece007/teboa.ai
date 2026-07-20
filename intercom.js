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
    hide_notifications: true,
  };

  var w = window;
  var existingIntercom = w.Intercom;

  function suppressExternalNotifications() {
    if (document.getElementById("teboa-intercom-notification-guard")) {
      return;
    }

    var style = document.createElement("style");
    style.id = "teboa-intercom-notification-guard";
    style.textContent =
      'iframe[name="intercom-notification-stack-frame"],' +
      'iframe[name="intercom-notifications-frame"] {' +
      "display: none !important;" +
      "visibility: hidden !important;" +
      "pointer-events: none !important;" +
      "}";
    document.head.appendChild(style);
  }

  function openMessengerOnce() {
    suppressExternalNotifications();

    try {
      if (sessionStorage.getItem("teboa_intercom_opened_v3") === "1") {
        return;
      }

      sessionStorage.setItem("teboa_intercom_opened_v3", "1");
    } catch {
      return;
    }

    window.setTimeout(function () {
      if (typeof w.Intercom === "function") {
        w.Intercom("hideNotifications", true);
        w.Intercom("show");
      }
    }, 4500);
  }

  if (typeof existingIntercom === "function") {
    existingIntercom("reattach_activator");
    existingIntercom("update", w.intercomSettings);
    existingIntercom("hideNotifications", true);
    openMessengerOnce();
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
  suppressExternalNotifications();
  openMessengerOnce();

  function loadWidget() {
    if (document.getElementById("teboa-intercom-widget")) {
      return;
    }

    var script = document.createElement("script");
    script.id = "teboa-intercom-widget";
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://widget.intercom.io/widget/" + APP_ID;

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

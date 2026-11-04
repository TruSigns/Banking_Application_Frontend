(function () {
  "use strict";

  var APP_CONFIG = {
    // Where the Spring Boot backend will run
    apiBaseUrl: "http://localhost:8080/api",
    // true = in-memory fake data; set to false once the backend is running
    useMockApi: true,
  };

  // Fail fast on a bad config instead of failing on the first request
  if (!APP_CONFIG.useMockApi && !/^https?:\/\//.test(APP_CONFIG.apiBaseUrl)) {
    throw new Error("APP_CONFIG.apiBaseUrl must be an absolute http(s) URL");
  }

  angular
    .module("bankApp")
    .constant("APP_CONFIG", Object.freeze(APP_CONFIG))
    .config([
      "$httpProvider",
      function ($httpProvider) {
        $httpProvider.defaults.headers.common.Accept = "application/json";
      },
    ]);
})();

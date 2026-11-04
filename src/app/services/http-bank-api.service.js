(function () {
  "use strict";

  // Real implementation: calls the Spring Boot REST API
  angular.module("bankApp").factory("HttpBankApi", HttpBankApi);

  HttpBankApi.$inject = ["$http", "APP_CONFIG"];

  function HttpBankApi($http, APP_CONFIG) {
    var base = APP_CONFIG.apiBaseUrl.replace(/\/+$/, "");

    function unwrap(response) {
      return response.data;
    }

    function accountUrl(accountNumber) {
      if (!accountNumber) {
        throw new Error("Account number is required");
      }
      return base + "/accounts/" + encodeURIComponent(accountNumber);
    }

    return {
      listAccounts: function () {
        return $http.get(base + "/accounts").then(unwrap);
      },
      openAccount: function (request) {
        return $http.post(base + "/accounts", request).then(unwrap);
      },
      deposit: function (accountNumber, amount) {
        return $http
          .post(accountUrl(accountNumber) + "/deposit", { amount: amount })
          .then(unwrap);
      },
      withdraw: function (accountNumber, amount) {
        return $http
          .post(accountUrl(accountNumber) + "/withdraw", { amount: amount })
          .then(unwrap);
      },
      transfer: function (request) {
        return $http.post(base + "/transfers", request).then(unwrap);
      },
      transactions: function (accountNumber) {
        return $http
          .get(accountUrl(accountNumber) + "/transactions")
          .then(unwrap);
      },
    };
  }
})();

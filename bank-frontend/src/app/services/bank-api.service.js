(function () {
  "use strict";

  // The controller only ever injects "BankApi"; config decides which implementation it gets
  angular.module("bankApp").factory("BankApi", BankApi);

  BankApi.$inject = ["$injector", "APP_CONFIG"];

  function BankApi($injector, APP_CONFIG) {
    return $injector.get(APP_CONFIG.useMockApi ? "MockBankApi" : "HttpBankApi");
  }
})();

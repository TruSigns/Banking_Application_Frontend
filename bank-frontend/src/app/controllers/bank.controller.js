(function () {
  "use strict";

  angular.module("bankApp").controller("BankController", BankController);

  BankController.$inject = ["BankApi", "FlashService", "APP_CONFIG"];

  function BankController(BankApi, FlashService, APP_CONFIG) {
    var vm = this;

    vm.usingMock = APP_CONFIG.useMockApi;
    vm.accounts = [];
    vm.selected = null;
    vm.transactions = [];
    vm.amount = null;
    vm.newAccount = emptyNewAccount();
    vm.transfer = {};

    vm.select = select;
    vm.openAccount = openAccount;
    vm.deposit = deposit;
    vm.withdraw = withdraw;
    vm.doTransfer = doTransfer;

    perform(function () {
      return refresh();
    });

    // ---- actions ----

    function select(account) {
      vm.selected = account;
      vm.amount = null;
      perform(loadTransactions);
    }

    function openAccount() {
      perform(function () {
        requireText(vm.newAccount.ownerName, "Owner name is required");
        var initial = vm.newAccount.initialDeposit;
        if (initial !== null && initial !== undefined && initial !== 0) {
          requireAmount(initial);
        }
        return BankApi.openAccount({
          ownerName: vm.newAccount.ownerName.trim(),
          type: vm.newAccount.type,
          initialDeposit: initial || 0,
        }).then(function (account) {
          FlashService.success("Opened account " + account.accountNumber);
          vm.newAccount = emptyNewAccount();
          return refresh();
        });
      });
    }

    function deposit() {
      perform(function () {
        requireSelected();
        var amount = requireAmount(vm.amount);
        return BankApi.deposit(vm.selected.accountNumber, amount).then(
          function () {
            FlashService.success("Deposited " + amount.toFixed(2));
            vm.amount = null;
            return refresh();
          },
        );
      });
    }

    function withdraw() {
      perform(function () {
        requireSelected();
        var amount = requireAmount(vm.amount);
        return BankApi.withdraw(vm.selected.accountNumber, amount).then(
          function () {
            FlashService.success("Withdrew " + amount.toFixed(2));
            vm.amount = null;
            return refresh();
          },
        );
      });
    }

    function doTransfer() {
      perform(function () {
        requireText(vm.transfer.fromAccount, "Choose a source account");
        requireText(vm.transfer.toAccount, "Choose a destination account");
        if (vm.transfer.fromAccount === vm.transfer.toAccount) {
          throw new Error("Cannot transfer to the same account");
        }
        var amount = requireAmount(vm.transfer.amount);
        return BankApi.transfer({
          fromAccount: vm.transfer.fromAccount,
          toAccount: vm.transfer.toAccount,
          amount: amount,
        }).then(function () {
          FlashService.success("Transferred " + amount.toFixed(2));
          vm.transfer = {};
          return refresh();
        });
      });
    }

    // ---- data loading ----

    function refresh() {
      return BankApi.listAccounts().then(function (accounts) {
        vm.accounts = accounts;
        if (vm.selected) {
          var number = vm.selected.accountNumber;
          vm.selected =
            accounts.filter(function (a) {
              return a.accountNumber === number;
            })[0] || null;
          if (vm.selected) {
            return loadTransactions();
          }
          vm.transactions = [];
        }
      });
    }

    function loadTransactions() {
      requireSelected();
      return BankApi.transactions(vm.selected.accountNumber).then(
        function (transactions) {
          vm.transactions = transactions;
        },
      );
    }

    // ---- validation (fail fast before any request goes out) ----

    function requireSelected() {
      if (!vm.selected) {
        throw new Error("Select an account first");
      }
    }

    function requireText(value, message) {
      if (!value || !String(value).trim()) {
        throw new Error(message);
      }
    }

    function requireAmount(value) {
      if (typeof value !== "number" || !isFinite(value) || value <= 0) {
        throw new Error("Enter an amount greater than zero");
      }
      if (Math.abs(Math.round(value * 100) - value * 100) > 1e-6) {
        throw new Error("Amount cannot have more than 2 decimal places");
      }
      return value;
    }

    // ---- error plumbing ----

    // Runs an action; synchronous validation errors and rejected promises
    // both end up in the same flash message
    function perform(action) {
      var promise;
      try {
        promise = action();
      } catch (e) {
        FlashService.error(messageFrom(e));
        return;
      }
      if (promise && typeof promise.catch === "function") {
        promise.catch(function (err) {
          FlashService.error(messageFrom(err));
        });
      }
    }

    function messageFrom(err) {
      if (err && err.data && err.data.message) {
        return err.data.message; // backend ApiError body
      }
      if (err && err.status === -1) {
        return "Cannot reach the server at " + APP_CONFIG.apiBaseUrl; // CORS or server down
      }
      if (err && err.message) {
        return err.message; // client-side validation
      }
      return "Request failed";
    }

    function emptyNewAccount() {
      return { ownerName: "", type: "CHECKING", initialDeposit: null };
    }
  }
})();

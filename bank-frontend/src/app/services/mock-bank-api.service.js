(function () {
  "use strict";

  // In-memory stand-in for the backend. Same method names, same response
  // shapes, and same error shape ({ status, data: { message } }) as the real API.
  angular.module("bankApp").factory("MockBankApi", MockBankApi);

  MockBankApi.$inject = ["$q", "$timeout"];

  function MockBankApi($q, $timeout) {
    // Money is stored in integer cents to avoid floating-point drift
    var accounts = [
      {
        accountNumber: "ACC1000000001",
        ownerName: "Alice Johnson",
        type: "CHECKING",
        cents: 150000,
      },
      {
        accountNumber: "ACC1000000002",
        ownerName: "Bob Smith",
        type: "SAVINGS",
        cents: 25000,
      },
      {
        accountNumber: "ACC1000000003",
        ownerName: "Carol Davis",
        type: "SAVINGS",
        cents: 980000,
      },
    ];
    var history = {};
    var nextTransactionId = 1;

    // ---- helpers ----

    function apiError(status, message) {
      var err = new Error(message);
      err.status = status;
      err.data = { status: status, message: message };
      return err;
    }

    // Simulate network latency; any thrown error becomes a rejected promise
    function respond(fn) {
      var deferred = $q.defer();
      $timeout(function () {
        try {
          deferred.resolve(angular.copy(fn()));
        } catch (e) {
          deferred.reject(e);
        }
      }, 150);
      return deferred.promise;
    }

    function toCents(amount) {
      if (typeof amount !== "number" || !isFinite(amount) || amount <= 0) {
        throw apiError(400, "Amount must be greater than zero");
      }
      var cents = Math.round(amount * 100);
      if (Math.abs(cents - amount * 100) > 1e-6) {
        throw apiError(400, "Amount cannot have more than 2 decimal places");
      }
      return cents;
    }

    function find(accountNumber) {
      if (!accountNumber) {
        throw apiError(400, "Account number is required");
      }
      var match = accounts.filter(function (a) {
        return a.accountNumber === accountNumber;
      })[0];
      if (!match) {
        throw apiError(404, "Account not found: " + accountNumber);
      }
      return match;
    }

    function toResponse(a) {
      return {
        accountNumber: a.accountNumber,
        ownerName: a.ownerName,
        type: a.type,
        balance: a.cents / 100,
      };
    }

    function record(account, type, cents, description) {
      var list =
        history[account.accountNumber] || (history[account.accountNumber] = []);
      list.unshift({
        id: nextTransactionId++,
        type: type,
        amount: cents / 100,
        balanceAfter: account.cents / 100,
        description: description,
        createdAt: new Date().toISOString(),
      });
    }

    function withdrawFrom(account, cents) {
      if (account.cents < cents) {
        throw apiError(
          422,
          "Account " +
            account.accountNumber +
            " has insufficient funds: balance " +
            (account.cents / 100).toFixed(2) +
            ", requested " +
            (cents / 100).toFixed(2),
        );
      }
      account.cents -= cents;
    }

    function generateAccountNumber() {
      var digits = String(Math.floor(1e9 + Math.random() * 9e9));
      return "ACC" + digits;
    }

    // ---- API ----

    return {
      listAccounts: function () {
        return respond(function () {
          return accounts.map(toResponse);
        });
      },

      openAccount: function (request) {
        return respond(function () {
          if (
            !request ||
            !request.ownerName ||
            !String(request.ownerName).trim()
          ) {
            throw apiError(400, "ownerName must not be blank");
          }
          if (request.type !== "CHECKING" && request.type !== "SAVINGS") {
            throw apiError(400, "type must not be null");
          }
          var account = {
            accountNumber: generateAccountNumber(),
            ownerName: String(request.ownerName).trim(),
            type: request.type,
            cents: 0,
          };
          var opening = request.initialDeposit;
          if (opening !== null && opening !== undefined && opening !== 0) {
            var cents = toCents(opening);
            account.cents += cents;
            record(account, "DEPOSIT", cents, "Opening deposit");
          }
          accounts.push(account);
          return toResponse(account);
        });
      },

      deposit: function (accountNumber, amount) {
        return respond(function () {
          var cents = toCents(amount);
          var account = find(accountNumber);
          account.cents += cents;
          record(account, "DEPOSIT", cents, "Deposit");
          return toResponse(account);
        });
      },

      withdraw: function (accountNumber, amount) {
        return respond(function () {
          var cents = toCents(amount);
          var account = find(accountNumber);
          withdrawFrom(account, cents);
          record(account, "WITHDRAWAL", cents, "Withdrawal");
          return toResponse(account);
        });
      },

      transfer: function (request) {
        return respond(function () {
          var cents = toCents(request && request.amount);
          if (request.fromAccount === request.toAccount) {
            throw apiError(400, "Cannot transfer to the same account");
          }
          var from = find(request.fromAccount);
          var to = find(request.toAccount);
          withdrawFrom(from, cents);
          to.cents += cents;
          record(
            from,
            "TRANSFER_OUT",
            cents,
            "Transfer to " + to.accountNumber,
          );
          record(
            to,
            "TRANSFER_IN",
            cents,
            "Transfer from " + from.accountNumber,
          );
          return { from: toResponse(from), to: toResponse(to) };
        });
      },

      transactions: function (accountNumber) {
        return respond(function () {
          find(accountNumber);
          return history[accountNumber] || [];
        });
      },
    };
  }
})();

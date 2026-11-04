(function () {
  "use strict";

  // jQuery handles the DOM animation; Angular code just calls success()/error()
  angular.module("bankApp").factory("FlashService", FlashService);

  function FlashService() {
    var $el = null;

    function element() {
      if (!$el) {
        $el = $("#flash");
        if (!$el.length) {
          throw new Error("FlashService: #flash element not found in the page");
        }
      }
      return $el;
    }

    function show(message, isError) {
      element()
        .text(message)
        .toggleClass("error", isError)
        .stop(true, true)
        .hide()
        .fadeIn(150)
        .delay(isError ? 5000 : 3000)
        .fadeOut(400);
    }

    return {
      success: function (message) {
        show(message, false);
      },
      error: function (message) {
        show(message, true);
      },
    };
  }
})();

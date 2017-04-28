/* globals Favico */     // favico.js

/* exported Counter */
var Counter = (function() {

    var selectors = {
        counter: '#alert-count',
        spinner: '#spinner'
    };

    var favicon = false;

    var setCounter = function(val) {
        favicon.badge(val);
        Counter.Show();
        $(selectors.counter).html(val);
        // set alert count css based on the number of alerts
        if (val === 0) {
            $(selectors.counter).removeClass('text-warning text-danger').addClass('text-success');
            document.title = "(◕‿◕)";
        } else if (val < 10) {
            $(selectors.counter).removeClass('text-success text-danger').addClass('text-warning');
            document.title = "(◕_◕)";
        } else {
            $(selectors.counter).removeClass('text-success text-warning').addClass('text-danger');
            document.title = "(◕︵◕)";
        }
    };

    var setUnknown = function() {
        favicon.badge('?');
        Counter.Show();
        $(selectors.counter).html('?');
        $(selectors.counter).removeClass('text-success text-warning text-danger');
    };

    var hide = function() {
        $(selectors.counter).hide();
        $(selectors.spinner).children().removeClass('spinner-success spinner-error');
        $(selectors.spinner).show();
    };

    var show = function() {
        $(selectors.spinner).hide();
        $(selectors.counter).show();
    };

    var markError = function() {
        $(selectors.spinner).children().removeClass('spinner-success').addClass('spinner-error');
    };

    var markSuccess = function() {
        $(selectors.spinner).children().addClass('spinner-success');
    };

    var init = function() {
        favicon = new Favico({
            animation: 'none',
            position: 'up',
            bgColor: '#333',
            textColor: '#ff0'
        });
        Counter.Unknown();
    };

    return {
        Init: init,
        Set: setCounter,
        Unknown: setUnknown,
        Hide: hide,
        Show: show,
        Error: markError,
        Success: markSuccess
    };

})();

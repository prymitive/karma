/* globals Config */

/* exported Grid */
var Grid = (function() {

    var selectors = {
        alerts: "#alerts",
        incident: ".incident",
        gridSizer: ".grid-sizer",
    };

    var grid;

    // when user switches to a different tab but keeps unsee tab open in the background
    // some browsers (like Chrome) will try to apply some forms of throttling for the JS
    // code, to ensure that there are no visual artifacts (like state alerts not removed from the page)
    // redraw all alerts if we detect that the user switches from a different tab to unsee
    var setupPageVisibilityHandler = function() {
        // based on https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
        if (typeof document.hidden !== "undefined" && typeof document.addEventListener !== "undefined") {
            document.addEventListener("visibilitychange", function() {
                if (!document.hidden) {
                    Grid.Redraw();
                }
            }, false);
        }
    };

    var init = function() {
        grid = $(selectors.alerts).masonry({
            itemSelector: selectors.incident,
            columnWidth: selectors.gridSizer,
            percentPosition: true,
            transitionDuration: "0.4s",
            hiddenStyle: {
                opacity: 0
            },
            visibleStyle: {
                opacity: 1
            }
        });
        setupPageVisibilityHandler();
    };

    var clear = function() {
        grid.masonry("remove", $(selectors.incident));
        $(selectors.incident).remove();
    };

    var redraw = function() {
        grid.masonry("layout");
    };

    var remove = function(elem) {
        grid.masonry("remove", elem);
    };

    var append = function(elem) {
        if (Config.GetOption("appendtop").Get()) {
            grid.prepend(elem).masonry("prepended", elem);
        } else {
            grid.append(elem).masonry("appended", elem);
        }
    };

    var items = function() {
        return grid.masonry("getItemElements");
    };

    var hide = function() {
        $(selectors.alerts).hide();
    };

    var show = function() {
        $(selectors.alerts).show();
    };

    return {
        Init: init,
        Clear: clear,
        Hide: hide,
        Show: show,
        Redraw: redraw,
        Append: append,
        Remove: remove,
        Items: items
    };

})();

var Grid = (function(params) {


    var selectors = {
        alerts: '#alerts',
        incident: '.incident',
        gridSizer: '.grid-sizer',
    };

    var grid;


    init = function() {
        grid = $(selectors.alerts).masonry({
            itemSelector: selectors.incident,
            columnWidth: selectors.gridSizer,
            percentPosition: true,
            transitionDuration: '0.4s',
            hiddenStyle: {
                opacity: 0
            },
            visibleStyle: {
                opacity: 1
            }
        });
    }


    clear = function() {
        grid.masonry('remove', $(selectors.incident));
    }


    redraw = function() {
        grid.masonry('layout');
    }


    remove = function(elem) {
        grid.masonry('remove', elem);
    }


    append = function(elem) {
        if (Config.GetOption('appendtop').Get()) {
            grid.prepend(elem).masonry('prepended', elem);
        } else {
            grid.append(elem).masonry('appended', elem);
        }
    }


    items = function() {
        return grid.masonry('getItemElements');
    }


    hide = function() {
        $(selectors.alerts).hide();
    }


    show = function() {
        $(selectors.alerts).show();
    }


    return {
        Init: init,
        Clear: clear,
        Hide: hide,
        Show: show,
        Redraw: redraw,
        Append: append,
        Remove: remove,
        Items: items
    }

})();

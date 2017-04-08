var UI = (function(params) {


    // when user click on any alert label modal popup with a list of possible
    // filter will show, this function is used to setup that modal
    setupModal = function() {
        $('#labelModal').on('show.bs.modal', function(event) {
            Unsee.Pause();
            var modal = $(this);
            var label = $(event.relatedTarget);
            var label_key = label.data('label-key');
            var label_val = label.data('label-val');
            var attrs = Alerts.GetLabelAttrs(label_key, label_val);
            var counter = Summary.Get(label_key, label_val);
            modal.find('.modal-title').html(
                haml.compileHaml('modal-title')({
                    attrs: attrs,
                    counter: counter
                })
            );
            var hints = Autocomplete.GenerateHints(label_key, label_val);
            modal.find('.modal-body').html(haml.compileHaml('modal-body')({
                hints: hints
            }));
            modal.on('click', '.modal-button-filter', function(elem) {
                var filter = $(elem.target).data('filter-append-value');
                $('#labelModal').modal('hide');
                Filters.AddFilter(filter);
            });
        });
        $('#labelModal').on('hidden.bs.modal', function(event) {
            var modal = $(this);
            modal.find('.modal-title').children().remove();
            modal.find('.modal-body').children().remove();
            Unsee.WaitForNextReload();
        });
    }


    // each alert group have a link generated for it, but we hide it until
    // user hovers over that group so it doesn't trash the UI
    setupGroupLinkHover = function(elem) {
        $(elem).on('mouseenter', function() {
            $(this).find('.alert-group-link > a').finish().animate({
                opacity: 100
            }, 200);
        });
        $(elem).on('mouseleave', function() {
            $(this).find('.alert-group-link > a').finish().animate({
                opacity: 0
            }, 200);
        });
    }


    // find all elements inside alert group panel that will use tooltips
    // and setup those
    setupGroupTooltips = function(groupElem) {
        $.each(groupElem.find('[data-toggle=tooltip]'), function(i, elem) {
            $(elem).tooltip({
                animation: false, // slows down tooltip removal
                delay: {
                    show: 500,
                    hide: 0
                },
                title: $(elem).attr('title') || $(elem).data('ts-title'),
                trigger: 'hover'
            });
        });
    }


    setupAlertGroupUI = function(elem) {
        setupGroupLinkHover(elem);
        setupGroupTooltips(elem);
    }


    init = function() {
        setupModal();
    }


    return {
        Init: init,
        SetupAlertGroupUI: setupAlertGroupUI
    }

})();

var UI = (function(params) {


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


    init = function() {
        setupModal();
    }


    return {
        Init: init
    }

})();

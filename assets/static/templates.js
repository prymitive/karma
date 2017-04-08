var Templates = (function(params) {


    var templates = {},
        config = {
          // popover with the list of most common labels
          breakdown: '#breakdown',
          breakdownContent: '#breakdown-content',

          // reload message if backend version bump is detected
          reloadNeeded: '#reload-needed',

          // errors
          fatalError: '#fatal-error',
          internalError: '#internal-error',
          updateError: '#update-error',

          // modal popup with label filters
          modalTitle: '#modal-title',
          modalBody: '#modal-body',

          // label button
          buttonLabel: '#label-button-filter',

          // alert group
          alertGroup: '#alert-group',
          alertGroupTitle: '#alert-group-title',
          alertGroupAnnotations: '#alert-group-annotations',
          alertGroupLabels: '#alert-group-labels',
          alertGroupElements: '#alert-group-elements',
          alertGroupSilence: '#alert-group-silence',
          alertGroupLabelMap: '#alert-group-label-map'
        }


    init = function() {
        $.each(config, function(name, selector) {
            try {
                templates[name] = _.template($(selector).html());
            } catch (err) {
                console.error('Failed to parse template ' + name + ' ' + selector);
                console.error(err);
            }
        });
    }


    renderTemplate = function(name, context) {
        var t = templates[name];
        if (t == undefined) {
            console.error('Unknown template ' + name);
            return '<div class="jumbotron"><h1>Internal error: unknown template ' + name + '</h1></div>';
        }
        try {
          return t(context);
        } catch (err) {
          return '<div class="jumbotron">Failed to render template "' + name + '"<h1><p>' + err + '</p></h1></div>'
        }
    }


    return {
        Init: init,
        Render: renderTemplate
    }

})();

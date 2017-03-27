var Autocomplete = (function() {


    var autocomplete;


    init = function() {
        autocomplete = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.whitespace,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: {
                url: '/autocomplete.json?term=%QUERY',
                wildcard: '%QUERY',
                rateLimitBy: 'throttle',
                rateLimitWait: 300
            }
        });
        autocomplete.initialize();
    }

    reset = function() {
        autocomplete.clear();
    }


    getAutocomplete = function() {
        return autocomplete;
    }


    generateHints = function(label_key, label_val) {
      var hints = [];
      if (label_key == '@silenced') {
        // static list of hints for @silenced label
        hints.push('@silenced=true');
        hints.push('@silenced=false');
      } else {
        // equal and non-equal hints for everything else
        hints.push(label_key + '=' + label_val);
        hints.push(label_key + '!=' + label_val);

        // if there's space in the label generate regexp hints for partials
        if (label_val.toString().indexOf(' ') >= 0) {
          $.each(label_val.toString().split(' '), function(l, label_part){
              hints.push(label_key + '=~' + label_part);
              hints.push(label_key + '!~' + label_part);
          });
        }

        // if value is an int generate  less / more hints
        if ($.isNumeric(label_val)) {
          var valAsNumber = parseInt(label_val);
          if (!isNaN(valAsNumber)) {
            hints.push(label_key + '>' + label_val);
            hints.push(label_key + '<' + label_val);
          }
        }
      }
      return hints;
    }


    return {
        Init: init,
        Reset: reset,
        Autocomplete: getAutocomplete,
        GenerateHints: generateHints
    }

}());

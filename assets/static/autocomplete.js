const Bloodhound = require("corejs-typeahead/dist/bloodhound");
const $ = require("jquery");

var autocomplete;

function init() {
    autocomplete = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        remote: {
            url: "autocomplete.json?term=%QUERY",
            wildcard: "%QUERY",
            rateLimitBy: "throttle",
            rateLimitWait: 300
        },
        sufficient: 12
    });
}

function reset() {
    autocomplete.clear();
}

function getAutocomplete() {
    return autocomplete;
}

// this is used to generate quick filters for label modal
function generateHints(labelKey, labelVal) {
    var hints = [];
    if (labelKey == "@state") {
        // static list of hints for @silenced label
        hints.push("@state=active");
        hints.push("@state=suppressed");
        hints.push("@state=unprocessed");
        hints.push("@state!=active");
        hints.push("@state!=suppressed");
        hints.push("@state!=unprocessed");
    } else {
        // equal and non-equal hints for everything else
        hints.push(labelKey + "=" + labelVal);
        hints.push(labelKey + "!=" + labelVal);

        // if there's space in the label generate regexp hints for partials
        if (labelVal.toString().indexOf(" ") >= 0) {
            $.each(labelVal.toString().split(" "), function(l, labelPart){
                hints.push(labelKey + "=~" + labelPart);
                hints.push(labelKey + "!~" + labelPart);
            });
        }

        // if value is an int generate  less / more hints
        if ($.isNumeric(labelVal)) {
            var valAsNumber = parseInt(labelVal);
            if (!isNaN(valAsNumber)) {
                hints.push(labelKey + ">" + labelVal);
                hints.push(labelKey + "<" + labelVal);
            }
        }
    }
    return hints;
}

exports.init = init;
exports.reset = reset;
exports.getAutocomplete = getAutocomplete;
exports.generateHints = generateHints;

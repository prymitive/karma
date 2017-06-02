/* exported QueryString */
var QueryString = (function() {

    var parse = function() {
        var vars = [],
            hash;
        var q = document.URL.split("?")[1];
        if (q !== undefined) {
            q = q.split("&");
            for (var i = 0; i < q.length; i++) {
                hash = q[i].split("=");
                vars[hash[0]] = hash.slice(1).join("=");
            }
        }
        return vars;
    };

    var update = function(key, value) {
        /* https://gist.github.com/excalq/2961415 */
        var baseUrl = [ location.protocol, "//", location.host, location.pathname ].join(""),
            urlQueryString = document.location.search,
            newParam = key + "=" + value,
            params = "?" + newParam;

        // If the "search" string exists, then build params from it
        if (urlQueryString) {
            var keyRegex = new RegExp("([\?&])" + key + "[^&]*");

            // If param exists already, update it
            if (urlQueryString.match(keyRegex) !== null) {
                params = urlQueryString.replace(keyRegex, "$1" + newParam);
            } else { // Otherwise, add it to end of query string
                params = urlQueryString + "&" + newParam;
            }
        }
        window.history.replaceState({}, "", baseUrl + params);
    };

    var remove = function(key) {
        var baseUrl = [ location.protocol, "//", location.host, location.pathname ].join(""),
            q = QueryString.Parse();
        if (q[key] !== undefined) {
            delete q[key];
            window.history.replaceState({}, "", baseUrl + "?" + $.param(q));
        }
    };

    return {
        Parse: parse,
        Set: update,
        Remove: remove
    };

}());

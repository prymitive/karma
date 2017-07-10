/* globals Unsee */

/* exported Unsilence */
var Unsilence = (function() {

    var selectors = {
        button: "button.silence-delete"
    };

    var unsilenceButtonByID = function(alertmanagerURI, silenceID) {
        var amSelector = "[data-alertmanager-uri='" + alertmanagerURI + "']";
        var silenceSelector = "[data-silence-id='" + silenceID + "']";
        return $(selectors.button + amSelector + silenceSelector);
    };

    var markInProgress = function(alertmanagerURI, silenceID) {
        var elem = unsilenceButtonByID(alertmanagerURI, silenceID);
        elem.attr("title", "Silence is being deleted from Alertmanager");
        elem.tooltip("fixTitle");
        elem.find(".fa").removeClass("fa-times").addClass("fa-refresh fa-spin");
    };

    var markFailed = function(alertmanagerURI, silenceID, xhr) {
        var err = Unsee.ParseAJAXError(xhr, "Failed to delete this silence from Alertmanager");
        var elem = unsilenceButtonByID(alertmanagerURI, silenceID);
        elem.attr("title", err);
        elem.tooltip("fixTitle");
        elem.find(".fa").removeClass("fa-times fa-refresh fa-spin").addClass("fa-exclamation-circle text-danger");

        // Disable button, wait 5s and reset button to the original state
        elem.data("disabled", "true");
        setTimeout(function() {
            elem.find(".fa").removeClass("fa-exclamation-circle text-danger").addClass("fa-times");
            elem.removeData("disabled");
            elem.attr("title", "Delete this silence");
            elem.tooltip("fixTitle");
        }, 5000);
    };

    var markSuccess = function(alertmanagerURI, silenceID) {
        var elem = unsilenceButtonByID(alertmanagerURI, silenceID);
        elem.attr("title", "Silence deleted from Alertmanager");
        elem.tooltip("fixTitle");
        elem.find(".fa").removeClass("fa-times fa-refresh fa-spin").addClass("fa-check-circle text-success");
        // disable button so it's no longer clickable
        elem.data("disabled", "true");
    };

    var deleteSilence = function(alertmanagerURI, silenceID) {
        $.ajax({
            type: "DELETE",
            url: alertmanagerURI + "/api/v1/silence/" + silenceID,
            error: function(xhr) {
                markFailed(alertmanagerURI, silenceID, xhr);
            },
            success: function() {
                markSuccess(alertmanagerURI, silenceID);
            },
            dataType: "json"
        });
    };

    var setupUnsilenceEvents = function() {
        $("body").on("click", selectors.button, function(event) {
            var elem = $(event.currentTarget);

            if (elem.data("disabled")) {
                // if we marked button as disabled then skip all actions
                // we use data attr to keep tooplips working on disabled buttons
                // setting attr(disabled) via jquery disables bootstrap tooltips
                return false;
            }

            // hide tooltip for button that triggers this action
            elem.tooltip("hide");

            var amURI = elem.data("alertmanager-uri");
            var silenceID = elem.data("silence-id");

            // change icon to indicate progress
            markInProgress(amURI, silenceID);

            // send DELETE request to Alertmanager
            deleteSilence(amURI, silenceID);
        });
    };

    return {
        Init: setupUnsilenceEvents
    };

})();

"use strict";

const $ = require("jquery");
const moment = require("moment");

const alerts = require("./alerts");
const colors = require("./colors");
const templates = require("./templates");
const ui = require("./ui");
const unsee = require("./unsee");

function alertmanagerSilencesAPIUrl(prefix) {
    return prefix + "/api/v1/silences";
}

function silenceFormData() {
    var values = $("#newSilenceForm").serializeArray();
    var payload = {
        matchers: [],
        startsAt: "",
        endsAt: "",
        createdBy: "",
        comment: ""
    };
    $.each(values, function(i, elem){
        switch (elem.name) {
        case "comment": case "createdBy":
            payload[elem.name] = elem.value;
            break;
        }
    });
    if ($("#startsAt").data("DateTimePicker")) {
        payload.startsAt = $("#startsAt").data("DateTimePicker").date();
    }
    if ($("#endsAt").data("DateTimePicker")) {
        payload.endsAt = $("#endsAt").data("DateTimePicker").date();
    }
    $.each($("#newSilenceForm select.silence-label-picker"), function(i, elem) {
        var labelKey = $(elem).data("label-key");
        var values = $(elem).selectpicker("val");
        if (values && values.length > 0) {
            var pval;
            var isRegex = false;
            if (values.length > 1) {
                pval = "^(?:" + values.join("|") + ")$";
                isRegex = true;
            } else {
                pval = values[0];
            }
            payload.matchers.push({
                name: labelKey,
                value: pval,
                isRegex: isRegex
            });
        }
    });
    return payload;
}

function silenceFormCalculateDuration() {
    // skip if datetimepicker isn't ready yet
    if (!$("#startsAt").data("DateTimePicker") || !$("#endsAt").data("DateTimePicker")) return false;

    var startsAt = $("#startsAt").data("DateTimePicker").date();
    var endsAt = $("#endsAt").data("DateTimePicker").date();

    var totalDays = (endsAt.diff(startsAt, "days"));
    var totalHours = (endsAt.diff(startsAt, "hours")) % 24;
    var totalMinutes = endsAt.diff(startsAt, "minutes") % 60;
    $("#silence-duration-days").html(totalDays);
    $("#silence-duration-hours").html(totalHours);
    $("#silence-duration-minutes").html(totalMinutes);

    var startsAtDesc = moment().to(startsAt);
    startsAtDesc = startsAtDesc.replace("in a few seconds", "now");
    startsAtDesc = startsAtDesc.replace("a few seconds ago", "now");
    $("#silence-start-description").html(startsAtDesc);

    var endsAtDesc = moment().to(endsAt);
    endsAtDesc = endsAtDesc.replace("in a few seconds", "now");
    endsAtDesc = endsAtDesc.replace("a few seconds ago", "now");
    $("#silence-end-description").html(endsAtDesc);
}

function silenceFormAlertmanagerURL() {
    return $("#newSilenceForm .silence-alertmanager-picker").selectpicker("val");
}

function silenceFormJSONRender() {
    var d = [];
    $.each(silenceFormAlertmanagerURL(), function(i, uri) {
        if (i > 0) {
            d.push("\n");
        }
        d.push("curl " + alertmanagerSilencesAPIUrl(uri));
    });
    d.push("\n  -X POST --data ");
    d.push(JSON.stringify(silenceFormData(), undefined, 2));
    $("#silenceJSONBlob").html(d.join(""));
}

function silenceFormUpdateDuration(event) {
    // skip if datetimepicker isn't ready yet
    if (!$("#startsAt").data("DateTimePicker") || !$("#endsAt").data("DateTimePicker")) return false;

    var startsAt = $("#startsAt").data("DateTimePicker").date();
    var endsAt = $("#endsAt").data("DateTimePicker").date();
    var endsAtMinDate = $("#endsAt").data("DateTimePicker").minDate();
    var action = $(event.target).data("duration-action");
    var unit = $(event.target).data("duration-unit");
    var step = parseInt($(event.target).data("duration-step"));

    // re-calculate step for low values
    // if we have 5 minute step and current duration is 1 minute than clicking
    // on the increment should give us 5 minute, not 6 minute duration
    var totalValue = (endsAt.diff(startsAt, unit));
    switch (unit) {
    case "hours":
        totalValue = totalValue % 24;
        break;
    case "minutes":
        totalValue = totalValue % 60;
        break;
    }

    if (action == "increment") {
        // if step is 5 minute and current value is 3 than set 5 minutes, not 8
        if (step > 1 && totalValue < step) {
            step = step - totalValue;
        }
        endsAt.add(step, unit);
    } else {
        // if step is 5 minute and current value is 3 than set 0 minutes
        if (totalValue > 0 && step > 1 && totalValue < step) {
            step = totalValue;
        }
        endsAt.subtract(step, unit);
        if (endsAt < endsAtMinDate) {
            // if decrement would result in a timestamp lower than allowed minimum
            // then just reset it to the minimum
            endsAt = endsAtMinDate;
        }
    }
    $("#endsAt").data("DateTimePicker").date(endsAt);
    silenceFormCalculateDuration();
}

function sendSilencePOST(url, payload) {
    var elem = $(".silence-post-result[data-uri='" + url + "']");
    $.ajax({
        type: "POST",
        url: alertmanagerSilencesAPIUrl(url),
        data: JSON.stringify(payload),
        error: function(xhr, textStatus) {
            var err = unsee.parseAJAXError(xhr, textStatus);
            var errContent = templates.renderTemplate("silenceFormError", {error: err});
            $(elem).html(errContent);
        },
        success: function(data) {
            if (data.status == "success") {
                $(elem).html(templates.renderTemplate("silenceFormSuccess", {
                    silenceID: data.data.silenceId
                }));
            } else {
                var err = "Invalid response from Alertmanager API: " + JSON.stringify(data);
                var errContent = templates.renderTemplate("silenceFormError", {error: err});
                $(elem).html(errContent);
            }
        },
        dataType: "json"
    });
}

// modal form for creating new silences
function setupSilenceForm() {
    var modal = $("#silenceModal");
    modal.on("show.bs.modal", function(event) {
        var elem = $(event.relatedTarget);
        // hide tooltip for button that triggers this modal
        elem.find("[data-toggle]").tooltip("hide");
        unsee.pause();
        modal.find(".modal-body").html(
            templates.renderTemplate("silenceFormLoading", {})
        );
        var elemLabels = {};
        $.each(elem.data("labels").split(","), function(i, l) {
            elemLabels[l.split("=")[0]] = l.split("=")[1];
        });
        $.ajax({
            url: "alerts.json?q=alertname=" + elem.data("alertname"),
            error: function(xhr, textStatus) {
                var err = unsee.parseAJAXError(xhr, textStatus);
                modal.find(".modal-body").html(
                    templates.renderTemplate("silenceFormFatal", {error: err})
                );
            },
            success: function(data) {
                // add colors from the response to global color set
                colors.merge(data.colors);
                var modal = $("#silenceModal");
                var labels = {};
                var alertmanagers = {};
                $.each(data.groups, function(i, group) {
                    $.each(group.alerts, function(j, alert) {
                        $.each(alert.labels, function(labelKey, labelVal) {
                            if (labels[labelKey] === undefined) {
                                labels[labelKey] = {};
                            }
                            if (labels[labelKey][labelVal] === undefined) {
                                labels[labelKey][labelVal] = {
                                    key: labelKey,
                                    value: labelVal,
                                    attrs: alerts.getLabelAttrs(labelKey, labelVal),
                                    selected: elemLabels[labelKey] == labelVal
                                };
                            }
                        });
                        $.each(alert.alertmanager, function(i, alertmanager){
                            alertmanagers[alertmanager.name] = alertmanager;
                        });
                    });
                });
                modal.find(".modal-body").html(
                    templates.renderTemplate("silenceForm", {
                        labels: labels,
                        alertmanagers: alertmanagers,
                        selectedAlertmanagers: elem.data("alertmanagers").split(",")
                    })
                );
                $.each($(".silence-alertmanager-picker"), function(i, elem) {
                    $(elem).selectpicker();
                });
                $.each($(".silence-label-picker"), function(i, elem) {
                    $(elem).selectpicker({
                        noneSelectedText: "<span class='label label-list label-default'>" + $(this).data("label-key") + ": </span>",
                        countSelectedText: function (numSelected) {
                            return "<span class='label label-list label-warning'>" +
                                $(elem).data("label-key") + ": " + numSelected + " values selected</span>";
                        }
                    });
                });
                $(".datetime-picker").datetimepicker({
                    format: "YYYY-MM-DD HH:mm",
                    icons: {
                        time: "fa fa-clock-o",
                        date: "fa fa-calendar",
                        up: "fa fa-chevron-up",
                        down: "fa fa-chevron-down",
                        previous: "fa fa-chevron-left",
                        next: "fa fa-chevron-right",
                        today: "fa fa-asterisk",
                        clear: "fa fa-undo",
                        close: "fa fa-close"
                    },
                    minDate: moment(),
                    sideBySide: true,
                    inline: true
                });
                ui.setupGroupTooltips($("#newSilenceForm"));
                $(".select-label-badge").on("click", function() {
                    var select = $(this).parent().parent().find("select");
                    if (select.selectpicker("val").length) {
                        // if there's anything selected deselect all
                        select.selectpicker("deselectAll");
                    } else {
                        // else select all
                        select.selectpicker("selectAll");
                    }
                });
                // set endsAt minDate to now + 1 minute
                $("#endsAt").data("DateTimePicker").minDate(moment().add(1, "minute"));
                // set endsAt time to +1 hour
                $("#endsAt").data("DateTimePicker").date(moment().add(1, "hours"));
                // whenever startsAt changes set it as the minDate for endsAt
                // we can't have endsAt < startsAt
                $("#newSilenceForm").on("dp.change", "#startsAt", function(){
                    if (!$("#startsAt").data("DateTimePicker")) return false;
                    var startsAt = $("#startsAt").data("DateTimePicker").date();
                    // endsAt needs to be at least 1 minute after startsAt
                    startsAt.add(1, "minute");
                    $("#endsAt").data("DateTimePicker").minDate(startsAt);
                });
                $("#newSilenceForm").on("click", "a.silence-duration-btn", silenceFormUpdateDuration);
                $("#newSilenceForm").on("show.bs.collapse, dp.change", function () {
                    silenceFormJSONRender();
                    silenceFormCalculateDuration();
                });
                $("#newSilenceForm").on("change", function () {
                    silenceFormJSONRender();
                });
                $("#newSilenceForm").submit(function(event) {
                    var payload = silenceFormData();
                    if (payload.matchers.length === 0) {
                        var errContent = templates.renderTemplate("silenceFormValidationError", {error: "Select at least on label"});
                        $("#newSilenceAlert").html(errContent).removeClass("hidden");
                        return false;
                    }
                    $("#newSilenceAlert").addClass("hidden");

                    var selectedAMURIs = silenceFormAlertmanagerURL();
                    var selectedAMs = [];
                    $.each(alertmanagers, function(i, am) {
                        if ($.inArray(am.uri, selectedAMURIs) >= 0) {
                            selectedAMs.push(am);
                        }
                    });
                    modal.find(".modal-body").html(
                        templates.renderTemplate("silenceFormResults", {alertmanagers: selectedAMs})
                    );

                    $.each(selectedAMURIs, function(i, uri){
                        sendSilencePOST(uri, payload);
                    });

                    event.preventDefault();
                });
                silenceFormCalculateDuration();
                silenceFormJSONRender();
            }
        });

    });
    modal.on("hidden.bs.modal", function() {
        var modal = $(this);
        modal.find(".modal-body").children().remove();
        unsee.resume();
    });
}

exports.setupSilenceForm = setupSilenceForm;
exports.sendSilencePOST = sendSilencePOST;

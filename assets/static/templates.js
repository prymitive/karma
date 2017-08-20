"use strict";

const $ = require("jquery");
const _ = require("underscore");
const moment = require("moment");
require("javascript-linkify");

const alerts = require("./alerts");

var templates = {},
    config = {
        // popover with the list of most common labels
        breakdown: "#breakdown",
        breakdownContent: "#breakdown-content",

        // reload message if backend version bump is detected
        reloadNeeded: "#reload-needed",

        // errors
        fatalError: "#fatal-error",
        internalError: "#internal-error",
        updateError: "#update-error",
        instanceError: "#instance-error",
        configError: "#configuration-error",

        // modal popup with label filters
        modalTitle: "#modal-title",
        modalBody: "#modal-body",

        // modal popup with silence form
        silenceForm: "#silence-form",
        silenceFormValidationError: "#silence-form-validation-error",
        silenceFormResults: "#silence-form-results",
        silenceFormSuccess: "#silence-form-success",
        silenceFormError: "#silence-form-error",
        silenceFormFatal: "#silence-form-fatal",
        silenceFormLoading: "#silence-form-loading",

        // alert partials
        buttonLabel: "#label-button-filter",
        alertAnnotation: "#alert-annotation",

        // alert group
        alertGroup: "#alert-group",
        alertGroupTitle: "#alert-group-title",
        alertGroupAnnotations: "#alert-group-annotations",
        alertGroupLabels: "#alert-group-labels",
        alertGroupElements: "#alert-group-elements",
        alertGroupSilence: "#alert-group-silence",
        alertGroupLabelMap: "#alert-group-label-map",

        // history dropdown
        historyMenu: "#history-menu",
        historyMenuItem: "#history-menu-item"
    };

function getConfig() {
    return config;
}

function loadTemplate(name, selector) {
    try {
        templates[name] = _.template($(selector).html());
    } catch (err) {
        console.error("Failed to parse template " + name + " " + selector);
        console.error(err);
    }
}

function init() {
    $.each(config, function(name, selector) {
        loadTemplate(name, selector);
    });
}

function renderTemplate(name, context) {
    context["moment"] = moment;
    context["linkify"] = window.linkify;
    context["renderTemplate"] = renderTemplate;
    context["sortMapByKey"] = alerts.sortMapByKey;
    context["getLabelAttrs"] = alerts.getLabelAttrs;
    var t = templates[name];
    if (t === undefined) {
        console.error("Unknown template " + name);
        return "<div class='jumbotron'><h1>Internal error: unknown template " + name + "</h1></div>";
    }
    try {
        return t(context);
    } catch (err) {
        return "<div class='jumbotron'>Failed to render template " + name + "<h1><p>" + err + "</p></h1></div>";
    }
}

exports.init = init;
exports.getConfig = getConfig;
exports.loadTemplate = loadTemplate;
exports.renderTemplate = renderTemplate;

"use strict";

const $ = require("jquery");

const alerts = require("./alerts");
const autocomplete = require("./autocomplete");
const filters = require("./filters");
const grid = require("./grid");
const summary = require("./summary");
const templates = require("./templates");
const unsee = require("./unsee");

// when user click on any alert label modal popup with a list of possible
// filter will show, this function is used to setup that modal
function setupModal() {
    $("#labelModal").on("show.bs.modal", function(event) {
        unsee.pause();
        var modal = $(this);
        var label = $(event.relatedTarget);
        var labelKey = label.data("label-key");
        var labelVal = label.data("label-val");
        var attrs = alerts.getLabelAttrs(labelKey, labelVal);
        var counter = summary.getCount(labelKey, labelVal);
        modal.find(".modal-title").html(
            templates.renderTemplate("modalTitle", {
                attrs: attrs,
                counter: counter
            })
        );
        var hints = autocomplete.generateHints(labelKey, labelVal);
        modal.find(".modal-body").html(
            templates.renderTemplate("modalBody", {hints: hints})
        );
        $(".modal-table").on("click", ".modal-button-filter", function(elem) {
            var filter = $(elem.target).data("filter-append-value");
            $("#labelModal").modal("hide");
            filters.addFilter(filter);
        });
    });
    $("#labelModal").on("hidden.bs.modal", function() {
        var modal = $(this);
        modal.find(".modal-title").children().remove();
        modal.find(".modal-body").children().remove();
        unsee.resume();
    });
}

// each alert group have a link generated for it, but we hide it until
// user hovers over that group so it doesn"t trash the UI
function setupGroupLinkHover(elem) {
    $(elem).on("mouseenter", function() {
        $(this).find(".alert-group-link > a").finish().animate({
            opacity: 100
        }, 200);
    });
    $(elem).on("mouseleave", function() {
        $(this).find(".alert-group-link > a").finish().animate({
            opacity: 0
        }, 200);
    });
}

// find all elements inside alert group panel that will use tooltips
// and setup those
function setupGroupTooltips(groupElem) {
    $.each(groupElem.find("[data-toggle=tooltip]"), function(i, elem) {
        $(elem).tooltip({
            animation: false, // slows down tooltip removal
            delay: {
                show: 500,
                hide: 0
            },
            title: $(elem).attr("title") || $(elem).data("ts-title"),
            trigger: "hover"
        });
    });
}

function setupGroupAnnotationToggles(groupElem) {
    $(groupElem).on("click", "[data-toggle=toggle-hidden-annotation]", function() {
        var alert = $(this).parent();
        var icon = $(this).find("i.fa");
        var showingHidden = icon.hasClass("fa-search-minus");
        if (showingHidden) {
            // we're currently showing hidden annotations, so the action is to hide them
            icon.removeClass("fa-search-minus").addClass("fa-search-plus");
            $.each(alert.find(".hidden-annotation"), function(i, annotation){
                $(annotation).addClass("hidden");
            });
        } else {
            // we're currently hiding hidden annotations, so the action is to show them
            icon.removeClass("fa-search-plus").addClass("fa-search-minus");
            $.each(alert.find(".hidden-annotation"), function(i, annotation){
                $(annotation).removeClass("hidden");
            });
        }
        grid.redraw();
    });
}

exports.setupModal = setupModal;
exports.setupGroupTooltips = setupGroupTooltips;
exports.setupGroupLinkHover = setupGroupLinkHover;
exports.setupGroupAnnotationToggles = setupGroupAnnotationToggles;

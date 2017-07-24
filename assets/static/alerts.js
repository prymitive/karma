/* globals LRUCache */     // lru.js
/* globals moment */     // moment.js

/* globals Autocomplete, Colors, Config, Counter, Grid, Templates, Summary, UI, Unsee */

/* exported Alerts */
var Alerts = (function() {

    var labelCache = new LRUCache(1000);

    function AlertGroup(groupData) {
        $.extend(this, groupData);
    }

    AlertGroup.prototype.Render = function() {
        return Templates.Render("alertGroup", {
            group: this,
            alertLimit: 5
        });
    };

    // called after group was rendered for the first time
    AlertGroup.prototype.Added = function() {
        UI.SetupAlertGroupUI($("#" + this.id));
    };

    AlertGroup.prototype.Update = function() {
        // hide popovers in this group
        $("#" + this.id + " [data-label-type='filter']").popover("hide");

        // remove all elements prior to content update to purge all event listeners and hooks
        $.each($("#" + this.id).find(".panel-body, .panel-heading"), function(i, elem) {
            $(elem).remove();
        });

        $("#" + this.id).html($(this.Render()).html());
        $("#" + this.id).data("hash", this.hash);

        // pulse the badge to show that group content was changed, repeat it twice
        $("#" + this.id + " > .panel > .panel-heading > .badge:in-viewport").finish().fadeOut(300).fadeIn(300).fadeOut(300).fadeIn(300);
    };


    var destroyGroup = function(groupID) {
        $("#" + groupID + " [data-label-type='filter']").popover("hide");
        $("#" + groupID + " [data-toggle='tooltip']").tooltip("hide");
        $.each($("#" + groupID).find(".panel-body, .panel-heading"), function(i, elem) {
            $(elem).remove();
        });
        Grid.Remove($("#" + groupID));
    };

    var sortMapByKey = function(mapToSort) {
        var keys = Object.keys(mapToSort);
        keys.sort();
        var sorted = [];
        $.each(keys, function(i, key) {
            sorted.push({
                key: key,
                value: mapToSort[key],
                text: key + ": " + mapToSort[key]
            });
        });
        return sorted;
    };

    var labelAttrs = function(key, value) {
        var label = key + ": " + value;

        var attrs = labelCache.get(label);
        if (attrs !== undefined) return attrs;

        attrs = {
            text: label,
            class: "label label-list " + Colors.GetClass(key, value),
            style: Colors.Get(key, value)
        };
        labelCache.set(label, attrs);
        return attrs;
    };

    var humanizeTimestamps = function() {
        var now = moment();
        // change timestamp labels to be relative
        $.each($(".label-ts"), function(i, elem) {
            var ts = moment($(elem).data("ts"), moment.ISO_8601);
            var label = ts.fromNow();
            $(elem).find(".label-ts-span").text(label);
            $(elem).attr("data-ts-title", ts.toString());
            var tsAge = now.diff(ts, "minutes");
            if (tsAge >= 0 && tsAge < 3) {
                $(elem).addClass("recent-alert").find(".incident-indicator").removeClass("hidden");
            } else {
                $(elem).removeClass("recent-alert").find(".incident-indicator").addClass("hidden");
            }
        });

        // flash recent alerts
        $(".recent-alert:in-viewport").finish().fadeToggle(300).fadeToggle(300).fadeToggle(300).fadeToggle(300);
    };

    var updateAlerts = function(apiResponse) {
        var alertCount = 0;
        var groups = {};

        var summaryData = {};
        $.each(apiResponse.counters, function(labelKey, counters){
            $.each(counters, function(labelVal, hits){
                summaryData[labelKey + ": " + labelVal] = hits;
            });
        });
        Summary.Update(summaryData);

        $.each(apiResponse.groups, function(i, groupData) {
            var alertGroup = new AlertGroup(groupData);
            groups[alertGroup.id] = alertGroup;
            alertCount += alertGroup.alerts.length;
        });

        Counter.Set(alertCount);
        Grid.Show();

        var dirty = false;

        // handle already existing groups
        $.each(Grid.Items(), function(i, existingGroup) {
            var group = groups[existingGroup.id];
            if (group !== undefined) {
                // group still present, check if changed
                if (group.hash != existingGroup.dataset.hash) {
                    // group was updated, render changes
                    group.Update();
                    existingGroup.dataset.hash = group.hash;
                    dirty = true;

                    // https://github.com/twbs/bootstrap/issues/16376
                    setTimeout(function() {
                        group.Added();
                    }, 1000);
                }
            } else {
                // group is gone, destroy it
                destroyGroup(existingGroup.id);
                dirty = true;
            }
            // remove from groups dict as we're done with it
            delete groups[existingGroup.id];
        });

        // render new groups
        var content = [];
        $.each(groups, function(id, group) {
            content.push(group.Render());
        });
        // append new groups in chunks
        if (content.length > 0) {
            Grid.Append($(content.splice(0, 100).join("\n")));
            dirty = true;
        }

        // always refresh timestamp labels
        humanizeTimestamps();

        $.each(groups, function(id, group) {
            group.Added();
        });

        if (dirty) {
            Autocomplete.Reset();
            Grid.Redraw();
            if (Config.GetOption("flash").Get()) {
                Unsee.Flash();
            }
        }

    };

    return {
        Update: updateAlerts,
        SortMapByKey: sortMapByKey,
        GetLabelAttrs: labelAttrs
    };

}());

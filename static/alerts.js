var Alerts = (function() {


    var silences = {},
        labelCache = new LRUMap(1000);


    class AlertGroup {
        constructor(groupData) {
            $.extend(this, groupData);
        }

        Render() {
            return haml.compileHaml('groups')({
                group: this,
                silences: silences,
                static_color_label: Colors.GetStaticLabels(),
                alert_limit: 5
            });
        }

        // called after group was rendered for the first time
        Added() {
            var groupID = '#' + this.id;
            $.each($(groupID).find('[data-toggle=tooltip]'), function(i, elem) {
                $(elem).tooltip({
                    animation: false, // slows down tooltip removal
                    delay: {
                        show: 500,
                        hide: 0
                    },
                    title: $(elem).attr('title') || $(elem).data('ts-title'),
                    trigger: 'hover'
                });
            });
        }

        Update() {
            // hide popovers in this group
            $('#' + this.id + ' [data-label-type="filter"]').popover('hide');

            // remove all elements prior to content update to purge all event listeners and hooks
            $.each($('#' + this.id).find('.panel-body, .panel-heading'), function(i, elem) {
                $(elem).remove();
            });

            $('#' + this.id).html($(this.Render()).html());
            $('#' + this.id).data('hash', this.hash);

            // pulse the badge to show that group content was changed, repeat it twice
            $('#' + this.id + ' > .panel > .panel-heading > .badge:in-viewport').finish().fadeOut(300).fadeIn(300).fadeOut(300).fadeIn(300);
        }

    }


    destroyGroup = function(groupID) {
        $('#' + groupID + ' [data-label-type="filter"]').popover('hide');
        $('#' + groupID + ' [data-toggle=tooltip]').tooltip('hide');
        $.each($('#' + groupID).find('.panel-body, .panel-heading'), function(i, elem) {
            $(elem).remove();
        });
        Grid.Remove($('#' + groupID));
    }


    sortMapByKey = function(mapToSort) {
        var keys = Object.keys(mapToSort);
        keys.sort();
        var sorted = [];
        $.each(keys, function(i, key) {
            sorted.push({
                key: key,
                value: mapToSort[key],
                text: key + ': ' + mapToSort[key]
            });
        });
        return sorted;
    }


    labelAttrs = function(key, value) {
        var label = key + ': ' + value;

        var attrs = labelCache.get(label);
        if (attrs != undefined) return attrs;

        attrs = {
            text: label,
            class: 'label label-list ' + Colors.GetClass(key, value),
            style: Colors.Get(key, value)
        }
        labelCache.set(label, attrs);
        return attrs;
    }


    humanizeTimestamps = function() {
        var now = moment();
        // change timestamp labels to be relative
        $.each($('.label-ts'), function(i, elem) {
            var ts = moment($(elem).data('ts'), moment.ISO_8601);
            var label = ts.fromNow();
            $(elem).find('.label-ts-span').text(label);
            $(elem).attr('data-ts-title', ts.toString());
            var ts_age = now.diff(ts, 'minutes');
            if (ts_age < 3) {
                $(elem).addClass('recent-alert').find('.incident-indicator').removeClass('hidden');
            } else {
                $(elem).removeClass('recent-alert').find('.incident-indicator').addClass('hidden');
            }
        });

        // flash recent alerts
        $('.recent-alert:in-viewport').finish().fadeToggle(300).fadeToggle(300).fadeToggle(300).fadeToggle(300);
    }


    updateAlerts = function(apiResponse) {
        var alertCount = 0;
        var groups = {};

        // update global silences dict as it's needed for rendering
        silences = apiResponse['silences'];

        var summaryData = {};
        $.each(apiResponse['counters'], function(label_key, counters){
            $.each(counters, function(label_val, hits){
                summaryData[label_key + ': ' + label_val] = hits;
            });
        });
        Summary.Update(summaryData);

        $.each(apiResponse['groups'], function(i, groupData) {
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
            if (group != undefined) {
                // group still present, check if changed
                if (group.hash != existingGroup.dataset.hash) {
                    // group was updated, render changes
                    group.Update();
                    existingGroup.dataset.hash = group.hash;
                    dirty = true;

                    // https://github.com/twbs/bootstrap/issues/16376
                    setTimeout(function() {
                        group.Added()
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
            Grid.Append($(content.splice(0, 100).join('\n')));
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
            if (Config.GetOption('flash').Get()) {
                Unsee.Flash();
            }
        }

    }


    return {
        Update: updateAlerts,
        SortMapByKey: sortMapByKey,
        GetLabelAttrs: labelAttrs
    }

}());

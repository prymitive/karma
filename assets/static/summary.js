/* globals Colors, Templates */

/* exported Summary */
var Summary = (function() {

    var summary;

    var render = function() {
        var top_tags = [];
        $.each(summary, function(k, v) {
            top_tags.push({
                name: k,
                val: v
            });
        });
        top_tags.sort(function(a, b) {
            if (a.val > b.val) return 1;
            if (a.val < b.val) return -1;
            if (a.name > b.name) return -1;
            if (a.name < b.name) return 1;
            return 0;
        }).reverse();

        var tags = [];
        $.each(top_tags.slice(0, 10), function(i, tag) {
            var label_key = tag.name.split(": ")[0];
            var label_val = tag.name.split(": ")[1];
            tag.style = Colors.Get(label_key, label_val);
            tag.cls = Colors.GetClass(label_key, label_val);
            tags.push(tag);
        });

        return Templates.Render("breakdownContent", {tags: tags});
    };

    var init = function() {
        summary = {};
        $(".navbar-header").popover({
            trigger: "hover",
            delay: {
              "show": 500,
              "hide": 100
            },
            container: "body",
            html: true,
            placement: "bottom",
            title: "Top labels",
            content: render,
            template: Templates.Render("breakdown", {})
        });
    };

    var update = function(data) {
        summary = data;
    };

    var reset = function() {
        summary = {};
        render();
    };

    var push = function(labelKey, labelVal) {
        var l = labelKey + ": " + labelVal;
        if (summary[l] === undefined) {
            summary[l] = 1;
        } else {
            summary[l]++;
        }
    };

    var getCount = function(labelKey, labelVal) {
        var l = labelKey + ": " + labelVal;
        return summary[l];
    };

    return {
        Init: init,
        Update: update,
        Reset: reset,
        Push: push,
        Get: getCount
    };

}());

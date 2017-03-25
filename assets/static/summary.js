var Summary = (function() {


    var summary;

    render = function() {
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
            var label_key = tag.name.split(': ')[0];
            var label_val = tag.name.split(': ')[1];
            tag.style = Colors.Get(label_key, label_val);
            tag.cls = Colors.GetClass(label_key, label_val);
            tags.push(tag);
        });

        return haml.compileHaml('breakdown-content')({
            tags: tags
        });
    }


    init = function() {
        summary = {};
        $('.navbar-header').popover({
            trigger: 'hover',
            container: 'body',
            html: true,
            placement: 'bottom',
            title: 'Top labels',
            content: render,
            template: haml.compileHaml('breakdown')()
        });
    }


    update = function(data) {
        summary = data;
    }


    reset = function() {
        summary = {};
        render();
    }


    push = function(labelKey, labelVal) {
        var l = labelKey + ': ' + labelVal;
        if (summary[l] == undefined) {
            summary[l] = 1;
        } else {
            summary[l]++;
        }
    }

    getCount = function(labelKey, labelVal) {
        var l = labelKey + ': ' + labelVal;
        return summary[l];
    }


    return {
        Init: init,
        Update: update,
        Reset: reset,
        Push: push,
        Get: getCount
    }

}());

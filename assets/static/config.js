var Option = (function(params) {


    class optionClass {

        constructor(params) {
            this.Cookie = params.Cookie;
            this.QueryParam = params.QueryParam;
            this.Selector = params.Selector;
            this.Get = params.Getter || function() {
                return $(this.Selector).is(":checked");
            };
            this.Set = params.Setter || function(val) {
                $(this.Selector).bootstrapSwitch('state', $.parseJSON(val), true);
            };
            this.Action = params.Action || function(val) {};
            this.Init = params.Init || function() {
                var elem = this;
                $(this.Selector).on('switchChange.bootstrapSwitch', function(event, val) {
                    elem.Save(val);
                    elem.Action(val);
                });
            };
        }

        Load() {
            var currentVal = this.Get();

            var val = Cookies.get(this.Cookie);
            if (val != undefined) {
                this.Set(val);
            }

            var q = QueryString.Parse();
            if (q[this.QueryParam] != undefined) {
                this.Set(val);
            }

            if (currentVal != val) {
                this.Action(val);
            }
        }

        Save(val) {
            Cookies.set(this.Cookie, val, {
                expires: 365,
                path: ''
            });
        }

    }

    return {
        New: optionClass
    }

}());


var Config = (function() {


    var options = {};


    loadFromCookies = function() {
        $.each(options, function(name, option) {
            var value = option.Load();
            if (value != undefined) {
                option.Set(value);
            }
        });
    }


    reset = function() {
        $.each(options, function(name, option) {
            Cookies.remove(option.Cookie);
        });
    }


    init = function(params) {

        // copy current filter button action
        new Clipboard(params.CopySelector, {
            text: function(elem) {
                var baseUrl = [location.protocol, '//', location.host, location.pathname].join('');
                var query = ['q=' + Filters.GetFilters().join(',')];
                $.each(options, function(name, option) {
                    query.push(option.QueryParam + '=' + option.Get().toString());
                });
                $(elem).finish().fadeOut(100).fadeIn(300);
                return baseUrl + '?' + query.join('&');
            }
        });

        // save settings button action
        $(params.SaveSelector).on('click', function(elem) {
            var filter = Filters.GetFilters().join(',');
            Cookies.set('defaultFilter.v2', filter, {
                expires: 365,
                path: ''
            });
            $(params.SaveSelector).finish().fadeOut(100).fadeIn(300);
        });

        // reset settings button action
        $(params.ResetSelector).on('click', function(elem) {
            reset();
            location.reload();
        });

        // https://github.com/twbs/bootstrap/issues/2097
        $(document).on('click', '.dropdown-menu.dropdown-menu-form', function(e) {
            e.stopPropagation();
        });

        Config.NewOption({
            Cookie: 'autoRefresh',
            QueryParam: 'autorefresh',
            Selector: '#autorefresh',
            Action: function(val) {
                if (val) {
                    Unsee.WaitForNextReload();
                } else {
                    Unsee.Pause();
                }
            }
        });

        Config.NewOption({
            Cookie: 'refreshInterval',
            QueryParam: 'refresh',
            Selector: '#refresh-interval',
            Init: function() {
                var elem = this;
                $(this.Selector).on('change', function() {
                    var val = elem.Get();
                    elem.Save(val);
                    elem.Action(val);
                });
            },
            Getter: function() {
                return $(this.Selector).val();
            },
            Setter: function(val) {
                $(this.Selector).val(parseInt(val));
            },
            Action: function(val) {
                Unsee.SetRefreshRate(parseInt(val));
            }
        });


        Config.NewOption({
            Cookie: 'showFlash',
            QueryParam: 'flash',
            Selector: '#show-flash'
        });

        Config.NewOption({
            Cookie: 'appendTop',
            QueryParam: 'appendtop',
            Selector: '#append-top'
        });

    }


    newOption = function(params) {
        var option = new Option.New(params);
        option.Init();
        options[option.QueryParam] = option;
    }


    getOption = function(queryParam) {
        return options[queryParam];
    }


    return {
        Init: init,
        Load: loadFromCookies,
        Reset: reset,
        NewOption: newOption,
        GetOption: getOption
    }

}());

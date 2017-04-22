var UI = (function(params) {


    // when user click on any alert label modal popup with a list of possible
    // filter will show, this function is used to setup that modal
    setupModal = function() {
        $("#labelModal").on("show.bs.modal", function(event) {
            Unsee.Pause();
            var modal = $(this);
            var label = $(event.relatedTarget);
            var label_key = label.data("label-key");
            var label_val = label.data("label-val");
            var attrs = Alerts.GetLabelAttrs(label_key, label_val);
            var counter = Summary.Get(label_key, label_val);
            modal.find(".modal-title").html(
                Templates.Render("modalTitle", {
                  attrs: attrs,
                  counter: counter
                })
            );
            var hints = Autocomplete.GenerateHints(label_key, label_val);
            modal.find(".modal-body").html(
              Templates.Render("modalBody", {hints: hints})
            );
            modal.on("click", ".modal-button-filter", function(elem) {
                var filter = $(elem.target).data("filter-append-value");
                $("#labelModal").modal("hide");
                Filters.AddFilter(filter);
            });
        });
        $("#labelModal").on("hidden.bs.modal", function(event) {
            var modal = $(this);
            modal.find(".modal-title").children().remove();
            modal.find(".modal-body").children().remove();
            Unsee.WaitForNextReload();
        });
    }


    // each alert group have a link generated for it, but we hide it until
    // user hovers over that group so it doesn"t trash the UI
    setupGroupLinkHover = function(elem) {
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
    setupGroupTooltips = function(groupElem) {
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


    setupAlertGroupUI = function(elem) {
        setupGroupLinkHover(elem);
        setupGroupTooltips(elem);
    }


    init = function() {
        setupModal();
        setupSilenceForm();
    }


    silenceFormData = function() {
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
             case "startsAt": case "endsAt":
               payload[elem.name] = moment(elem.value);
               break;
           }
        });
        $.each($("#newSilenceForm .selectpicker"), function(i, elem) {
            var label_key = $(elem).data('label-key');
            var values = $(elem).selectpicker('val');
            if (values && values.length > 0) {
              var pval;
              isRegex = false;
              if (values.length > 1) {
                  pval = "(" + values.join("|") + ")";
                  isRegex = true;
              } else {
                  pval = values[0];
              }
              payload["matchers"].push({
                  name: label_key,
                  value: pval,
                  isRegex: isRegex
              });
            }
        });
        return payload;
    }

    silenceFormJSONRender = function() {
      var d = "curl " + $("#silenceModal").data("silence-api")
          + "\n    -X POST --data "
          + JSON.stringify(silenceFormData(), undefined, 2);
      $("#silenceJSONBlob").html(d);
    }

    // modal form for creating new silences
    setupSilenceForm = function() {
        var modal = $("#silenceModal");
        modal.on("show.bs.modal", function(event) {
            Unsee.Pause();
            modal.find(".modal-body").html(
                Templates.Render("silenceFormLoading", {})
            );
            var elem = $(event.relatedTarget);
            var elemLabels = {};
            $.each(elem.data("labels").split(","), function(i, l) {
                elemLabels[l.split("=")[0]] = l.split("=")[1];
            });
            $.ajax({
              url: 'alerts.json?q=alertname=' + elem.data('alertname'),
              error: function(xhr, textStatus, errorThrown) {
                  var err = xhr.responseText || errorThrown || textStatus;
                  modal.find(".modal-body").html(
                    Templates.Render("silenceFormFatal", {error: err})
                  );
              },
              success: function(data) {
                  var modal = $("#silenceModal");
                  var labels = {};
                  $.each(data.groups, function(i, group) {
                      $.each(group.alerts, function(j, alert) {
                          $.each(alert.labels, function(label_key, label_val) {
                              if (labels[label_key] == undefined) {
                                  labels[label_key] = {};
                              }
                              if (labels[label_key][label_val] == undefined) {
                                  labels[label_key][label_val] = {
                                      key: label_key,
                                      value: label_val,
                                      attrs: Alerts.GetLabelAttrs(label_key, label_val),
                                      selected: elemLabels[label_key] == label_val
                                  }
                              }
                          });
                      });
                  });
                  modal.find(".modal-body").html(
                    Templates.Render("silenceForm", {labels: labels})
                  );
                  $(".selectpicker").selectpicker({
                      iconBase: 'fa',
                      tickIcon: 'fa-check',
                      width: 'fit',
                      actionsBox: true,
                      selectAllText: 'All',
                      deselectAllText: 'None',
                      noneSelectedText: 'No label selected',
                      multipleSeparator: ' ',
                      selectedTextFormat: 'count > 2'
                  });
                  $('.datetime-picker').datetimepicker({
                    format: "YYYY-MM-DD HH:mm",
                    icons: {
                        time: 'fa fa-clock-o',
                        date: 'fa fa-calendar',
                        up: 'fa fa-chevron-up',
                        down: 'fa fa-chevron-down',
                        previous: 'fa fa-chevron-left',
                        next: 'fa fa-chevron-right',
                        today: 'fa fa-asterisk',
                        clear: 'fa fa-undo',
                        close: 'fa fa-close'
                    },
                    minDate: moment().subtract(1, 'minutes'),
                    sideBySide: true
                  });
              }
            });

        });
        modal.on("hidden.bs.modal", function(event) {
            var modal = $(this);
            modal.find(".modal-body").children().remove();
            Unsee.WaitForNextReload();
        });
        modal.on('show.bs.collapse, dp.change', function (e) {
            silenceFormJSONRender();
        });
        modal.on('change', function (e) {
            silenceFormJSONRender();
        });
        modal.submit(function(event) {
            payload = silenceFormData();
            if (payload["matchers"].length == 0) {
                var errContent = Templates.Render("silenceFormError", {error: "Select at least on label"});
                $("#newSilenceAlert").html(errContent).removeClass("hidden");
                return false;
            }

            var url = modal.data("silence-api");
            $.ajax({
              type: "POST",
              url: url,
              data: JSON.stringify(payload),
              error: function(xhr, textStatus, errorThrown) {
                  // default to whatever error text we can get
                  var err = xhr.responseText || errorThrown || textStatus;
                  if (xhr.responseText) {
                      // if we have a reponse text try to decode it as JSON
                      // it should be error from Alertmanager (it we were able to connect)
                      try {
                        var j = JSON.parse(xhr.responseText);
                        if (j["error"] != undefined) {
                          err = j["error"];
                        }
                      } catch (err) {
                        // can't parse json, do nothing
                      }
                  }

                  var errContent = Templates.Render("silenceFormError", {error: err});
                  $("#newSilenceAlert").html(errContent).removeClass("hidden");
              },
              success: function(data, textStatus, xhr) {
                  if (data["status"] == "success") {
                    $("#newSilenceAlert").addClass("hidden");
                    $('#newSilenceForm').html(Templates.Render("silenceFormSuccess", {
                        silenceID: data["data"]["silenceId"]
                    }));
                  } else {
                    var err = "Invalid response from Alertmanager API: " + JSON.stringify(data);
                    var errContent = Templates.Render("silenceFormError", {error: err});
                    $("#newSilenceAlert").html(errContent).removeClass("hidden");
                  }
              },
              dataType: "json"
            });

            event.preventDefault();
        });
    }


    return {
        Init: init,
        SetupAlertGroupUI: setupAlertGroupUI
    }

})();

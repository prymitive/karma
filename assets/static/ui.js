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
           }
        });
        if ($("#startsAt").data('DateTimePicker')) {
          payload.startsAt = $("#startsAt").data('DateTimePicker').date();
        }
        if ($("#endsAt").data('DateTimePicker')) {
          payload.endsAt = $("#endsAt").data('DateTimePicker').date();
        }
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


    silenceFormCalculateDuration = function() {
      // skip if datetimepicker isn't ready yet
      if (!$("#startsAt").data('DateTimePicker') || !$("#endsAt").data('DateTimePicker')) return false;

      var startsAt = $("#startsAt").data('DateTimePicker').date();
      var endsAt = $("#endsAt").data('DateTimePicker').date();

      var totalDays = (endsAt.diff(startsAt, 'days'));
      var totalHours = (endsAt.diff(startsAt, 'hours')) % 24;
      var totalMinutes = endsAt.diff(startsAt, 'minutes') % 60;
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

      // fix endsAt min date, it cannot be < startsAt
      $("#endsAt").data('DateTimePicker').minDate(startsAt);
    }


    silenceFormJSONRender = function() {
      var d = "curl " + $("#silenceModal").data("silence-api")
          + "\n    -X POST --data "
          + JSON.stringify(silenceFormData(), undefined, 2);
      $("#silenceJSONBlob").html(d);
    }


    silenceFormUpdateDuration = function(event) {
      // skip if datetimepicker isn't ready yet
      if (!$("#endsAt").data('DateTimePicker')) return false;

      var endsAt = $("#endsAt").data('DateTimePicker').date();
      var action = $(event.target).data("duration-action");
      var unit = $(event.target).data("duration-unit");
      var step = parseInt($(event.target).data("duration-step"));
      if (action == "increment") {
        endsAt.add(step, unit);
      } else {
        endsAt.subtract(step, unit);
      }
      $("#endsAt").data('DateTimePicker').date(endsAt);
      silenceFormCalculateDuration();
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
                  $.each($(".selectpicker"), function(i, elem) {
                    $(elem).selectpicker({
                        iconBase: 'fa',
                        tickIcon: 'fa-check',
                        width: 'fit',
                        selectAllText: '<i class="fa fa-check-square-o"></i>',
                        deselectAllText: '<i class="fa fa-square-o"></i>',
                        noneSelectedText: '<span class="label label-list label-default">' + $(this).data('label-key') + ": </span>",
                        multipleSeparator: ' ',
                        selectedTextFormat: 'count > 1',
                        countSelectedText: function (numSelected, numTotal) {
                          return '<span class="label label-list label-warning">'
                                 + $(elem).data('label-key') + ": " + numSelected + " values selected</span>";
                        }
                    });
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
                    minDate: moment(),
                    sideBySide: true,
                    inline: true
                  });
                  setupGroupTooltips(modal);
                  $('.select-label-badge').on('click', function(e) {
                    var select = $(this).parent().parent().find('select');
                    if (select.selectpicker('val')) {
                      // if there's anything selected deselect all
                      select.selectpicker('deselectAll')
                    } else {
                      // else select all
                      select.selectpicker('selectAll')
                    }
                  });
                  // set endsAt time to +1hour
                  $("#endsAt").data('DateTimePicker').date(moment().add(1, 'hours'));
                  modal.on("click", "a.silence-duration-btn", silenceFormUpdateDuration);
                  modal.on("mousedown", "a.silence-duration-btn", false);
                  silenceFormCalculateDuration();
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
            silenceFormCalculateDuration();
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

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


    // modal form for creating new silences
    setupSilenceForm = function() {
        var modal = $("#silenceModal");
        modal.on("show.bs.modal", function(event) {
            Unsee.Pause();
            var modal = $(this);
            var elem = $(event.relatedTarget);
            var labels = [];
            $.each(elem.data("labels").split(","), function(i, l) {
              labels.push({
                key: l.split("=")[0],
                value: l.split("=")[1],
                attrs: Alerts.GetLabelAttrs(l.split("=")[0], l.split("=")[1])
              });
            });
            modal.find(".modal-body").html(
              Templates.Render("silenceForm", {
                labels: labels
              })
            );
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

        });
        modal.on("hidden.bs.modal", function(event) {
            var modal = $(this);
            modal.find(".modal-body").children().remove();
            Unsee.WaitForNextReload();
        });
        modal.submit(function(event) {
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
                 default:
                   if (elem.value == "on") {
                       payload["matchers"].push({
                         name: elem.name.split("=")[0],
                         value: elem.name.split("=")[1],
                         isRegex: false
                     })
                   }
               }
            });

            if (payload["matchers"].length == 0) {
                $("#newSilenceAlert").html("Select at least on label").removeClass("hidden");
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

                  $("#newSilenceAlert").html(err).removeClass("hidden");
              },
              success: function(data, textStatus, xhr) {
                  if (data["status"] == "success") {
                    $("#newSilenceAlert").addClass("hidden");
                    $('#newSilenceForm').html(Templates.Render("silenceFormSuccess", {
                        silenceID: data["data"]["silenceId"]
                    }));
                  } else {
                    var err = "Invalid response from Alertmanager API: " + JSON.stringify(data);
                    $("#newSilenceAlert").html(err).removeClass("hidden");
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

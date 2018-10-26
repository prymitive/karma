// fallback class for labels
const DefaultLabelClass = "badge-warning components-label-dark";

// labels configured as static will have badge-${this class}
const StaticColorLabelClass = "badge-info components-label-dark";

// alertname label will use this one
const AlertNameLabelClass = "badge-dark components-label-dark";

// alert state label will use one of those, based on the value
const StateLabelClassMap = Object.freeze({
  active: "badge-danger components-label-dark",
  suppressed: "badge-success components-label-dark",
  unprocessed: "badge-secondary components-label-bright"
});
// same but for borders
const BorderClassMap = Object.freeze({
  active: "border-danger",
  suppressed: "border-success",
  unprocessed: "border-secondary"
});

export {
  DefaultLabelClass,
  StaticColorLabelClass,
  AlertNameLabelClass,
  StateLabelClassMap,
  BorderClassMap
};

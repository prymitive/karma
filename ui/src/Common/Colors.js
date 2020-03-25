// fallback class for labels
const DefaultLabelClassMap = Object.freeze({
  badge: "badge-default components-label-dark",
  btn: "btn-default components-label-dark",
});

// same but for borders
const BorderClassMap = Object.freeze({
  active: "border-danger",
  suppressed: "border-success",
  unprocessed: "border-secondary",
});

const BackgroundClassMap = Object.freeze({
  active: "bg-danger",
  suppressed: "bg-success",
  unprocessed: "bg-secondary",
});

const StaticColorLabelClassMap = Object.freeze({
  badge: "badge-info components-label-dark",
  btn: "btn-info components-label-dark",
});

const AlertNameLabelClassMap = Object.freeze({
  badge: "badge-dark components-label-dark",
  btn: "btn-dark components-label-dark",
});

const StateLabelClassMap = Object.freeze({
  active: "danger",
  suppressed: "success",
  unprocessed: "secondary",
});

export {
  DefaultLabelClassMap,
  StaticColorLabelClassMap,
  AlertNameLabelClassMap,
  BorderClassMap,
  BackgroundClassMap,
  StateLabelClassMap,
};

import PropTypes from "prop-types";

const SilenceFormSuggestion = PropTypes.shape({
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
});

const SilenceFormMatcher = PropTypes.exact({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  values: PropTypes.arrayOf(SilenceFormSuggestion).isRequired,
  isRegex: PropTypes.bool.isRequired,
});

export { SilenceFormMatcher, SilenceFormSuggestion };

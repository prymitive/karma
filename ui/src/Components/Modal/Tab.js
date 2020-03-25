import React from "react";
import PropTypes from "prop-types";

const Tab = ({ title, active, onClick }) => (
  <span
    className={`nav-item nav-link cursor-pointer mx-1 px-2 ${
      active ? "active" : "components-tab-inactive"
    }`}
    onClick={onClick}
  >
    {title}
  </span>
);
Tab.propTypes = {
  title: PropTypes.string.isRequired,
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export { Tab };

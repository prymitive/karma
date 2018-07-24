import { StaticLabels } from "./Query";

const StaticColorLabelClass = "info";
const DefaultLabelClass = "warning";

// returns bootstrap class for coloring based on pased label name & value
function GetLabelColorClass(name, value) {
  if (name === StaticLabels.AlertName) {
    // special case for alertname label, which is the name of an alert
    return "dark";
  }

  if (name === StaticLabels.State) {
    switch (value) {
      case "active":
        return "danger";
      case "suppressed":
        return "success";
      default:
        return "secondary";
    }
  }

  return DefaultLabelClass;
}

export { GetLabelColorClass, StaticColorLabelClass, DefaultLabelClass };

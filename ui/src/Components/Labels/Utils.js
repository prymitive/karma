import {
  StaticColorLabelClassMap,
  DefaultLabelClassMap,
  AlertNameLabelClassMap,
  StateLabelClassMap,
} from "Common/Colors";
import { StaticLabels } from "Common/Query";

const isBackgroundDark = (brightness) => brightness <= 125;

const GetClassAndStyle = (alertStore, name, value, extraClass, baseClass) => {
  const elementType = baseClass || "badge";

  const data = {
    style: {},
    className: "",
    baseClassNames: ["components-label", elementType],
    colorClassNames: [],
  };

  if (name === StaticLabels.AlertName) {
    data.colorClassNames.push(AlertNameLabelClassMap[elementType]);
  } else if (name === StaticLabels.State) {
    data.colorClassNames.push(
      StateLabelClassMap[value]
        ? `${elementType}-${StateLabelClassMap[value]}`
        : DefaultLabelClassMap[elementType]
    );
  } else if (alertStore.settings.values.staticColorLabels.includes(name)) {
    data.colorClassNames.push(StaticColorLabelClassMap[elementType]);
  } else {
    const c = alertStore.data.getColorData(name, value);
    if (c) {
      data.style["backgroundColor"] = c.background;
      data.colorClassNames.push(
        isBackgroundDark(c.brightness)
          ? "components-label-dark"
          : "components-label-bright"
      );

      data.colorClassNames.push(
        `components-label-brightness-${Math.round(c.brightness / 25)}`
      );
    } else {
      // if not fall back to class
      data.colorClassNames.push(DefaultLabelClassMap[elementType]);
    }
  }
  data.className = `${[...data.baseClassNames, ...data.colorClassNames].join(
    " "
  )} ${extraClass || ""}`;

  return data;
};

export { GetClassAndStyle };

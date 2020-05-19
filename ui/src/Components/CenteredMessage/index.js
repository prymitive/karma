import React from "react";

import { motion } from "framer-motion";

const CenteredMessage = ({ children, className }) => {
  return (
    <motion.h1
      animate={{ opacity: [0, 1] }}
      className={`${
        className ? className : "display-1 text-placeholder"
      } screen-center`}
    >
      {children}
    </motion.h1>
  );
};

export { CenteredMessage };

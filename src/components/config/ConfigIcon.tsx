import React from "react";
import type { ReactNode } from "react";

import DefaultTooltip from "@components/DefaultTooltip";

export interface IConfigIconProps {
  onClick: () => void;
  tooltipText: string;
  buttonClassName: string;
  children: ReactNode;
}

const ConfigIcon = ({
  onClick,
  tooltipText,
  buttonClassName,
  children,
}: IConfigIconProps) => (
  <DefaultTooltip text={tooltipText}>
    <button type="button" className={`${buttonClassName}`} onClick={onClick}>
      {children}
    </button>
  </DefaultTooltip>
);

export default ConfigIcon;

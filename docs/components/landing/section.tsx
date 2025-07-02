import type React from "react";

const Section = ({
  className,
  id,
  crosses,
  crossesOffset,
  customPaddings,
  children,
}: {
  className?: string;
  id: string;
  crosses?: boolean;
  crossesOffset?: string;
  customPaddings?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <div
      id={id}
      className={`
      relative
      ${customPaddings || `py-10 lg:py-16  ${crosses ? "" : ""}`}
      ${className || " "}`}
    >
      {children}

    </div>
  );
};

export default Section;

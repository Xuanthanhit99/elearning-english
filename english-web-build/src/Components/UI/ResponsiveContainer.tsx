import { ReactNode } from "react";

type ResponsiveContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function ResponsiveContainer({
  children,
  className = "",
}: ResponsiveContainerProps) {
  return (
    <div
      className={[
        "mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 lg:px-8 lg:py-7",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

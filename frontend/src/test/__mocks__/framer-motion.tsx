import React from "react";

const MOTION_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "whileHover",
  "whileTap",
  "whileDrag",
  "whileFocus",
  "whileInView",
  "viewport",
  "layout",
  "layoutId",
  "onAnimationStart",
  "onAnimationComplete",
  "dragConstraints",
  "dragElastic",
]);

function filterProps(props: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!MOTION_PROPS.has(k)) clean[k] = v;
  }
  return clean;
}

export const motion = new Proxy(
  {},
  {
    get(_target, tag: string) {
      const Component = React.forwardRef(
        ({ children, ...props }: { children?: React.ReactNode }, ref) =>
          React.createElement(tag, { ...filterProps(props), ref }, children)
      );
      Component.displayName = `motion.${tag}`;
      return Component;
    },
  }
);

export const AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;

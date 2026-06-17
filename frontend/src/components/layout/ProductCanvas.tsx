import { clsx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

interface ProductCanvasProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Prototype-aligned void background with grid + scanline atmosphere. */
export function ProductCanvas({ children, className, ...props }: ProductCanvasProps) {
  return (
    <div className={clsx("product-canvas relative min-h-dvh text-product-text", className)} {...props}>
      <div aria-hidden className="product-canvas-grid pointer-events-none fixed inset-0 -z-10" />
      <div aria-hidden className="product-canvas-scan pointer-events-none fixed inset-0 -z-10" />
      {children}
    </div>
  );
}

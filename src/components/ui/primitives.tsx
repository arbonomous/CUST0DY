import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6] disabled:pointer-events-none disabled:opacity-45 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-[#3B82F6] text-white hover:bg-[#2563EB]",
        emerald: "bg-[#10B981] text-[#09090B] font-semibold hover:bg-[#059669]",
        amber: "bg-[#F59E0B] text-[#09090B] font-semibold hover:bg-[#D97706]",
        danger: "bg-[#EF4444]/15 text-[#F87171] border border-[#EF4444]/35 hover:bg-[#EF4444]/25",
        secondary: "bg-[#18181C] text-zinc-100 border border-[#27272A] hover:bg-[#222228] hover:border-zinc-600",
        ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-[#18181C]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-xs",
        lg: "h-10 px-5 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium tracking-tight border",
  {
    variants: {
      variant: {
        default: "bg-[#18181C] text-zinc-300 border-[#27272A]",
        emerald: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25",
        amber: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25",
        blue: "bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/25",
        danger: "bg-[#EF4444]/10 text-[#F87171] border-[#EF4444]/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export function TerminalCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg bg-[#121215] border border-[#27272A]",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md bg-[#09090B] border border-[#27272A] px-3 py-1 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6] transition-colors",
        className
      )}
      {...props}
    />
  );
}

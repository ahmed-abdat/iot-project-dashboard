"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";

interface SidebarProps {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  className?: string;
  showToggle?: boolean;
  isMobile?: boolean;
}

export function Sidebar({
  children,
  open = true,
  setOpen,
  animate = true,
  className,
  showToggle = true,
  isMobile = false,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "relative h-screen bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800",
        "flex flex-col p-4",
        className
      )}
    >
      {showToggle && setOpen && (
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "absolute top-7 z-40 rounded-full border bg-background p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
            isMobile
              ? "left-4 top-4"
              : "-right-3"
          )}
        >
          {open ? (
            <IconX className="h-4 w-4" />
          ) : (
            <IconMenu2 className="h-4 w-4" />
          )}
        </button>
      )}
      {children}
    </aside>
  );
}

export function SidebarBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col flex-1", className)}>{children}</div>
  );
}

interface SidebarLinkProps {
  link: {
    href: string;
    label: string;
    icon?: React.ReactNode;
    className?: string;
  };
}

export function SidebarLink({ link }: SidebarLinkProps) {
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200",
        link.className
      )}
    >
      {link.icon}
      {link.label && <span>{link.label}</span>}
    </Link>
  );
}

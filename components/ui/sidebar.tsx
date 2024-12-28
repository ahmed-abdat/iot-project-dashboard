"use client";
import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion, HTMLMotionProps } from "framer-motion";
import { IconMenu2, IconX } from "@tabler/icons-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  className?: string;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: {
  className?: string;
  children?: React.ReactNode;
}) => {
  const { open, setOpen, animate } = useSidebar();

  return (
    <>
      <motion.div
        initial={false}
        animate={{
          width: open ? "240px" : "72px",
          transition: {
            duration: animate ? 0.2 : 0,
          },
        }}
        className={cn(
          "fixed top-0 left-0 h-screen border-r py-4 px-3 flex flex-col bg-background md:relative md:w-auto",
          props.className
        )}
      >
        <button
          onClick={() => setOpen(!open)}
          className="absolute -right-3 top-7 z-40 rounded-full border bg-background p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 hidden md:block"
        >
          {open ? (
            <IconX className="h-4 w-4" />
          ) : (
            <IconMenu2 className="h-4 w-4" />
          )}
        </button>
        {props.children}
      </motion.div>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black lg:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
};

interface SidebarLinkProps {
  link: Omit<Links & LinkProps, "href"> & { href: string };
}

export const SidebarLink = ({ link }: SidebarLinkProps) => {
  const { open } = useSidebar();
  const { href, icon, label, className, ...rest } = link;

  return (
    <Link
      href={href}
      className={cn("flex items-center gap-3 px-3 py-2", className)}
      {...rest}
    >
      {icon}
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="text-sm text-neutral-700 dark:text-neutral-200 hidden md:inline"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
};

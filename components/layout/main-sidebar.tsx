"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconLayoutDashboard,
  IconChartBar,
  IconBellRinging,
  IconSettings,
  IconDevices,
  IconLogout,
} from "@tabler/icons-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useMediaQuery } from "@/hooks/use-media-query";

export function MainSidebar() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const { signOut } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Auto collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

  // Hide sidebar on login page
  if (pathname === "/login") {
    return null;
  }

  const links = [
    {
      label: "Dashboard",
      href: "/",
      icon: (
        <IconLayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: (
        <IconChartBar className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Alerts",
      href: "/alerts",
      icon: (
        <IconBellRinging className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Settings",
      href: "/settings",
      icon: (
        <IconSettings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];

  return (
    <Sidebar
      open={open}
      setOpen={setOpen}
      showToggle={!isMobile}
      className={cn(
        "transition-all duration-300 z-50",
        isMobile ? "w-[70px]" : open ? "w-[240px]" : "w-[70px]"
      )}
    >
      <SidebarBody className="justify-between gap-8">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {!isMobile && open ? <Logo /> : <LogoIcon />}
          <div className="mt-8 flex flex-col gap-2">
            {links.map((link) => (
              <SidebarLink
                key={link.href}
                link={{
                  ...link,
                  label: !isMobile && open ? link.label : "",
                  className: cn(
                    "hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors",
                    pathname === link.href &&
                      "bg-neutral-200 dark:bg-neutral-700"
                  ),
                }}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200",
            "hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
          )}
        >
          <IconLogout className="h-5 w-5 flex-shrink-0" />
          {!isMobile && open && <span>Logout</span>}
        </button>
      </SidebarBody>
    </Sidebar>
  );
}

const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm text-black dark:text-white py-1 relative z-20"
    >
      <div className="h-6 w-7 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold whitespace-pre text-lg"
      >
        IoT Control
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm text-black dark:text-white py-1 relative z-20"
    >
      <div className="h-6 w-7 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};

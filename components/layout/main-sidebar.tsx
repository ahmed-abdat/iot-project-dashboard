"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconLayoutDashboard,
  IconSettings,
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
      label: "Tableau de bord",
      href: "/",
      icon: (
        <IconLayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Paramètres",
      href: "/settings",
      icon: (
        <IconSettings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Floating toggle button for mobile when sidebar is closed */}
      {isMobile && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed left-4 top-4 z-50 rounded-full border bg-background p-2 shadow-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Open sidebar"
        >
          <IconLayoutDashboard className="h-5 w-5" />
        </button>
      )}

      <Sidebar
        open={open}
        setOpen={setOpen}
        showToggle={true}
        isMobile={isMobile}
        className={cn(
          "transition-all duration-300",
          isMobile
            ? cn(
                "fixed left-0 top-0 z-50 w-[240px]",
                !open && "-translate-x-full"
              )
            : open ? "w-[240px]" : "w-[70px]"
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
          {!isMobile && open && <span>Déconnexion</span>}
        </button>
      </SidebarBody>
    </Sidebar>
    </>
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
        className="font-semibold whitespace-pre text-base"
      >
        Santé du Moteur
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

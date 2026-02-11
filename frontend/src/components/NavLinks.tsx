"use client";

import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";

interface NavLinksProps {
  className?: string;
  linkClassName?: string;
}

export default function NavLinks({
  className = "flex items-center gap-1",
  linkClassName = "rounded-md px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 hover:bg-zinc-100",
}: NavLinksProps) {
  return (
    <nav className={className}>
      {NAV_LINKS.map((link) =>
        link.external ? (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {link.label}
          </a>
        ) : (
          <Link key={link.label} href={link.href} className={linkClassName}>
            {link.label}
          </Link>
        )
      )}
    </nav>
  );
}

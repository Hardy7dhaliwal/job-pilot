"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Wraps next-themes; dark mode is the default (see app/layout.tsx). */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

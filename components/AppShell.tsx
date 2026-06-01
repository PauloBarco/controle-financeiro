"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, BarChart3 } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Planilha", icon: "📊" },
  { href: "/dashboard", label: "Dashboard", icon: "📈" },
  { href: "/resumo-mes", label: "Resumo do mês", icon: "📅" },
  { href: "/login", label: "Nuvem", icon: "☁️" },
];

type AppShellProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function AppShell({
  title,
  subtitle,
  action,
  children,
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-sm font-bold text-white shadow-lg">
                CF
              </div>
              <span>
                <span className="block text-sm font-semibold leading-5">
                  Controle Financeiro
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">Casa</span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 -mb-2">
            {navigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
                    active
                      ? "bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
            ) : null}
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        {children}
      </main>
    </div>
  );
}

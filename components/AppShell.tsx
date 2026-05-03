"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/lancamentos", label: "Lancamentos" },
  { href: "/categorias", label: "Categorias" },
  { href: "/contas", label: "Contas" },
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
    <div className="min-h-screen bg-[#f4f6f8] text-[#111827]">
      <header className="border-b border-[#1f2937] bg-[#111827] text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#16a34a] text-sm font-bold text-white">
                CF
              </span>
              <span>
                <span className="block text-sm font-semibold leading-5">
                  Controle Financeiro
                </span>
                <span className="block text-xs text-[#cbd5e1]">
                  Painel pessoal
                </span>
              </span>
            </Link>

            <Link
              href="/login"
              className="rounded-md border border-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Login
            </Link>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1">
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
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-white text-[#111827]"
                      : "text-[#cbd5e1] hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 max-w-2xl text-sm text-[#64748b]">{subtitle}</p>
            ) : null}
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        {children}
      </main>
    </div>
  );
}

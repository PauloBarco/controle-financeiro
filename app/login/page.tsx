"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type LoginStep = "email" | "codigo";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const emailLimpo = email.trim().toLowerCase();

  async function enviarCodigo() {
    if (!emailLimpo) {
      alert("Informe seu email");
      return;
    }

    setEnviando(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: emailLimpo,
    });

    if (error) {
      console.error("Erro ao enviar codigo:", error);
      alert("Erro ao enviar codigo");
      setEnviando(false);
      return;
    }

    setStep("codigo");
    setCodigo("");
    setEnviando(false);
  }

  async function verificarCodigo() {
    const codigoLimpo = codigo.replace(/\D/g, "");

    if (codigoLimpo.length !== 6) {
      alert("Informe o codigo de 6 digitos");
      return;
    }

    setVerificando(true);

    const { error } = await supabase.auth.verifyOtp({
      email: emailLimpo,
      token: codigoLimpo,
      type: "email",
    });

    if (error) {
      console.error("Erro ao validar codigo:", error);
      alert("Codigo invalido ou expirado");
      setVerificando(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  function alterarEmail() {
    setStep("email");
    setCodigo("");
  }

  return (
    <AppShell title="Login" subtitle="Codigo por email">
      <section className="mx-auto max-w-md rounded-lg border border-[#d8dee8] bg-white p-5">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            {step === "email" ? "Entrar no app" : "Digite o codigo"}
          </h2>
          <p className="mt-1 text-sm text-[#64748b]">
            {step === "email"
              ? "Voce recebera um codigo de 6 digitos no seu email."
              : `Enviamos um codigo para ${emailLimpo}.`}
          </p>
        </div>

        {step === "email" ? (
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Email
              <input
                type="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void enviarCodigo();
                  }
                }}
                className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <button
              type="button"
              onClick={enviarCodigo}
              disabled={enviando}
              className="h-11 w-full rounded-md bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            >
              {enviando ? "Enviando..." : "Enviar codigo"}
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Codigo de 6 digitos
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={codigo}
                maxLength={6}
                onChange={(event) =>
                  setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void verificarCodigo();
                  }
                }}
                className="h-12 rounded-md border border-[#cbd5e1] bg-white px-3 text-center text-xl font-semibold tracking-[0.35em] outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <button
              type="button"
              onClick={verificarCodigo}
              disabled={verificando}
              className="h-11 w-full rounded-md bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            >
              {verificando ? "Validando..." : "Entrar"}
            </button>

            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <button
                type="button"
                onClick={enviarCodigo}
                disabled={enviando}
                className="font-semibold text-[#2563eb] transition hover:text-[#1d4ed8] disabled:text-[#94a3b8]"
              >
                {enviando ? "Reenviando..." : "Reenviar codigo"}
              </button>

              <button
                type="button"
                onClick={alterarEmail}
                className="font-semibold text-[#334155] transition hover:text-[#111827]"
              >
                Trocar email
              </button>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}

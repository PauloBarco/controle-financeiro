"use client";

import { useRef, useState } from "react";
import {
  baixarBackupLancamentos,
  importarLancamentosDeBackup,
} from "@/lib/storage-lancamentos";
import type { LancamentoPlanilha } from "@/lib/lancamentos";

type BackupLancamentosProps = {
  lancamentos: LancamentoPlanilha[];
  onImportar: (lancamentos: LancamentoPlanilha[]) => void;
};

export default function BackupLancamentos({
  lancamentos,
  onImportar,
}: BackupLancamentosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);

  async function importarArquivo(file?: File) {
    if (!file) return;

    setImportando(true);

    try {
      const texto = await file.text();
      const importados = importarLancamentosDeBackup(texto);

      if (
        !confirm(
          `Importar ${importados.length} lancamentos? Isso vai substituir os dados atuais.`,
        )
      ) {
        return;
      }

      onImportar(importados);
      alert("Backup importado com sucesso.");
    } catch (error) {
      console.error("Erro ao importar backup:", error);
      alert("Nao foi possivel importar este backup.");
    } finally {
      setImportando(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => baixarBackupLancamentos(lancamentos)}
        className="h-10 rounded-md border border-[#cbd5e1] px-3 text-sm font-semibold text-[#334155] transition hover:border-[#64748b]"
      >
        Backup
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={importando}
        className="h-10 rounded-md border border-[#cbd5e1] px-3 text-sm font-semibold text-[#334155] transition hover:border-[#64748b] disabled:cursor-not-allowed disabled:text-[#94a3b8]"
      >
        {importando ? "Importando..." : "Importar backup"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          void importarArquivo(file);
        }}
      />
    </div>
  );
}

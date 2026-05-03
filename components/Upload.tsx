"use client";

import type { ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";

type UploadProps = {
  userId: string | null;
  onUpload: (url: string) => void;
  disabled?: boolean;
};

export default function Upload({ userId, onUpload, disabled = false }: UploadProps) {
  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!userId) {
      alert("Precisa estar logado para enviar comprovante");
      e.target.value = "";
      return;
    }

    const safeFileName = file.name.replace(/[^\w.-]/g, "_");
    const filePath = `${userId}/${Date.now()}-${safeFileName}`;

    const { data, error } = await supabase.storage
      .from("comprovantes")
      .upload(filePath, file);

    if (error) {
      alert("Erro no upload");
      return;
    }

    if (!data?.path) {
      alert("Upload concluido, mas o caminho do arquivo nao foi retornado");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("comprovantes")
      .getPublicUrl(data.path);

    onUpload(urlData.publicUrl);
  }

  return (
    <input
      type="file"
      onChange={handleFile}
      disabled={disabled}
      className="block w-full text-sm text-[#334155] file:mr-4 file:rounded-md file:border-0 file:bg-[#111827] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:text-[#94a3b8]"
    />
  );
}

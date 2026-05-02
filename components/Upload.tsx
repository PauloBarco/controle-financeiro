"use client";

import { supabase } from "@/lib/supabase";

export default function Upload({ userId, onUpload }: any) {
  async function handleFile(e: any) {
    const file = e.target.files[0];

    if (!file) return;

    const filePath = `${userId}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("comprovantes")
      .upload(filePath, file);

    if (error) {
      alert("Erro no upload");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("comprovantes")
      .getPublicUrl(data.path);

    onUpload(urlData.publicUrl);
  }

  return <input type="file" onChange={handleFile} />;
}
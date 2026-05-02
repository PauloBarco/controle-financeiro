"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Upload from "@/components/Upload";

export default function PagamentosPage() {
  const [user, setUser] = useState<any>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [contaId, setContaId] = useState("");
  const [valor, setValor] = useState("");
  const [comprovante, setComprovante] = useState("");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      const { data: contasData } = await supabase
        .from("contas")
        .select("*");

      setContas(contasData || []);
    }

    init();
  }, []);

  async function salvar() {
    if (!user) {
      alert("Precisa estar logado");
      return;
    }

    const { error } = await supabase.from("pagamentos").insert([
      {
        user_id: user.id,
        conta_id: contaId,
        valor: Number(valor),
        status: "pago",
        comprovante_url: comprovante,
      },
    ]);

    if (error) {
      alert("Erro ao salvar pagamento");
      return;
    }

    alert("Pagamento salvo!");
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Pagamentos</h1>

      <select onChange={(e) => setContaId(e.target.value)}>
        <option>Selecione a conta</option>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <br /><br />

      <input
        placeholder="Valor"
        onChange={(e) => setValor(e.target.value)}
      />

      <br /><br />

      <Upload userId={user?.id} onUpload={setComprovante} />

      <br /><br />

      <button onClick={salvar}>Salvar pagamento</button>
    </div>
  );
}
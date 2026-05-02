"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ContasPage() {
  const [nome, setNome] = useState("");
  const [contas, setContas] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  // pegar usuário logado
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }

    getUser();
    carregarContas();
  }, []);

  // carregar contas
  async function carregarContas() {
    const { data } = await supabase.from("contas").select("*");
    setContas(data || []);
  }

  // salvar conta
  async function salvarConta() {
    if (!user) {
      alert("Você precisa estar logado");
      return;
    }

    const { error } = await supabase.from("contas").insert([
      {
        nome,
        user_id: user.id,
      },
    ]);

    if (error) {
      alert("Erro ao salvar");
      return;
    }

    setNome("");
    carregarContas();
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Contas</h1>

      <input
        placeholder="Nome da conta (ex: Energia)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />

      <button onClick={salvarConta}>Salvar</button>

      <hr />

      <h2>Lista</h2>

      {contas.map((c) => (
        <div key={c.id}>{c.nome}</div>
      ))}
    </div>
  );
}
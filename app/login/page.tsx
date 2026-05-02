"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      alert("Erro ao enviar email");
      return;
    }

    alert("Verifique seu email para acessar!");
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Login</h1>

      <input
        type="email"
        placeholder="Seu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button onClick={login}>Entrar</button>
    </div>
  );
}
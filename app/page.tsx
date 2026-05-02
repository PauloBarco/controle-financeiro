"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  useEffect(() => {
    async function testar() {
      const { data, error } = await supabase
        .from("contas")
        .select("*");

      console.log("DATA:", data);
      console.log("ERROR:", error);
    }

    testar();
  }, []);

  return <h1>Testando conexão com Supabase...</h1>;
}
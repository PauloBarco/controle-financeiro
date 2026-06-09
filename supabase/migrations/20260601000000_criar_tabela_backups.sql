-- Criar tabela de backups automáticos
CREATE TABLE IF NOT EXISTS controle_financeiro_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  backup_date TIMESTAMP DEFAULT now(),
  lancamentos_count INTEGER,
  backup_hash TEXT,
  dados JSONB,
  created_at TIMESTAMP DEFAULT now(),
  
  -- Índices para melhor performance
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_backups_user_id ON controle_financeiro_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_backups_backup_date ON controle_financeiro_backups(backup_date);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON controle_financeiro_backups(created_at DESC);

-- Política RLS para apenas usuários acessarem seus próprios backups
ALTER TABLE controle_financeiro_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus próprios backups"
  ON controle_financeiro_backups;
CREATE POLICY "Usuários podem ver seus próprios backups"
  ON controle_financeiro_backups
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir backups"
  ON controle_financeiro_backups;
CREATE POLICY "Usuários podem inserir backups"
  ON controle_financeiro_backups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar seus próprios backups"
  ON controle_financeiro_backups;
CREATE POLICY "Usuários podem deletar seus próprios backups"
  ON controle_financeiro_backups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

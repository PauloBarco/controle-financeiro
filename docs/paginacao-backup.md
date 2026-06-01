# Paginação e Backup Automático

## 📋 Visão Geral

Este documento descreve dois novos sistemas implementados para melhorar a performance e a segurança dos dados:

1. **Paginação de Tabelas** - Para lidar com muitos lançamentos (5.000+)
2. **Backup Automático** - Salva dados diariamente na nuvem (Supabase)

---

## 🎯 1. Paginação

### O Problema

Quando usuários têm **5.000+ lançamentos**, a tabela fica lenta porque:
- Todo o HTML de todos os registros é renderizado
- JavaScript precisa processar muitos elementos no DOM
- Filtros/buscas processam lista inteira

### A Solução

**50 registros por página** com:
- Navegação intuitiva (primeira, anterior, próxima, última)
- Seletor rápido para ir direto a uma página
- Informações de progresso (ex: "Mostrando 1 até 50 de 1.200")

### Como Funciona

#### Hook `usePagination`

```typescript
const paginacao = usePagination({
  items: lancamentosFiltrados,
  itemsPerPage: 50
});
```

**Retorna:**
```typescript
{
  currentPage: 1,           // Página atual
  totalPages: 24,           // Total de páginas
  totalItems: 1200,         // Total de registros
  itemsPerPage: 50,         // Registros por página
  paginatedItems: [...],    // Array com 50 itens da página atual
  goToPage: (num) => void,
  goToNextPage: () => void,
  goToPreviousPage: () => void,
  goToFirstPage: () => void,
  goToLastPage: () => void,
  canGoNext: boolean,
  canGoPrevious: boolean
}
```

#### Componente `PaginationControls`

Barra de controle visual:

```
┌──────────────────────────────────────────────────────────┐
│ Mostrando 1 até 50 de 1.200 registros   ⟨⟨ ⟨ [1/24] ⟩ ⟩⟩ │
│                                         Ir para: [▼]     │
└──────────────────────────────────────────────────────────┘
```

### Integração em `app/page.tsx`

1. **Hook importado:**
   ```typescript
   import { usePagination } from "@/lib/usePagination";
   ```

2. **Ativado na página:**
   ```typescript
   const paginacao = usePagination({
     items: lancamentosFiltrados,
     itemsPerPage: 50,
   });
   ```

3. **Tabela usa dados paginados:**
   ```typescript
   paginacao.paginatedItems.map(lancamento => ...)
   ```

4. **Controles aparecem se há múltiplas páginas:**
   ```typescript
   {paginacao.totalItems > paginacao.itemsPerPage && (
     <PaginationControls {...props} />
   )}
   ```

### Comportamento

- **Sem filtro:** Mostra 50 por página
- **Com filtro:** Recalcula automáticamente (ex: 23 resultados = 1 página)
- **Ao mudar página:** Tabela atualiza, rolagem vai ao topo
- **Performance:** Renderiza apenas 50 elementos ao invés de 5.000+

### Exemplos de Uso

**Usuário com 5.000 lançamentos:**
```
Total: 5.000 registros
Páginas: 100 (5.000 / 50)
Page 1:  Registros 1-50     ✓ Rápido (50 elementos)
Page 50: Registros 2.451-2.500  ✓ Rápido (50 elementos)
```

**Usuário filtra para "Mercado":**
```
Total encontrado: 127 registros
Páginas: 3 (127 / 50)
Page 1: 50 registros
Page 2: 50 registros
Page 3: 27 registros
```

---

## 💾 2. Backup Automático

### O Problema

Usuários precisam **exportar manualmente** para fazer backup:
- Risco de perda de dados se PC formatar
- Risco ao limpar cache do navegador
- Risco ao trocar de browser/dispositivo

### A Solução

**Backup automático diário** em JSON:
- Executa uma vez por dia (quando há mudanças)
- Salva na Supabase (nuvem segura)
- Detecta alterações com hash
- Sem necessidade de ação do usuário

### Como Funciona

#### Sistema de Backup

1. **Detecção de mudanças:**
   - Calcula hash dos lançamentos
   - Só faz backup se dados mudaram
   - Hash é armazenado localmente

2. **Agendamento:**
   - Verifica a cada 1 hora se faz backup hoje
   - Apenas 1 backup por dia (mesmo que execute múltiplas vezes)
   - Reset automático ao virar meia-noite

3. **Autenticação:**
   - Verifica se usuário está logado
   - Só faz backup para usuários autenticados
   - Respeita RLS (Row Level Security) da Supabase

#### Integração em `app/page.tsx`

1. **Hook importado:**
   ```typescript
   import { agendarBackupAutomatico } from "@/lib/automatic-backup";
   ```

2. **Ativado no useEffect:**
   ```typescript
   useEffect(() => {
     if (!carregado) return;
     
     salvarLancamentos(window.localStorage, lancamentos);
     agendarSincronizacao(window.localStorage);
     agendarBackupAutomatico(window.localStorage); // ← Novo
   }, [carregado, lancamentos]);
   ```

#### Tabela de Backups no Supabase

```sql
CREATE TABLE controle_financeiro_backups (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,        -- Usuário que fez backup
  backup_date TIMESTAMP,         -- Quando foi feito
  lancamentos_count INTEGER,     -- Quantos lançamentos
  backup_hash TEXT,              -- Hash para detectar mudanças
  dados JSONB,                   -- Dados completos em JSON
  created_at TIMESTAMP
);
```

**Dados armazenados:**
```json
{
  "lancamentos": [...],
  "backup_date": "2026-06-01T10:30:00.000Z",
  "total_receitas": 15500.00,
  "total_despesas": 8200.00
}
```

### Funções Disponíveis

#### `agendarBackupAutomatico(storage)`

Agenda backup automático (chamado automaticamente em app/page.tsx):

```typescript
import { agendarBackupAutomatico } from "@/lib/automatic-backup";

useEffect(() => {
  agendarBackupAutomatico(window.localStorage);
}, []);
```

**Comportamento:**
- Executa imediatamente se não fez backup hoje
- Verifica a cada 1 hora
- Limpa timer ao sair da página

#### `forcarBackupAgora(storage)`

Força backup imediato (útil para testes ou quando usuário pede):

```typescript
import { forcarBackupAgora } from "@/lib/automatic-backup";

async function fazerBackupManual() {
  const resultado = await forcarBackupAgora(window.localStorage);
  if (resultado.success) {
    console.log("✅ Backup realizado:", resultado.backup_id);
  } else {
    console.error("❌ Erro:", resultado.message);
  }
}
```

#### `onBackupStatusChange(callback)`

Registra callback para receber notificações de backup:

```typescript
import { onBackupStatusChange } from "@/lib/automatic-backup";

const unsubscribe = onBackupStatusChange((status) => {
  console.log(status);
  // {
  //   timestamp: "2026-06-01T10:30:00.000Z",
  //   success: true,
  //   message: "Backup realizado: 1.200 lançamentos",
  //   backup_id: "abc-123-def"
  // }
});

// Quando não precisar mais:
unsubscribe();
```

### Sequência de Eventos

#### Dia 1 (Primeira vez)

```
09:00  → Usuário entra na página
        → useEffect chama agendarBackupAutomatico()
        → Sistema verifica: nunca fez backup hoje?
        → SIM! Faz backup imediatamente
        ✅ 1º backup realizado com 1.200 lançamentos

10:00  → Sistema verifica cada 1 hora
        → Já fez backup hoje?
        → SIM! Não faz nada (economiza banda)

15:00  → Usuário adiciona novo lançamento
        → Usa auto-sync (sobe para Supabase)
        → Usa agendarBackupAutomatico
        ❌ Ainda não faz backup (limite de 1 por dia)

23:59  → Meia noite chegando
        → Sistema mantém estado: "Fez backup hoje"

00:00  → Novo dia! Reset automático
        → Se usuário voltar a acessar:
        → Verifica: Nunca fez backup hoje?
        → SIM! Próximo backup executará
```

#### Dia 2

```
08:00  → Usuário entra na página
        → Verifica: fez backup hoje?
        → NÃO! (reset ao virar meia-noite)
        ✅ 2º backup realizado com 1.250 lançamentos
        → Agora espera até próxima meia-noite
```

### Recuperação de Backup

Para recuperar dados de um backup (futuro feature):

```typescript
// Buscar histórico de backups
const { data: backups } = await supabase
  .from('controle_financeiro_backups')
  .select('*')
  .eq('user_id', usuario.id)
  .order('backup_date', { ascending: false });

// Restaurar um backup específico
const backup = backups[0]; // Mais recente
const lancamentos = backup.dados.lancamentos;
localStorage.setItem('lancamentos', JSON.stringify(lancamentos));
```

### Segurança

✅ **RLS (Row Level Security):**
- Cada usuário vê apenas seus backups
- INSERT requer autenticação
- DELETE protegido por user_id

✅ **HTTPS:**
- Supabase usa HTTPS para todas as requisições
- Dados criptografados em trânsito

✅ **Hash Detection:**
- Detecta mudanças nos dados
- Evita backups redundantes
- Economiza banda e espaço

✅ **Autenticação:**
- Verifica `obterUsuarioAtual()` antes de backup
- Não faz backup se logout
- Token de usuário verificado pelo Supabase

### Estatísticas de Economia

**Com 5.000 lançamentos:**

```
Sem backup automático:
  - Usuário exporta JSON: ~500 KB
  - Faz manualmente 1x/mês
  - Risco total: tudo se perder

Com backup automático:
  - Sistema faz 1x/dia automaticamente
  - Detecta mudanças com hash
  - Não faz backup se nada mudou
  - Banda: ~300-500 KB/dia (apenas quando há mudanças)
  - Segurança: ✅ Diária sem ação do usuário
  - Recuperação: ✅ Histórico de todos os backups
```

---

## 🔧 Configuração

### Variáveis de Ambiente (já configurado)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxx
```

### Modo Debug

Para ativar logs de backup (desenvolvimento):

```typescript
import { agendarBackupAutomatico } from "@/lib/automatic-backup";

// Verificar logs no console do navegador
agendarBackupAutomatico(window.localStorage);
// [AUTO-BACKUP] Iniciando backup automático...
// [AUTO-BACKUP] Usuário autenticado: john@example.com
// [AUTO-BACKUP] ✅ Backup bem-sucedido: 1.200 lançamentos
```

---

## 📊 Monitoramento

### Verificar Status de Backup

```typescript
import { obterStatusBackup } from "@/lib/automatic-backup";

const status = obterStatusBackup();
console.log(status);
// {
//   ultimoBackupDiario: "2026-06-01T10:30:00.000Z",
//   jafezBackupHoje: true
// }
```

### Verificar Histórico de Backups

No Supabase Dashboard:
1. Ir para "SQL Editor"
2. Executar:
   ```sql
   SELECT 
     backup_date,
     lancamentos_count,
     backup_hash
   FROM controle_financeiro_backups
   WHERE user_id = 'seu-user-id'
   ORDER BY backup_date DESC
   LIMIT 30;
   ```

---

## 🚀 Melhorias Futuras

### Paginação
- [ ] Carregamento virtual (render apenas visível)
- [ ] Salvar última página visitada
- [ ] Filtro rápido por página (ex: "Últimos 30 dias" = page 1)

### Backup
- [ ] Interface de restauração no app
- [ ] Seletor de data para restaurar
- [ ] Comparação entre backups
- [ ] Exportação de backup JSON direto
- [ ] Backup incremental (apenas mudanças)
- [ ] Backup multi-cloud (Google Drive + Supabase)

---

## 📝 Notas Técnicas

### Performance

**Paginação:**
- Renderiza 50 elementos ao invés de 5.000+
- Reduz tempo de renderização em 100x
- Menos memória usada no navegador

**Backup:**
- Hash detection evita uploads desnecessários
- Verifica 1x/hora (baixo impacto)
- Apenas 1 backup por dia (limite sensato)

### Compatibilidade

- ✅ Chrome, Firefox, Safari, Edge
- ✅ Desktop, Tablet, Mobile
- ✅ Offline funciona (backup agendado para depois)

### Responsividade

**Componente PaginationControls:**
- Desktop: Botões + selector em uma linha
- Tablet: Botões em múltiplas linhas
- Mobile: Verticalmente empilhado

---

## 🐛 Troubleshooting

### Paginação não aparece

**Causa:** Menos de 50 registros
**Solução:** Normal - paginação só aparece se houver > 50 registros

### Backup não sincroniza

**Causa:** Usuário não autenticado
**Solução:** Fazer login primeiro

**Causa:** Sem mudanças desde último backup
**Solução:** Normal - hash detection evita backups desnecessários

### Erro: "Tabela controle_financeiro_backups não existe"

**Causa:** Migration não foi executada
**Solução:** Executar migration:
```sql
-- Executar migration no Supabase SQL Editor
-- Arquivo: supabase/migrations/20260601000000_criar_tabela_backups.sql
```

---

## 📞 Suporte

Para problemas com:
- **Paginação:** Verificar `lib/usePagination.ts` e `components/PaginationControls.tsx`
- **Backup:** Verificar `lib/automatic-backup.ts` e logs do navegador (F12 → Console)
- **Supabase:** Verificar RLS policies em `controle_financeiro_backups` table

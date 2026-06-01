# ⚙️ Sistema de Sincronização Automática de Dados

## 📋 Problema Resolvido

**Risco anterior:** Perda de dados em caso de:
- Formatação do computador
- Troca de navegador
- Limpeza de cache do navegador
- Limpeza de localStorage

**Solução:** Sincronização automática com a nuvem (Supabase) a cada alteração, quando o usuário está logado.

---

## 🔧 Como Funciona

### Fluxo de Sincronização

```
Usuário modifica dados
         ↓
Dados salvos no localStorage
         ↓
agendarSincronizacao() é chamado (debounce de 3 segundos)
         ↓
Se usuário está logado → Sincroniza com Supabase
         ↓
Sucesso → Notificação ao usuário (opcional)
Erro → Log no console para diagnóstico
```

### Onde o Auto-Sync é Acionado

1. **Planilha (page.tsx)**
   - Adicionar lançamento
   - Editar lançamento
   - Remover lançamento
   - Duplicar lançamento

2. **Resumo do Mês (resumo-mes/page.tsx)**
   - Adicionar lançamento do mês
   - Criar/editar/remover recorrências
   - Criar/editar/remover metas
   - Alterar status de fechamento do mês

---

## ⚙️ Configuração

### Arquivo: `lib/auto-sync.ts`

Você pode customizar o comportamento alterando a configuração:

```typescript
// Padrão: aguardar 3 segundos antes de sincronizar
configureAutoSync({
  delayMs: 3000,      // Tempo em ms para aguardar antes de sincronizar
  debugMode: true,    // Mostrar logs no console (útil para debugging)
});
```

### Para Ativar Debug Mode em Produção

```typescript
// No componente
import { configureAutoSync } from '@/lib/auto-sync';

useEffect(() => {
  configureAutoSync({ debugMode: true });
}, []);
```

---

## 🛡️ Recursos de Segurança

### ✅ O que é Protegido

- ✓ Sincronização **automática** a cada alteração
- ✓ Verificação de **usuário autenticado** antes de sincronizar
- ✓ Detecção de **mudanças reais** (usa hash para não sincronizar se nada mudou)
- ✓ **Debounce** para evitar requisições excessivas
- ✓ Reconnexão automática quando **internet volta** (online event)
- ✓ Tentativa de sincronizar quando o aplicativo voltou **online**

### 🔍 Detecção de Mudanças

O sistema usa hash para detectar se dados realmente mudaram:

```typescript
// Se o hash dos dados é o mesmo, não sincroniza
const novoHash = await calcularHashDados(storage);
if (novoHash === lastSyncHash) {
  // Pula sincronização
  return;
}
```

---

## 📱 Monitoramento e Debugging

### Ver Status de Sincronização

```typescript
import { obterStatusAutoSync } from '@/lib/auto-sync';

// Obter status atual
const status = obterStatusAutoSync();
console.log(status);
// {
//   isSyncing: false,
//   lastSyncTime: 1234567890,  // timestamp
//   error: null,
//   isOnline: true
// }
```

### Notificações de Sincronização

O sistema pode enviar notificações do navegador quando:
- ✅ Sincronização bem-sucedida
- ❌ Erro na sincronização

Requisitos:
- Permissão de notificações do navegador concedida
- Ambiente com HTTPS (ou localhost para testes)

---

## 🔌 Integração em Novos Componentes

Se você criar novos componentes que salvam dados, use:

```typescript
import { agendarSincronizacao } from '@/lib/auto-sync';

// Após salvar dados no localStorage
salvarMeusDados(window.localStorage, dados);
agendarSincronizacao(window.localStorage);
```

---

## ⚠️ Limitações e Considerações

### Debounce
- A sincronização aguarda **3 segundos** após a última alteração
- Múltiplas alterações rápidas são agrupadas em uma sincronização
- Previne requisições excessivas à nuvem

### Offline
- Dados continuam sendo salvos no **localStorage** mesmo offline
- Sincronização é tentada quando volta online
- **Sem sincronização automática offline** (proteção contra requisições perdidas)

### Limite de Tamanho
- Supabase tem limite de tamanho de payload (padrão 100MB)
- Backup JSON com muitos lançamentos pode atingir limite
- Considere fazer limpeza periódica de dados antigos

---

## 🧪 Testando o Auto-Sync

### Teste 1: Verificar se sincroniza automaticamente
1. Faça login na página de Nuvem
2. Abra a Planilha em nova aba
3. Adicione um lançamento
4. Aguarde 3 segundos
5. Verifique em DevTools → Application → Local Storage se dados foram salvos
6. Verifique em Supabase se dados foram salvos na nuvem

### Teste 2: Verificar se detecta mudanças
1. Adicione um lançamento (vai sincronizar)
2. Adicione outro lançamento (vai sincronizar)
3. Mude para outra aba por 4 segundos
4. Volte à aba
5. Não deve sincronizar se nada mudou

### Teste 3: Desconectar a internet
1. Adicione um lançamento
2. Desconecte a internet (DevTools → Network → Offline)
3. Adicione outro lançamento
4. Reconecte internet
5. Deve sincronizar automaticamente

---

## 🐛 Troubleshooting

### Sincronização não está acontecendo

**Checklist:**
- ✓ Usuário está logado? (Verificar página de Nuvem)
- ✓ Navegador tem permissão de notificações?
- ✓ Internet está conectada?
- ✓ Ativar `debugMode: true` para ver logs no console

### Erros de sincronização

```
[AutoSync] Erro ao sincronizar: Entre na conta antes de sincronizar.
```

→ Faça login na página de Nuvem

```
[AutoSync] Offline. Sincronização será tentada quando online.
```

→ Reconecte à internet. Sistema sincronizará automaticamente.

---

## 📊 Monitoramento em Produção

Para monitorar sincronizações em produção, adicione logging:

```typescript
// Em um hook customizado
import { onAutoSyncStatusChange } from '@/lib/auto-sync';

export function useSyncMonitor() {
  useEffect(() => {
    onAutoSyncStatusChange((status) => {
      if (status.isSyncing) {
        console.log('Sincronizando...');
      }
      if (status.lastSyncTime) {
        console.log(`Última sincronização: ${new Date(status.lastSyncTime).toISOString()}`);
      }
    });
  }, []);
}
```

---

## 🔐 Segurança

### Dados Sensíveis

Todos os dados são sincronizados com **criptografia HTTPS** para a nuvem (Supabase):

```typescript
// Antes de sincronizar:
// 1. Verifica se usuário está autenticado
// 2. Valida token JWT do Supabase
// 3. Dados são enviados via HTTPS
// 4. Supabase armazena isolado por user_id
```

### Isolamento de Dados

Cada usuário vê apenas seus próprios dados:

```typescript
// cloud-sync.ts
const { data, error } = await supabase
  .from("controle_financeiro_dados")
  .select("dados, updated_at")
  .eq("user_id", user.id)  // ← Apenas do usuário logado
  .maybeSingle();
```

---

## 📈 Próximas Melhorias (Sugestões)

- [ ] Sync em tempo real com WebSockets
- [ ] Merge inteligente de conflitos (quando usuário edita em múltiplas abas)
- [ ] Histórico de versões dos dados
- [ ] Compressão de dados para economizar banda
- [ ] Sync progressivo para dados muito grandes

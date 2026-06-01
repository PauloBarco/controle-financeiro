# 📊 Dashboard Visual - Guia Completo

## 🎯 O Que É

Um dashboard interativo que mostra toda a saúde financeira da casa com:
- **Cards Kanban** de resumo
- **Gráficos visuais** coloridos e interativos
- **Dados em tempo real** baseados na planilha

---

## 📈 Gráficos Inclusos

### 1. **Cards de Resumo (Estilo Kanban)**
Quatro cards principais:

```
┌──────────────────────┬──────────────────────┐
│  📈 Total Receitas   │  📉 Total Despesas  │
│  R$ 15.500,00        │  R$ 8.200,00        │
└──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┐
│  💰 Saldo            │  ⏳ Despesas Pend.  │
│  R$ 7.300,00         │  R$ 1.200,00        │
└──────────────────────┴──────────────────────┘
```

- **Cores codificadas**: Verde (receita), Vermelho (despesa), Azul (saldo), Amarelo (pendente)
- **Ícones indicativos**: Fácil identificação visual

### 2. **Maior Receita e Maior Despesa**
Cards destacando as transações mais significativas:

```
┌─────────────────────────┬─────────────────────────┐
│ Maior Receita           │ Maior Despesa           │
│ ─────────────────────   │ ─────────────────────   │
│ Salário                 │ Compra Mercado          │
│ R$ 5.000,00             │ R$ 800,00               │
│ 📅 Salario | 01/06/2026 │ 📅 Mercado | 28/05/2026│
└─────────────────────────┴─────────────────────────┘
```

### 3. **Evolução Mensal (Line Chart)**
Gráfico de linhas mostrando:
- 📈 Receitas (linha verde)
- 📉 Despesas (linha vermelha)
- 💰 Saldo (linha azul tracejada)

```
R$ 10.000 │      
          │   ╱──╲   ╱─
R$ 8.000  │  ╱    ╲╱  
          │ ╱        
          │╱─────────── (Meses)
```

**Útil para:** Ver tendências ao longo do tempo

### 4. **Receitas vs Despesas por Categoria (Bar Chart)**
Gráfico de barras comparando:
- Barras verdes = Receitas
- Barras vermelhas = Despesas
- Por cada categoria

```
Mercado       ║▓▓▓▓░░░
Salário       ║░░░░░░░░▓▓▓▓▓
Moradia       ║▓▓▓▓░░░░░
```

**Útil para:** Identificar onde vem e para onde vai o dinheiro

### 5. **Despesas por Categoria (Pie Chart)**
Gráfico de pizza + tabela lateral:

```
        ╭─────────╮
       ╱░░░░░░░░░░░ Mercado 35%
      ╱░░░░░░░░░░░░░
     │░░░░░░░░░░░░░░░ Moradia 25%
     │░░░░░░░░░░░░░░░
      ╲░░░░░░░░░░░░░ Outros 40%
       ╲░░░░░░░░░░╱
        ╰─────────╯
```

Lado a lado com legenda:
```
🟢 Mercado    R$ 700,00   35%
🔴 Moradia    R$ 500,00   25%
🔵 Outros     R$ 800,00   40%
```

---

## 🚀 Como Acessar

### Via Navegação
1. Clique em **"Dashboard"** no menu superior

### Via Botão na Planilha
1. Na página inicial, clique em **"Ver dashboard"**

### Via URL Direta
- Acesse: `http://localhost:3000/dashboard`

---

## 🎨 Design

### Paleta de Cores

| Tom | Cor | Uso |
|-----|-----|-----|
| **Receita** | 🟢 Verde (#15803d) | Entradas de dinheiro |
| **Despesa** | 🔴 Vermelho (#b91c1c) | Saídas de dinheiro |
| **Saldo** | 🔵 Azul (#2563eb) | Saldo geral |
| **Pendente** | 🟡 Amarelo (#f59e0b) | Pendências |

### Componentes

- **Cards Kanban**: Fundo colorido, ícone, título, valor
- **Gráficos**: Interativos (hover mostra valores exatos)
- **Tooltips**: Aparecem ao passar mouse sobre dados

---

## 📱 Responsivo

✅ **Funciona em:**
- Desktop (layout completo)
- Tablet (2 colunas em alguns gráficos)
- Mobile (1 coluna, rolável)

---

## 💡 Dados em Tempo Real

### Como Funciona

```
Usuário adiciona lançamento na Planilha
         ↓
localStorage atualizado
         ↓
Vai para Dashboard
         ↓
Dashboard lê localStorage
         ↓
Gráficos atualizam automaticamente ✅
```

**Sem necessidade de refresh!**

---

## 🔍 Funcionalidades Detalhadas

### Cards Kanban

```typescript
// Mostra em tempo real:
- Total de receitas (todas as entradas)
- Total de despesas (todas as saídas)
- Saldo (receitas - despesas)
- Despesas pendentes (só as não pagas)
```

### Maior Item

```typescript
// Encontra automaticamente:
- Maior receita registrada
  - Descrição
  - Valor
  - Categoria
  - Data
  
- Maior despesa registrada
  - Descrição
  - Valor
  - Categoria
  - Data
```

### Evolução Mensal

```typescript
// Agrupa por mês (YYYY-MM):
Mês 1: Receitas R$ 5000, Despesas R$ 3000, Saldo R$ 2000
Mês 2: Receitas R$ 5500, Despesas R$ 3200, Saldo R$ 2300
Mês 3: Receitas R$ 6000, Despesas R$ 3500, Saldo R$ 2500
```

### Categoria com Maior Despesa

```typescript
// Identifica:
- Qual categoria tem maior gasto total
- Mostra o valor total na categoria
- Exemplo: "Mercado - R$ 2.500,00"
```

---

## 🎯 Casos de Uso

### Para o Usuário

| Pergunta | Onde Encontrar |
|----------|------------------|
| "Quanto tenho de saldo?" | Cards Kanban - Saldo |
| "Qual é minha maior receita?" | Card "Maior Receita" |
| "Qual é minha maior despesa?" | Card "Maior Despesa" |
| "Qual categoria gasta mais?" | Gráfico Pie + Card categoria |
| "Como está o saldo ao longo do tempo?" | Gráfico Evolução Mensal |
| "Onde vai meu dinheiro?" | Gráfico Despesas por Categoria |
| "Receitas vs Despesas por categoria?" | Gráfico Bar Chart |

---

## 🔧 Técnico

### Arquivos Envolvidos

#### Novo: `lib/dashboard-stats.ts`
Funções de cálculo de dados:
- `calcularStatsDashboard()` - stats gerais
- `agruparDespesasPorCategoria()` - agrupa despesas
- `calcularEvolucaoMensal()` - dados por mês
- `calcularReceitaVsDespesaPorCategoria()` - comparação

#### Novo: `components/GraficosDashboard.tsx`
Componentes Recharts:
- `GraficoReceitaVsDespesa` - Bar chart
- `GraficoEvolucaoMensal` - Line chart
- `GraficoDespesasPorCategoria` - Pie chart

#### Novo: `app/dashboard/page.tsx`
Página do dashboard:
- Layout Kanban
- Integração de gráficos
- Cards de resumo

#### Modificado: `components/AppShell.tsx`
Adicionado link para dashboard no menu

#### Modificado: `app/page.tsx`
Adicionado botão "Ver dashboard"

---

## 📦 Dependências

Instalada: **Recharts**
```bash
npm install recharts
```

Características:
- ✅ Responsivo
- ✅ Lightweight
- ✅ Customizável
- ✅ Interativo
- ✅ Bem documentado

---

## 🎨 Customização Futura

Ideias de melhorias:

```typescript
// 1. Filtros de data
<DateRangePicker />  // Mostrar apenas período específico

// 2. Exportar como imagem
<button>📥 Exportar Dashboard</button>

// 3. Comparar períodos
<ComparadorPeriodos />  // "Junho vs Maio"

// 4. Metas
<MetasVisuais />  // "Meta mensal: R$ 500 - Atingido 80%"

// 5. Previsões
<PrevisaoMeses />  // "Se continuar neste ritmo..."

// 6. Alertas
<AlertasDespesas />  // "Cuidado! Passou 20% da meta"
```

---

## ✅ Checklist

- ✅ Dashboard criado com Recharts
- ✅ 4 gráficos diferentes
- ✅ Cards Kanban de resumo
- ✅ Dados em tempo real
- ✅ Design responsivo
- ✅ Cores codificadas
- ✅ Ícones indicativos
- ✅ Compilação sem erros
- ✅ Integrado na navegação
- ✅ Documentação completa

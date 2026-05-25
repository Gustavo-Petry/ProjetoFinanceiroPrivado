# 🐷 Petry Finance

Aplicativo de controle financeiro pessoal desenvolvido com React + Firebase. Permite acompanhar salário, benefícios, gastos, cofrinhos e objetivos em tempo real, com suporte a múltiplos usuários via autenticação Google.

---

## Funcionalidades

### Dashboard
- KPIs do mês: renda total, gastos, saldo livre e taxa de gastos
- Variação percentual dos gastos em relação ao mês anterior
- Cards dinâmicos por fonte de renda (salário, VT, VR, etc.) com saldo restante
- Barras de orçamento por categoria
- Prévia de cofrinhos e objetivos

### Lançamentos
- Cadastro de gastos com descrição, valor, categoria, data e fonte de pagamento
- Campo "Pago com" — vincula cada gasto à fonte correta (salário ou benefício)
- Orçamento mensal por categoria com barra de progresso
- Filtro por mês e por categoria
- Edição e exclusão de lançamentos

### Fixos
- Cadastro de despesas fixas mensais (aluguel, assinatura, etc.)
- Marcar como pago no mês atual

### Cofrinhos
- Criação de cofrinhos com ícone, cor e valor inicial
- Meta de valor com barra de progresso e sugestão de depósito mensal
- Integração com Objetivos: cofrinhos marcados como meta aparecem automaticamente na aba Objetivos

### Combustível
- Registro de abastecimentos com divisão automática entre VT e salário
- Se o gasto passar do limite do Vale Transporte, o excedente é lançado automaticamente como gasto no salário
- Histórico mensal com breakdown VT vs. salário
- Médias mensais históricas

### Objetivos
- Gerados automaticamente a partir de cofrinhos com meta ativada
- Depósitos vinculados ao cofrinho correspondente
- Edição de meta e data-alvo diretamente na aba

### Gráficos
- Visualizações de gastos por categoria e evolução mensal

---

## Controle de Acesso

- Login via Google (Firebase Auth)
- Novos usuários ficam em estado "Aguardando aprovação"
- Admin aprova, nega ou revoga acessos pelo painel **Gerenciar Acessos**
- Ao revogar com exclusão de dados: remove todos os registros financeiros do usuário do Firestore

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| Estilização | CSS puro (Grid + Flexbox) |
| Banco de dados | Firebase Firestore |
| Autenticação | Firebase Auth (Google) |
| Hospedagem | Firebase Hosting |
| Gráficos | Recharts |

---

## Rodando localmente

```bash
npm install
npm run dev
```

### Deploy

```bash
npm run build
firebase deploy
```

---

## Configuração Firebase

Crie um projeto no [Firebase Console](https://console.firebase.google.com), ative **Authentication** (Google) e **Firestore**, e configure as variáveis em `src/firebase.js`.

As regras do Firestore ficam em `firestore.rules` e são aplicadas com `firebase deploy --only firestore`.

---

Desenvolvido por **Gustavo Petry** & Claude · 2026

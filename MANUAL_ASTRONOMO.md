# Manual do Astrônomo (usuário de campo)

Este manual explica como usar o sistema **Agenda Inteligente Astronauta (Demo)** no dia a dia em campo: agenda, rotas, despesas, histórico e feedbacks.

---

## 1) Visão geral do sistema

O sistema foi feito para organizar sua operação diária e registrar custos de forma rastreável:

- **Agenda** (`index.html`): calendário + lista do dia, detalhes do evento e atalho para concluir a tarefa.
- **Rotas** (`rotas.html`): planejamento de deslocamento e estimativas (combustível, hospedagem, alimentação, pedágios).
- **Despesas** (`despesas.html`): lançar despesas reais por evento/tarefa, comparar com estimativas e consolidar lucro.
- **Históricos** (`historico.html`): ver eventos finalizados e pendentes, filtros, exportação e reabertura de despesas.
- **Feedbacks** (`feedbacks.html`): visão de qualidade por evento (texto/nota), sentimento e filtros.
- **Minha Conta** (`account.html`): ver dados da sua sessão (parâmetros) e sair.
- **Debug** (`debug-astronomo.html`): auditoria para quando algo “sumiu”/divergiu na agenda.

### Regra central (muito importante)

- A unidade operacional é a **tarefa do dia**.
- Se um evento dura 10 dias, o esperado é virem **10 tarefas** (uma por dia).
- **Não multiplique** despesas por “diárias do evento”: registre **tarefa por tarefa**.

---

## 2) Login e sessão

1. Acesse `login.html`.
2. Informe **usuário** e **senha** (fornecidos pela operação/RH).
3. Ao entrar, o sistema grava sua sessão e libera as páginas do menu.

Para encerrar a sessão:
- Vá em `account.html` e clique em **Sair**.

---

## 3) Como visualizar e gerenciar a agenda (Agenda)

Página: `index.html`

### 3.1 Carregar/atualizar agenda

- Use **Atualizar agenda** para buscar os eventos do dia/período.
- Use o filtro **Tipo de tarefa** para ver *VISITA*, *PRÉ*, *RESERVA* e *NÃO MARCAR*.

Dica: se o calendário estiver vazio, pode significar que você está **livre** no período (ou que a tarefa veio sem data).

### 3.2 Abrir detalhes do evento

- Clique no evento (na lista ou no dia do calendário) para abrir o **modal de detalhes**.
No modal você pode:
- Ver campos principais (escola/cidade/responsável/valor).
- Abrir **WhatsApp** (se houver contato).
- Abrir **Rota GPS** e buscar **Hotéis** (quando aplicável).
- Ver **Galeria** (imagens vinculadas ao evento, quando existirem).

### 3.3 Finalizar (atalho para despesas) — apenas em VISITA

No modal, o botão **Finalizar** aparece **somente** para eventos do tipo **VISITA**.

O que ele faz:
- Abre `despesas.html` já com o contexto do evento salvo no navegador (para abrir o formulário certo).

Se o botão não aparecer:
- Confirme se o **Tipo de tarefa** do evento é **VISITA** (eventos PRÉ/RESERVA/NÃO MARCAR não lançam despesas nesse fluxo).

### 3.4 Deletar evento (atenção)

O botão **Deletar** remove o evento via integração.
Use apenas quando houver orientação operacional (evite deletar por engano).

---

## 4) Como lançar despesas e concluir o fluxo (Despesas)

Página: `despesas.html`

### 4.1 Entendendo as visões

- **Pendentes**: eventos **não finalizados** (prioridade operacional).
- **Lançadas**: eventos **finalizados**.

E na área de resumo:
- **Estimados**: valores previstos (cálculo do sistema).
- **Reais**: valores efetivamente lançados (após envio do formulário).

### 4.2 Abrir o formulário do evento correto

Você pode abrir o formulário de despesas de 3 formas:

1. Pela Agenda (`index.html`) → **Finalizar**.
2. Pelo Histórico (`historico.html`) → **Lançar despesas deste evento** (quando disponível).
3. Diretamente em `despesas.html` selecionando o evento na lista (seletor/cards).

Se o formulário não abrir automaticamente:
- Abra `despesas.html`, localize o evento em **Pendentes** e clique em **Lançar despesas**.

### 4.3 Preencher e enviar despesas reais

No formulário, confira o **ID do evento** e preencha os valores reais:

- Combustível
- Hospedagem (quando aplicável)
- Alimentação
- Pedágios
- Monitor
- Outros (custos extras não previstos)

Ao enviar:
- O sistema grava as despesas via `action=lancar_despesas`.
- A tarefa passa a ser tratada como **finalizada** (vai para **Lançadas** e reflete em indicadores/lucro).

### 4.4 Regras financeiras (resumo prático)

- **Alimentação**: aplicada em toda tarefa de VISITA.
- **Monitor**: aplicado em toda tarefa de VISITA (presença diária).
- **Hospedagem**: apenas quando houver **bloco consecutivo** elegível (pernoite).
- **Combustível**: considera ida/volta quando não for rota contínua; em rota contínua usa perna a perna.
- **Pedágios**: por trecho conforme necessidade.

---

## 5) Como consultar o histórico (Históricos)

Página: `historico.html`

Use o histórico para:
- Ver o que está **finalizado** e o que está **pendente**.
- Filtrar por cidade/período/busca.
- Abrir detalhes do evento.
- Ver **despesas reais** quando estiverem presentes no payload (aparecem no modal).
- Exportar uma visão filtrada para **CSV**.

Se o evento for **VISITA** e estiver **não finalizado**, o modal pode mostrar o botão:
- **Lançar despesas deste evento** (atalho para `despesas.html`).

---

## 6) Como usar rotas (Rotas)

Página: `rotas.html` (ou botão **Rotas** na Agenda)

Use para:
- Planejar deslocamentos.
- Ver blocos de **rota contínua** (eventos consecutivos).
- Entender estimativas de custo (combustível/hospedagem/alimentação/pedágios).

Se algo não aparecer:
- Confirme se a agenda foi carregada e se os eventos têm cidade/endereço/coordenadas suficientes.

---

## 7) Como usar feedbacks e enviar sugestões

### Feedbacks por evento

Página: `feedbacks.html`

Você consegue:
- Ver feedbacks vinculados a eventos (texto/nota).
- Filtrar e analisar sentimento (positivo/neutro/negativo).

### Sugestões do app

Página: `feedback.html`

Use para enviar:
- Sugestões de melhoria.
- Prints/anexos quando necessário.

Evite anexar dados sensíveis (ver seção de ética).

---

## 8) Dicas, boas práticas e ética

- **Segurança primeiro**: não use o sistema enquanto dirige.
- **Integridade**: lance despesas reais e justificáveis; não “chute” valores.
- **Privacidade**: não compartilhe dados pessoais de alunos/responsáveis fora do necessário; evite colocar telefones/nomes completos em sugestões/prints.
- **Cuidado ao deletar**: se não tiver certeza, não use **Deletar**.
- **Atualize antes de agir**: clique em **Atualizar agenda** antes de lançar despesas, principalmente após alterações operacionais.
- **Quando pedir ajuda**: se o evento não tiver ID, se faltar na agenda/histórico ou se despesas não puderem ser lançadas, reporte ao suporte com print do erro do console (se souber) e o ID do evento.

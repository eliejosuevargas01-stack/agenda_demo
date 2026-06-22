# Manual do Técnico (manutenção e suporte)

Este manual descreve como manter, diagnosticar e corrigir problemas comuns do **Agenda Inteligente Astronauta (Demo)**, com foco em integrações via **n8n**.

Manual específico do enriquecimento (Fluxo 01 — separa por ID-Tarefa):
- `MANUAL_TECNICO_ENRIQUECIMENTO_FLUXO01.md`

Manual do worker de rotas/distâncias (n8n):
- `MANUAL_TECNICO_WORKER_ROTAS_DISTANCIAS.md`

Manual do workflow de serviço do frontend (agenda-astronomos):
- `MANUAL_TECNICO_FLUXO_AGENDA_ASTRONOMOS.md`

Manual do workflow administrativo e de login (novo-astronomo-1 / painel RH):
- `MANUAL_TECNICO_FLUXO_PAINEL_RH_ASTRONOMOS.md`

---

## 1) Visão técnica do sistema (arquitetura)

### Frontend

- O projeto é um **frontend estático** (HTML/CSS/JS) com páginas separadas por função: agenda, rotas, despesas, histórico, feedbacks e painéis administrativos.
- Não há build pipeline obrigatório: basta servir os arquivos via HTTP (ex.: Live Server) para permitir `fetch()`.

### Backend / Integrações

O frontend conversa com o n8n via **webhooks** e ações (`action=...`), principalmente:

- **Agenda**: `/webhook/agenda-astronomos`
- **Astrônomos + Admin**: `/webhook/novo-astronomo-1`
- **Sugestões do app**: webhook configurável usado por `feedback.html`

### Regra de dados que impacta bugs

- A unidade operacional é a **tarefa do dia** (não “um evento com N diárias”).
- Muitas telas assumem que o payload vem “tarefa por tarefa”; isso impacta despesas, rotas e históricos.

---

## 2) Onde configurar URLs e endpoints

As URLs do n8n estão hardcoded em algumas páginas. Quando trocar ambiente (homolog/prod), ajuste:

- Login astrônomo: `login.html` (`AUTH_WEBHOOK_URL`)
- Login admin (RH): `admin-login.html` (`ADMIN_AUTH_WEBHOOK_URL`)
- Agenda/Rotas/Histórico/Feedbacks/Despesas: `index.html`, `rotas.html`, `historico.html`, `feedbacks.html`, `despesas.html` (constantes `API_AGENDA`/`AGENDA_WEBHOOK_URL`)
- Painel RH: `rh-astronomos.html` (`API_AGENDA`, `API_ASTRO_BASE`)
- Debug: `debug-astronomo.html`, `debug-rh.html` (`API_AGENDA` e, no RH, `API_ASTRO_BASE`)
- Sugestões do app: `feedback.html` (precisa de `window.FEEDBACK_WEBHOOK_URL`; alternativa: `localStorage['feedback_webhook_url']`)

Recomendação de operação: mantenha as URLs em **HTTPS** e valide CORS (principal causa de “não conecta”).

---

## 3) Actions suportadas (resumo)

### `/webhook/agenda-astronomos`

- `atualizar_agenda`: retorna agenda operacional
- `finalizados`: retorna eventos finalizados
- `historico`: base para a tela de histórico e para despesas
- `lancar_despesas`: grava despesas reais (e marca finalização)
- `get_feedback`: base para a tela de feedbacks
- `delete_evento`: remove evento
- `debug`: usado nas telas de auditoria

### `/webhook/novo-astronomo-1`

- Astrônomos: `list`, `add`, `edit`, `delete`, `import_csv`
- Login: `login` (astrônomo), `admin` (admin do RH)
- Admins do RH: `get_admin`, `add_admin`, `edit_admin`, `delete_admin`
- Imagens: `get_img`, `add_img`, `delete_img`

### Formato de payload (atenção)

- `login.html` e `admin-login.html`: enviam **`action`, `usuario`, `senha`** como **form-url-encoded** (`URLSearchParams`).
- As demais páginas normalmente enviam JSON (`Content-Type: application/json`) com `{ action, ...payload }`.

Se o webhook do n8n for alterado para aceitar apenas JSON (ou apenas form), ajuste o frontend para não quebrar autenticação.

---

## 4) Checklist de diagnóstico rápido (10 minutos)

1. **Abra o DevTools** do navegador:
   - Console: erros JS
   - Network: requests, payload e resposta
2. Confirme se a sessão existe no `localStorage`:
   - Astrônomo: `astronomo_session` (ou legado `userSession`)
   - Admin: `admin_session`
3. Valide se o request está indo para a **URL correta** e com a **action correta**.
4. No n8n, verifique:
   - Última execução do workflow
   - Logs de erro do nó de Webhook/HTTP Request/DB
5. Se houver divergência de dados, use:
   - `debug-astronomo.html` (usuário logado)
   - `debug-rh.html` (admin)

---

## 5) Problemas comuns (e como resolver)

### 5.1 “Não consigo logar” / redireciona para `login.html`

Possíveis causas:
- Resposta do n8n mudou de formato (o parser não reconhece “allowed”).
- `action` incorreta (`login` vs `admin`).
- CORS/SSL bloqueando a chamada.

Como diagnosticar:
- Veja a chamada do login no Network (status HTTP e corpo).
- Confirme que está enviando `usuario` e `senha` e recebendo um objeto com dados do usuário (ou “allow=true”).

Correções comuns:
- Ajustar o workflow para retornar um payload consistente.
- Ajustar `parseLoginAllowed`/`normalizeResponse` no login quando o backend mudar.

### 5.2 “Agenda vazia” (mas deveria ter eventos)

Possíveis causas:
- `action=atualizar_agenda` retornando vazio para o usuário.
- Evento sem data (não aparece no calendário).
- Filtro por tipo de tarefa ocultando a lista.
- Cache antigo na página.

Como diagnosticar:
- Network → resposta de `atualizar_agenda`.
- Console → verifique se houve erro em `normalizeEvent`/renderização.
- Limpe caches no `localStorage` (ver seção 6).

### 5.3 Erros de conexão com n8n (CORS / “Failed to fetch”)

Sinais típicos:
- Console com `TypeError: Failed to fetch`
- Request sem resposta (bloqueado pelo navegador)

Checklist:
- A URL do webhook está acessível no navegador?
- HTTPS ↔ HTTPS (evite mixed content).
- O n8n envia cabeçalhos CORS adequados (`Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`, etc.)?
- Preflight (OPTIONS) está permitido?

### 5.4 Botões de despesas/finalizar aparecendo (ou sumindo) “errado”

Regra de UI:
- Botão **Finalizar / lançar despesas** aparece **somente** em eventos de tipo **VISITA**.

Se o tipo vier com outro nome/campo:
- Atualize a detecção de tipo (ex.: `tipo_da_tarefa`, `tipo_evento`, `tipo`, ou `id_tipo_tarefa`).

### 5.5 Redirecionamento para despesas não abre o formulário automaticamente

Mensagens típicas no console:
- `Evento pendente de despesas não encontrado no payload de histórico...`
- `[error] Não foi possível localizar o evento para abrir despesas automaticamente.`

O que acontece tecnicamente:
- A página salva o contexto em `localStorage['despesas_evento_selecionado']` com `{ id, _open_expenses: true, ...evento }`.
- `despesas.html` tenta localizar esse `id` dentro do payload retornado por `action=historico`.
- Se não localizar, deve **cair no fallback** e abrir com o evento salvo no `localStorage`.

Principais causas de “não encontrar”:
- O `historico` não está retornando esse evento (filtro por usuário, período, status ou bug no workflow).
- O “ID estável” não está sendo reconhecido (o backend está usando um alias de ID não contemplado).
- O evento foi alterado/cancelado e o `id` mudou.

Como resolver:
- Verifique a resposta do `historico` no Network: o evento existe lá?
- Inspecione `localStorage['despesas_evento_selecionado']` e compare o `id` com os IDs do payload.
- Se o backend estiver usando outro campo (ex.: `id_tarefa`), inclua o alias no frontend (ex.: em `getEventStableId` / `getEventId`).
- Se o problema for que o evento não vem no `historico`, corrija o workflow para incluir o registro (ou incluir a tarefa pendente).

### 5.6 “Despesas reais não aparecem no histórico”

O `historico.html` tenta extrair despesas reais tanto do objeto raiz quanto de objetos aninhados (`despesas_reais`, `gastos_reais`, `despesas`, `gastos`).

Se o workflow mudou nomes:
- Atualize os aliases usados pelo extrator de despesas reais no `historico.html`.

### 5.7 Em `despesas.html` aparecem todos os eventos, mas ao abrir “Lançar despesas” a lista some

Sintoma:
- A grade aparece corretamente.
- Ao clicar em **Lançar despesas**, a tela passa a mostrar apenas um evento ou parece “sumir tudo”.

Causa técnica:
- O modal fazia um refresh completo do `historico`.
- Esse refresh reaplicava a seleção atual e trocava a grade pela renderização de um único evento.

Estado atual esperado:
- O modal pode atualizar os dados em segundo plano.
- Esse refresh não deve mais alterar a grade principal nem o seletor visível.

Como diagnosticar:
- Verifique se a busca aberta pelo modal está rodando em modo de refresh de fundo.
- Confirme que a lista principal continua sendo renderizada por `renderEventsForPeriod()`.
- Confirme que o modal reaproveita apenas o evento atualizado, sem chamar renderização exclusiva da grade.

### 5.8 Cards de estimativa zerados em `despesas.html`

Regra atual:
- O bloco **Estimados** deve priorizar os campos fixos do astrônomo:
  - `consumo_km_l`
  - `valor_litro`
  - `diaria_hospedagem`
  - `alimentacao_diaria`
  - `monitor`
  - `pedagios`

Somente depois entram campos equivalentes do próprio evento, quando existirem.

Importante:
- `completo` e `completo_ate` não definem mais status de finalização nessa tela.
- A separação `Pendentes` x `Lançadas` usa apenas `finalizado` / `finalizada`.
- O bloco **Reais** usa apenas despesas já lançadas no payload.

Checklist:
- Verifique se a sessão/logon carregou os dados fixos do astrônomo no `localStorage`.
- Verifique se `despesas.html` está lendo o payload consolidado da sessão/cache do astrônomo, e não só o evento bruto.
- Se os campos fixos vierem zerados do backend/admin, o frontend vai refletir zero.

---

## 6) Cache, estado local e como “resetar” sem dor

O sistema usa `localStorage` para sessão e caches. Problemas de “não atualiza” geralmente são cache/estado.

Chaves principais:
- Sessão astrônomo: `astronomo_session` (legado: `userSession`)
- Sessão admin: `admin_session`
- Cache agenda: `agenda_cache_v1::...` e `agenda_payload_v1::...`
- Cache rotas: `rotas_cache_v1` e `rotas_override_v1::...`
- Navegação para despesas: `despesas_evento_selecionado`

Como resetar:
1. Faça logout (`account.html` → **Sair**) quando aplicável.
2. Abra DevTools → Application → Local Storage e remova as chaves acima (ou “Clear site data”).
3. Recarregue com `Ctrl+Shift+R` para evitar cache do navegador.

---

## 7) Atualizações e manutenção (rotina recomendada)

Quando o backend muda:
- Atualize as **URLs** (se necessário).
- Atualize a lista de **aliases** (IDs, datas, tipo, cidade, etc.).
- Valide o fluxo ponta a ponta:
  1) `login.html` → `index.html` carrega agenda
  2) `index.html` → **Finalizar** salva `despesas_evento_selecionado`
  3) `despesas.html` abre o evento certo e envia `lancar_despesas`
  4) `historico.html` mostra finalização + despesas reais
  5) `feedbacks.html` carrega `get_feedback`
  6) `rh-astronomos.html` (admin) lista astrônomos, agenda, imagens e admins

Boas práticas:
- Evite mudanças grandes sem manter compatibilidade (payloads variam).
- Logue no n8n o `action` recebido e o `id` processado para facilitar suporte.

---

## 8) Ferramentas de diagnóstico e monitoramento

- **DevTools do navegador**: Console, Network, Application (localStorage).
- **Páginas de debug**:
  - `debug-astronomo.html` (comparação “originais/debug” vs “enriquecidos”)
  - `debug-rh.html` (mesma comparação, com seleção de astrônomo)
- **n8n**: executions, logs de erro, payloads de entrada/saída.

Quando escalar (dados de origem):
- Se o evento não está em nenhuma das duas bases comparadas, pode ser falha na tabela/origem de dados; registre evidências e acione o time responsável pela base original.

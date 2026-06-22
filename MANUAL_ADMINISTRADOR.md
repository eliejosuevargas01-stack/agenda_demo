# Manual do Administrador (Painel RH / Operação)

Este manual descreve como usar o **painel administrativo** (`rh-astronomos.html`) para gerenciar astrônomos, consultar agendas e manter imagens/fluxos administrativos.

---

## 1) Acesso (Login Admin)

1. Abra `admin-login.html`.
2. Faça login com usuário e senha de **admin** (não é o login do astrônomo).
3. Após autenticar, você será redirecionado para `rh-astronomos.html`.

Sessão e segurança:
- A sessão do admin fica separada da sessão do astrônomo (chave `admin_session` no navegador).
- Use **Sair** no topo do painel para encerrar a sessão.

---

## 2) Visão geral do painel RH

O painel tem 3 abas:

- **Astrônomos**: CRUD de cadastro (inclui parâmetros de custos/rota).
- **Agenda do Astrônomo**: consulta de eventos por profissional + gestão de imagens por evento.
- **Admins**: gestão dos usuários administradores do painel.

---

## 3) Como gerenciar astrônomos (aba “Astrônomos”)

### 3.1 Carregar e buscar

- Clique em **Atualizar** para carregar a lista.
- Use **Buscar astrônomos...** para filtrar.

### 3.2 Criar/editar/excluir

- **Novo Astrônomo**: abre um cadastro novo.
- Clique em um card para **editar** e depois **Salvar Alterações**.
- Use **Excluir** apenas quando houver confirmação operacional.

### 3.3 Importação em lote (CSV)

- Use **Importar CSV** para enviar um arquivo inteiro ao n8n (`action=import_csv`).
- O formato/colunas esperadas dependem do workflow; mantenha um modelo oficial para evitar falhas de importação.

### 3.4 Edição em massa e ações críticas

- **Editar Todos**: abre edição em massa (útil para padronizar parâmetros).
- **Apagar Todos (um a um)**: executa exclusão registro a registro (ação crítica; use com extremo cuidado).

### 3.5 Campos que impactam operação/financeiro (o que observar)

Alguns campos do cadastro alimentam cálculos e regras do sistema:

- **Cidade base / Estado**: referência de origem para rotas.
- **Latitude/Longitude de origem**: melhora cálculo de deslocamento; quando ausente, o painel tenta preencher por geocoding da cidade base (valide o resultado).
- **Consumo (km/l), Combustível, Valor do litro**: estimativas de combustível.
- **Diária hospedagem, Alimentação diária, Monitor, Pedágios**: parâmetros de custo.
- **Porcentagem de lucro**: usada para exibir lucro do astrônomo nos resumos.
- **IDs por tipo de tarefa**: `id_visita`, `id_pre`, `id_reserva`, `id_n_marcar` (importantes para a organização/filtragem de tarefas e compatibilidade com integrações).

---

## 4) Como gerenciar agenda e imagens (aba “Agenda do Astrônomo”)

### 4.1 Consultar agenda do profissional

1. Selecione um astrônomo em **Selecione um astrônomo**.
2. Ajuste **Data início** e **Data fim** (quando necessário).
3. Use o filtro de **tipo** (Visita/Pré/Reserva/Não marcar) e a busca livre.
4. Clique em **Atualizar** (ou **Filtrar**) para carregar.

### 4.2 Abrir detalhes do evento

- Clique no card do evento para abrir o modal de detalhes.
- O modal lista campos operacionais e a área de **Imagens do Evento**.

### 4.3 Inserir e remover imagens nos eventos

No modal de evento:

- Para **adicionar imagens**:
  1) Selecione arquivos (imagens).
  2) Clique em **Enviar Imagens** para vincular ao evento via `add_img`.
- Para **visualizar**:
  - Use miniaturas e o carrossel para ampliar.
- Para **remover**:
  - Use exclusão no carrossel (**Excluir imagem**) ou ações de exclusão em lote (quando disponível).

Boas práticas:
- Envie imagens com foco em evidência/execução (sem dados sensíveis desnecessários).
- Evite duplicar imagens em eventos errados: confirme o **ID do evento** antes de enviar.

---

## 5) Como gerenciar usuários admin (aba “Admins”)

### 5.1 Carregar e buscar

- Clique em **Atualizar** para buscar a lista (`action=get_admin`).
- Use **Buscar admins por e-mail...** para filtrar.

### 5.2 Ver senha (com cuidado)

- O painel exibe **e-mail**, **ID** e **senha**.
- A senha aparece **mascarada** por padrão; use **Mostrar/Ocultar** quando necessário.

### 5.3 Adicionar / editar / excluir admin

O payload administrativo envia **apenas**:
- `id` (quando aplicável)
- `email`
- `senha`

Ações:
- **Adicionar admin** → `action=add_admin` (envia `email` e `senha`)
- **Editar admin** → `action=edit_admin` (envia `id`, `email`, `senha`)
- **Excluir admin** → `action=delete_admin` (envia `id`, `email`, `senha`)

Recomendação:
- Use o **ID** exibido no card para editar/excluir (evita ambiguidades).

---

## 6) Relatórios, auditoria e análise (Debug)

As telas de debug comparam duas fontes:

- **Original / Debug**: base “de origem” (ex.: tabela original / visão de debug).
- **Enriquecida**: base “normalizada/enriquecida” que alimenta a agenda do app.

Ferramentas:
- `debug-rh.html`: auditoria com seleção de astrônomo.
- `debug-astronomo.html`: auditoria no contexto do usuário de campo.

### 6.1 Como interpretar divergências (guia rápido)

1) **Evento está na Original, mas não está na Enriquecida**
- Indica que o **fluxo de enriquecimento** não rodou, falhou ou está filtrando indevidamente.
- Ação: rodar/validar o fluxo de enriquecimento no n8n e revisar logs.

2) **Evento está na Enriquecida, mas não está na Original**
- Pode indicar que o evento foi **cancelado/apagado/mudou de tipo** na origem (ou houve atraso/recorte na consulta original).
- Ação: validar o evento na origem, conferir se houve mudança e então reprocessar/enriquecer para refletir a verdade operacional.

3) **Evento não aparece em nenhuma das duas**
- Forte sinal de problema na **tabela/base original** (upstream).
- Ação: registrar evidências (ID, período, profissional, prints do debug) e acionar o time responsável pela base de dados original (ex.: “ANALISOU”).

---

## 7) Boas práticas de governança (RH/Operação)

- **Princípio do menor acesso**: mantenha poucos admins e revise senhas periodicamente.
- **Evite compartilhar credenciais**: crie usuários admin individuais quando possível.
- **Audite antes de agir**: use Debug antes de concluir que “o app está errado”.
- **Registre evidências**: sempre guarde ID do evento, período, astrônomo e prints ao abrir chamados.

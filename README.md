# Agenda Inteligente Astronauta Demo

## Visao geral do negocio
Este sistema organiza a operacao de astrônomos em campo: agenda de tarefas, deslocamentos, despesas, historico e qualidade (feedback).  
A proposta de negocio e reduzir retrabalho, melhorar previsibilidade operacional e dar visibilidade financeira para Operacoes, RH e Financeiro.

## Fluxo de negocio ponta a ponta
1. O usuario faz login como astrônomo.
2. A agenda diaria e carregada com eventos/tarefas.
3. O sistema identifica deslocamentos e blocos de rota continua.
4. As despesas sao estimadas e depois registradas como reais.
5. O historico consolida o que foi concluido e o que ficou pendente.
6. Os feedbacks mostram percepcao de qualidade por evento.
7. O painel RH gerencia cadastro de astrônomos, agenda e imagens dos eventos.

## Regra central de dados (muito importante)
1. A unidade operacional agora e a tarefa do dia.
2. Se um evento dura 10 dias, o esperado e vir 10 tarefas (uma por data consecutiva).
3. Por isso, despesas nao devem multiplicar valores pelo numero de diarias do evento.
4. O correto e somar tarefa por tarefa.
5. Alimentacao deve existir em todos os dias/tarefas de visita.
6. Hospedagem so entra quando existe bloco consecutivo de varios dias fora da cidade base (regra de pernoite).

## Regra financeira de despesas
1. `alimentacao`: aplicada em toda tarefa de visita.
2. `monitor`: aplicado em toda tarefa de visita (presenca diaria, como alimentacao).
3. `hospedagem`: aplicada apenas para tarefas elegiveis em bloco consecutivo (normalmente a partir do 2o dia, modo pernoite).
4. `combustivel`: calcula ida e volta quando nao e rota continua; em rota continua usa distancia de perna entre eventos.
5. `pedagios`: entram por trecho/tarefa conforme cadastro e lancamento real.
6. Lucro do astrônomo e mostrado com percentual da sessao.
7. Lucro estimado/real considera faturamento de eventos finalizados.

## De onde a pagina de despesas obtem dados
Na pratica, `despesas.html` usa duas chamadas de negocio:
1. `action=historico` para carregar todos os eventos (atuais e antigos).
2. `action=lancar_despesas` para gravar despesas reais do evento.

Observacao:
1. A separacao de eventos finalizados para calculos reais e feita na propria pagina, filtrando os dados retornados por `historico`.
2. A lista de eventos em despesas considera o payload operacional completo retornado por `historico`.
3. A divisao operacional da lista e feita em 2 visoes: `Pendentes` (nao finalizados) e `Lancadas` (finalizados).
4. A visao padrao e `Pendentes`, para priorizar o que ainda precisa de lancamento/finalizacao.
5. Cada card de evento mostra status de finalizacao e status de despesas (mesma percepcao de historico).
6. Os cards-resumo (combustivel, hospedagem, alimentacao etc.) sao clicaveis e abrem popup de detalhamento por categoria.

## Integracoes e actions de negocio
### Endpoint de agenda (`/webhook/agenda-astronomos`)
1. `atualizar_agenda`: retorna agenda operacional.
2. `finalizados`: retorna eventos finalizados.
3. `lancar_despesas`: grava despesas reais do evento.
4. `historico`: retorna base para tela de historico.
5. `get_feedback`: retorna base para tela de feedbacks.
6. `delete_evento`: remove evento.
7. `debug`: usado nas telas de comparacao de dados.

### Endpoint de astrônomos (`/webhook/novo-astronomo-1`)
1. `list`: lista astrônomos.
2. `login`: autenticacao no login alternativo.
3. `add`, `edit`, `delete`: CRUD de astrônomos no painel RH.
4. `import_csv`: importacao em lote de cadastro.
5. `get_img`, `add_img`, `delete_img`: gestao de imagens de evento.

### Endpoint de sugestoes do app
1. `feedback_app`: recebe sugestoes e anexos enviados pela tela `feedback.html`.

## Campos de negocio padronizados (com aliases)
As paginas normalizam nomes diferentes de payload para um mesmo significado de negocio.

| Campo canônico | Aliases comuns usados no projeto |
| --- | --- |
| `id` | `id_evento`, `id_evento_unico`, `id_agendamento`, `uuid`, `evento_id` |
| `data_agendamento` | `data_e_hora_agendamento`, `data_e_hora_do_agendamento`, `data`, `date` |
| `nome_da_escola` | `nome_escola`, `escola`, `nome_lead` |
| `cidade` | `cidade_destino`, `cidade_evento`, `cidade_lead`, `cidade_da_escola` |
| `local_instalacao` | `endereco` |
| `responsavel_pelo_evento` | `responsavel`, `responsavel_visita`, `contato_responsavel`, `nome_responsavel` |
| `telefone_contato` | `telefone_responsavel_evento`, `telefone_responsavel`, `whatsapp_responsavel`, `telefone_evento`, `telefone_escola` |
| `numero_alunos` | `faixa_de_alunos`, `numero_de_alunos`, `numero_alunos_empresa` |
| `tipo_da_tarefa` | `tipo`, `tipo_evento` |
| `id_tipo_tarefa` | `id_tipo`, `id_tipo_evento`, `id_tipo_da_tarefa`, `tipo_tarefa_id`, `tipo_id` |
| `valor_total` | `total`, `valor`, `custo_total` |
| `conteudo_da_apresentacao` | `conteudo_apresentacao`, `conteudo`, `apresentacao` |

## Pagina por pagina (logica de negocio)

### `login.html` (login padrao)
Objetivo:
1. Carregar lista de astrônomos.
2. Permitir selecao de usuario.
3. Validar senha e abrir sessao.

Funcoes de negocio principais:
1. `fetchAstronomersData`: busca cadastro de astrônomos no endpoint.
2. `populateAstronomerSelect`: organiza opcoes para escolha.
3. `handleAstronomerSelect`: preenche resumo do profissional.
4. `authenticateUser`: valida senha informada.
5. `loginSuccess`: salva sessao unificada usada pelas outras paginas.
6. `extractProfitRate`: prepara percentual de lucro para telas financeiras.

### `login-n8n.html` (login alternativo)
Objetivo:
1. Autenticar diretamente via webhook com `action=login`.
2. Normalizar resposta de formatos diferentes.
3. Salvar sessao no mesmo padrao do login principal.

Funcoes de negocio principais:
1. `callAuthWebhook`: envia usuario/senha para autenticacao.
2. `normalizeResponse`: adapta formatos de retorno.
3. `parseLoginAllowed`: decide se acesso foi autorizado.
4. `saveSession`: grava sessao e dados minimos para operacao.
5. `handleSubmit`: orquestra fluxo completo de autenticacao.

### `index.html` (agenda operacional)
Objetivo:
1. Mostrar agenda do astrônomo em calendario e lista.
2. Centralizar acao operacional do dia.
3. Encaminhar para despesas/finalizacao/delecao.
4. Preparar base para rotas.

Funcoes de negocio principais:
1. `carregarAgenda`: chama `atualizar_agenda`, normaliza eventos e atualiza tela.
2. `normalizeEvent`: padroniza dados de evento para uso em toda a interface.
3. `renderCalendar`, `renderEventsList`, `renderDayEventsDetails`: exibem agenda por mes/lista/dia.
4. `openEventModal`: mostra detalhes do evento e acoes de negocio.
5. `lancarDespesas`: navegacao contextual para `despesas.html`.
6. `finalizarEvento`: exige fluxo de despesas antes da finalizacao.
7. `deletarEvento`: chama `delete_evento`.
8. `applyRotaContinuaBlocks`: marca blocos de eventos consecutivos de longa distancia.
9. `computeContinuousRoutes`: calcula rotas continuas com OSRM.
10. `applyContinuousRouteMetrics`: aplica metricas de distancia por perna.
11. `fetchWeather`, `renderWeatherForSelection`: apoio operacional com clima por local.
12. `saveAgendaCache`, `syncRotasCache`: compartilha base com outras paginas.

Regra importante nesta pagina:
1. A deduplicacao geral esta desativada para manter o payload completo.
2. O fluxo operacional assume que cada tarefa representa um dia real.

### `rotas.html` (planejamento de deslocamento)
Objetivo:
1. Montar rotas a partir da agenda.
2. Agrupar eventos consecutivos em blocos.
3. Estimar custo de deslocamento e permanencia.

Funcoes de negocio principais:
1. `carregarRotas`: busca agenda (webhook/cache) e gera rotas.
2. `construirRotaDaAgenda`: transforma eventos em blocos de rota.
3. `isConsecutiveEventDay`: valida continuidade diaria.
4. `calcularDistanciasRota` e `calcularDistanciasComBase`: distancia entre eventos e base.
5. `calcularGastosEstimados`: estima combustivel, alimentacao, hospedagem e pedagios.
6. `showGastoBreakdown`: explica calculo para usuario.
7. `registrarOverridesRotaContinua`: salva ajustes de distancia para uso cruzado.

### `despesas.html` (financeiro operacional)
Objetivo:
1. Consolidar despesas estimadas e reais.
2. Permitir lancamento de despesas reais por evento.
3. Exibir impacto de lucro do astrônomo.

Funcoes de negocio principais:
1. `fetchEvents`: busca historico completo (`historico`) e filtra finalizados localmente para os indicadores reais.
2. `extractExpenseEstimates`: calcula despesas estimadas por tarefa.
3. `extractRealExpenses`: consolida despesas reais registradas com deteccao estrita de campos reais.
4. `buildLodgingEligibility`: aplica regra de elegibilidade de hospedagem.
5. `isLodgingEligibleEvent`: identifica se a tarefa deve receber hospedagem.
6. `getFilteredEventsByExpenseView` e `getEventsForCurrentView`: separam o payload em `Pendentes` e `Lancadas` por status operacional.
7. `getEventHistoryContext`: monta status operacional por tarefa (finalizado x nao finalizado) e contexto de despesas.
8. `hasRealExpenseMarker`: evita classificar estimativa como despesa lancada quando nao ha marcador real.
9. `openSummaryDetailsModal`: abre popup ao clicar nos cards-resumo com detalhamento por categoria e por evento.
10. `bindSummaryDetailTriggers`: conecta cada card-resumo ao popup correspondente.
11. `updateSummaryCards`: soma custos e lucro da visao ativa.
12. `openExpensesModal`: abre formulario com pre-preenchimento.
13. `submitExpensesForm`: envia `lancar_despesas` com payload padronizado.
14. `getEventStableId`/`hasStableEventId`: padronizam identificacao do evento (incluindo aliases como `id_tarefa`) para selecao/lista e abertura do formulario.

Regra de negocio aplicada:
1. Sem multiplicacao artificial por numero de diarias.
2. Soma tarefa por tarefa.
3. Alimentacao em todos os dias.
4. Monitor em todos os dias/tarefas (com fallback para zero quando nao informado).
5. Hospedagem apenas para blocos consecutivos elegiveis (pernoite).
6. Lista operacional de despesas usa todo o payload de `historico` para nao perder eventos pendentes.
7. Divisao operacional: `Pendentes` mostra nao finalizados; `Lancadas` mostra finalizados.
8. Divisao por aba de resumo: em `Estimados` aparecem apenas valores estimados; em `Reais` aparecem apenas despesas realmente lancadas.
9. Clique nos cards-resumo abre popup com detalhamento por categoria (itens e total da visao ativa), respeitando a aba ativa.
10. Card de evento fica focado em status + botao de lancar/editar despesas.
11. O botao de acao do card diferencia visualmente o estado de despesa lancada (`btn-success`) para manter legibilidade e evitar aparencia de desabilitado.
12. Classificacao `Pendente` x `Lancada` e feita pelo status de finalizacao do evento (detecao robusta de campos de status/finalizacao do payload).

### `historico.html` (memoria operacional)
Objetivo:
1. Consolidar eventos finalizados e nao finalizados.
2. Permitir analise por cidade, periodo e busca.
3. Facilitar reabertura do fluxo de despesas.

Funcoes de negocio principais:
1. `fetchDataFromN8N`: carrega historico via `action=historico`.
2. `applyEventsData`: normaliza e filtra por sessao logada.
3. `applyFilters`: aplica filtros de cidade, periodo e busca.
4. `openEventModal`: detalha evento e oferece lancamento de despesas.
5. `exportToCSV`: exporta visao filtrada.
6. `updateStats`: KPIs de volume, finalizacao e valor.

### `feedbacks.html` (qualidade e satisfacao)
Objetivo:
1. Mostrar feedbacks operacionais vinculados a eventos.
2. Organizar sentimento (positivo, neutro, negativo).
3. Dar visao de taxa de feedback.

Funcoes de negocio principais:
1. `fetchDataFromN8N`: carrega feedbacks via `action=get_feedback`.
2. `extractFeedbackText`: extrai texto relevante em varios formatos.
3. `extractNotaNpm` e `extractNpmField`: captura nota e campo NPM/NPS.
4. `analyzeSentiment`: classifica sentimento com regra simples.
5. `hasFeedbackFromEvent`: define elegibilidade de evento para analise.
6. `applyFilters`, `renderFeedbacks`, `updateStats`: exibe e mede indicadores.

### `rh-astronomos.html` (painel administrativo RH/operacao)
Objetivo:
1. Gerenciar cadastro de astrônomos.
2. Gerenciar agenda por profissional.
3. Fazer operacao de imagens de eventos.
4. Apoiar acao financeira por evento.

Funcoes de negocio principais no cadastro:
1. `carregarAstronomos`: lista base de astrônomos.
2. `salvarAstronomo`: cria/edita cadastro (`add` ou `edit`).
3. `deletarAstronomo`, `deletarTodosAstronomos`, `deletarTodosUmPorUm`: exclusoes.
4. `importCsvBinary`: importa cadastro via CSV.
5. `enrichRowWithCoordinates`: complementa coordenadas de origem.

Funcoes de negocio principais na agenda:
1. `carregarAgenda`: busca agenda do astrônomo selecionado (`atualizar_agenda`).
2. `normalizeAgendaEvent`: padroniza campos para exibicao.
3. `renderAgenda`: lista cards com filtros por tipo e busca.
4. `showEventDetails`: abre detalhe operacional completo.

Funcoes de negocio principais em imagens:
1. `obterLinksImagensEvento`: consulta imagens vinculadas.
2. `carregarImagensEvento`: atualiza galeria.
3. `enviarImagens`: envio unitario e em lote para varios eventos.
4. `deleteCurrentCarouselImage`: exclusao de imagem.
5. `assignSelectedImagesToBatchEvents`: replica imagens para tarefas relacionadas.

Funcoes de negocio principais em financeiro:
1. `lancarDespesasEvento`: dispara `lancar_despesas` por evento no contexto RH.

### `account.html` (minha conta)
Objetivo:
1. Dar transparencia dos dados da sessao do usuario.
2. Mostrar parametros operacionais e financeiros usados no sistema.
3. Permitir personalizacao visual por usuario.

Funcoes de negocio principais:
1. `readSession`: le sessao ativa.
2. `populate`: preenche dados de perfil.
3. `loadUserTheme`, `saveUserTheme`, `applyTheme`: personalizacao de tema.
4. `deriveThemeFromUsername`: sugestao de paleta por usuario.

### `feedback.html` (sugestoes do app)
Objetivo:
1. Coletar melhoria de processo/produto com contexto.
2. Permitir anexos (prints/documentos).
3. Enviar diretamente para webhook de feedback.

Funcoes de negocio principais:
1. `renderFiles`: mostra anexos selecionados.
2. Validacao de limite de arquivos e campos obrigatorios.
3. Montagem de payload com sessao, origem e metadata.
4. Envio via `action=feedback_app`.

### `debug-astronomo.html` (auditoria do usuario)
Objetivo:
1. Comparar dados "originais/debug" vs dados "enriquecidos".
2. Mostrar faltantes, divergencias e cobertura de campos.

Funcoes de negocio principais:
1. `runComparison`: executa comparacao (`debug` vs `atualizar_agenda`).
2. `buildLookup` e `findMatch`: pareamento de eventos.
3. `renderCompareList`: visual de diferencas.
4. `buildColumnCatalog`: filtro por colunas.

### `debug-rh.html` (auditoria administrativa)
Objetivo:
1. Mesmo conceito da tela de debug do astrônomo.
2. Com selecao de qualquer astrônomo do painel RH.

Funcoes de negocio principais:
1. `loadAstronomers`: carrega lista administrativa.
2. `runComparison`: compara fontes para o astrônomo selecionado.
3. `renderCompareList`: evidencia faltantes e divergencias.

### `debug.html`
Objetivo:
1. Apenas redirecionar para `debug-astronomo.html`.

### `apresentacao.html`
Objetivo:
1. Pagina institucional/comercial do produto.
2. Resume proposta de valor, indicadores e CTA comercial.

## Navegacao contextual e armazenamento local
Chaves de contexto usadas no fluxo de negocio:
1. `astronomo_session`: sessao principal usada em todas as paginas.
2. `userSession`: compatibilidade legado.
3. `astronomersData`: cache de cadastro.
4. `agenda_cache_v1::...`: cache de eventos por usuario.
5. `agenda_payload_v1::...`: payload bruto para rastreabilidade.
6. `rotas_cache_v1`: base compartilhada para tela de rotas.
7. `rotas_override_v1::...`: ajustes de distancia de rota continua.
8. `despesas_evento_selecionado`: navegacao contextual para abrir despesas no evento certo.
9. `index_ui_state_v1` e `rhAstronomosUI`: persistencia de estado de filtros.
10. `user_theme::...`: tema personalizado por usuario.

## Exemplo simples de jornada real
1. Astrônomo entra no `login.html`.
2. Abre `index.html`, revisa agenda e escolhe evento.
3. Vai para `despesas.html` pelo atalho contextual do evento.
4. Lanca despesas reais e finaliza.
5. Evento passa a refletir em lucro real e historico.
6. Gestao acompanha em `historico.html`, `feedbacks.html` e `rh-astronomos.html`.

## Decisoes operacionais atuais
1. A logica de negocio assume tarefas diarias consecutivas (nao lote unico por diarias).
2. Soma de despesas e feita por tarefa recebida.
3. `despesas.html` usa `historico` como fonte unica para eventos atuais e antigos.
4. A lista de despesas usa todo payload do `historico` e organiza em `Pendentes` (nao finalizados) e `Lancadas` (finalizados).
5. Cards-resumo financeiros respeitam aba ativa (`Estimados` vs `Reais`) e mostram popup coerente com a aba.
6. Cards de evento mostram status historico e usam botao para lancar/editar despesas.
7. Estado visual de `lancadas` no botao foi padronizado para evitar contraste ruim.
8. `Pendentes` e `Lancadas` usam status de finalizacao do evento, sem depender de campos de despesa real para classificar a aba.
9. PDF no historico ainda esta marcado como evolucao futura.
10. O sistema tolera variacoes de campos no payload por meio de aliases.
11. A abertura de lancamento de despesas usa ID estavel por aliases para evitar falha de clique quando o payload nao usa `id` como chave principal.

📘 Agenda Inteligente Urânia
Fluxo 1 – Agenda do Astrônomo
Documentação Técnica (Manutenção – Node por Node)
🎯 Objetivo geral do fluxo
Este fluxo centraliza todas as ações relacionadas à agenda do astrônomo em um único
endpoint (/agenda-astronomos), utilizando um Webhook + Switch por action.
Ele é responsável por:
● Atualizar a agenda do astrônomo no frontend
● Registrar despesas reais por evento
● Calcular médias reais de gastos
● Deletar eventos da agenda
● Finalizar eventos (marcar como concluídos)
Tudo isso é decidido dinamicamente pelo campo action, enviado via query string ou
body.
🌐 Node 1 — agenda astronomo (Webhook)
Tipo: Webhook
Métodos aceitos: GET e POST
Path: /agenda-astronomos
Response Mode: responseNode
📌 Função
É o ponto único de entrada do frontend para qualquer operação relacionada à agenda do
astrônomo.
📥 Entrada esperada
O frontend envia sempre:
● action → define o que será feito
● Outros parâmetros conforme a ação (ex: id_astronomo, despesas, id_evento etc.)
Exemplo real:
{
"action": "atualizar_agenda",
"id_astronomo": "18",
"usuario": "PROCOPIO"
}
📤 Saída
Nenhuma resposta direta aqui.
O retorno sempre acontece via nodes Respond to Webhook específicos de cada ação.
🔀 Node 2 — Switch
Tipo: Switch
Base de decisão:
{{ $json.query.action }}{{ $json.body.action }}
📌 Função
Decidir qual subfluxo será executado, com base no valor de action.
🔁 Ações suportadas
Action Descrição Saída do Switch
atualizar_agenda Atualiza agenda do astrônomo atualizar
agenda
lancar_despesas Salva despesas reais lançar
despesas
gerar_media_de_ga
stos
Calcula médias reais media de
gastos
delete_evento Deleta evento da agenda deletar evento
finalizar_evento Marca evento como finalizado finalizar
eventos
📌 Importante:
O Switch concatena query.action + body.action para funcionar tanto em GET quanto
POST sem duplicar lógica.
🔁 SUBFLUXOS
📅 Subfluxo — Atualizar Agenda
Node — obtem agenda
Tipo: Postgres (select)
Tabela: agenda_eventos
Filtro:
WHERE id_astronomo = {{ $json.query.id_astronomo }}
📌 Função
Busca todos os eventos da agenda vinculados ao astrônomo logado.
🔎 Observação
● Retorna todos os eventos
● O filtro por data (from / to) existe no fluxo (If1), mas está desativado
Node — If1 (DESATIVADO)
Tipo: If
Função prevista (não ativa):
● Filtrar eventos por intervalo de datas (from → to)
📌 Estado atual:
Desativado por decisão técnica (agenda retorna tudo).
Node — Respond to atualizar agenda
Tipo: Respond to Webhook
📤 Função
Retorna a lista completa de eventos da agenda para o frontend.
💸 Subfluxo — Lançar Despesas Reais
Node — lançar despesas
Tipo: Postgres (update)
Tabela: agenda_eventos
📌 Função
Atualiza os custos reais do evento preenchidos pelo astrônomo.
Campos atualizados
● hospedagem_real
● combustivel_real
● alimentacao_real
● monitor_real
● pedagios_real
● outros
● id_astronomo
📥 Origem dos dados:
$json.query.*
Node — Respond to lançar cdespesas reais
Tipo: Respond to Webhook
📤 Função
Confirma ao frontend que as despesas foram salvas com sucesso.
📊 Subfluxo — Gerar Média de Gastos
Node — extrair gastos reais
Tipo: Postgres (select)
Tabela: eventos_processados
📌 Função
Busca todos os eventos com despesas reais vinculados ao astrônomo.
Node — gera media de gastos (Code)
Tipo: Code
📌 Função (core financeiro do sistema)
Este node:
1. Converte todos os valores para número seguro
2. Calcula o custo total real por evento
3. Agrupa eventos por id_astronomo
4. Considera apenas:
○ Eventos finalizados OU
○ Eventos que já tenham custo real
5. Calcula médias reais de:
○ Hospedagem
○ Combustível
○ Alimentação
○ Monitor
○ Pedágios
○ Outros
○ Custo total
6. Retorna 1 item por astrônomo, contendo:
○ Médias
○ Eventos usados no cálculo
📌 Esse node é crítico: qualquer mudança aqui impacta custos, lucro e decisões do RH.
Node — salvar media de gastos
Tipo: Postgres (executeQuery)
Tabela: astronomos
📌 Função
Atualiza o cadastro do astrônomo com as médias reais, substituindo estimativas antigas.
Campos atualizados:
● gasto_combustivel_media
● diaria_hospedagem_media
● alimentacao_diaria_media
● monitor_media
● pedagios_media
● outros_media
● custo_total_medio
Node — Respond to medias
Tipo: Respond to Webhook
📤 Função
Retorna as médias calculadas para o frontend (ou confirmação).
🗑️ Subfluxo — Deletar Evento
Node — deletar evento
Tipo: Postgres (executeQuery)
📌 Função
Remove temporariamente um evento da tabela eventos_processados.
Critérios de segurança
O DELETE só acontece se todos os campos baterem:
● id_evento
● astronomo
● nome_da_escola
● data_e_hora_do_agendamento
📌 Isso evita exclusões erradas.
Node — Respond to lançar cdespesas reais1
Tipo: Respond to Webhook
📤 Função
Confirma a exclusão do evento.
✅ Subfluxo — Finalizar Evento
Node — finalizar evento
Tipo: Postgres (update)
Tabela: agenda_eventos
📌 Função
Marca o evento como finalizado:
finalizado = true
Impacto sistêmico
● Evento passa a contar nos cálculos de média
● Evento é tratado como concluído em relatórios futuros
Node — Respond to Webhook2
Tipo: Respond to Webhook
📤 Função
Confirma ao frontend que o evento foi finalizado.
⚠️ Observações Importantes de Manutenção
● Nunca remover o Switch → ele é o roteador central
● Não misturar médias estimadas com reais
● gera media de gastos é o node mais sensível do fluxo
● O frontend depende 100% das responses explícitas
● O Webhook aceita GET e POST por decisão de compatibilidade com frontend
🧠 Visão Arquitetural
Este fluxo funciona como um mini backend REST unificado, onde:
● 1 endpoint
● N ações
● Switch como controlador
● Postgres como fonte única da verdade
● Code node como motor financeiro
Fluxo 2 – Alimentador da Agenda (Sincronização
Diária)
Documentação Técnica – Fluxo de Criação e Atualização de Eventos
🎯 Objetivo geral do fluxo
Este fluxo é o alimentador central da agenda.
Ele roda automaticamente 1x por dia e garante que:
● A agenda esteja sempre sincronizada com a Kommo
● Eventos antigos ou dados obsoletos sejam limpos
● Todos os astrônomos tenham seus eventos recriadas corretamente
● Cada tipo de tarefa seja tratado de forma independente
● O processamento seja isolado por astrônomo (fail-safe)
📌 Importante:
Este fluxo não cria eventos diretamente.
Ele prepara, identifica e delega o trabalho ao subfluxo worker, que é quem realmente
insere/atualiza a agenda.
🧭 Visão Arquitetural de Alto Nível
Schedule (1x/dia)
↓
Limpeza da agenda
↓
Carregar astrônomos
↓
Validar IDs de tarefas
↓
Loop por astrônomo
↓
├─ Pré
├─ Visita
├─ Reserva
└─ Não marcar
↓
Subfluxo Worker
↓
Merge (barreira)
↓
Próximo astrônomo
⏰ ETAPA 1 — Disparo automático
Node — Schedule Trigger
Tipo: Schedule Trigger
Frequência: 1x por dia
📌 Função
Inicia o processo completo de sincronização da agenda.
📎 Observação:
● Horário fixo
● Execução idempotente (pode rodar mais de uma vez sem quebrar estado)
🧹 ETAPA 2 — Limpeza dos eventos
antigos
Node — Execute a SQL query
Tipo: Postgres (executeQuery)
Tabela: agenda_eventos
📌 Função
Limpa dados operacionais voláteis da agenda, preservando apenas:
● Despesas reais (*_real)
● Flag de finalização (finalizado)
🧠 Estratégia adotada
● Não deleta registros
● Apenas zera campos que serão recalculados diariamente
● Mantém histórico financeiro intacto
📌 Isso evita:
● Acúmulo de dados inconsistentes
● Divergência entre Kommo e agenda interna
🧑‍🚀 ETAPA 3 — Obter dados fixos dos
astrônomos
Node — dados fixos astronomos
Tipo: Postgres (select)
Tabela: astronautas_login
📌 Função
Carrega:
● Identidade do astrônomo
● Dados logísticos
● IDs de tipos de tarefa:
○ id_pre
○ id_visita
○ id_reserva
○ id_n_marcar
Esses IDs são pré-requisitos absolutos para o restante do fluxo.
Node — If
📌 Função
Valida se o astrônomo possui IDs de tarefa válidos.
Critério:
● id_visita não vazio
● id_visita >= 1
📌 Decisão de design:
● Se não passar → astrônomo é ignorado
● Evita chamadas inválidas à Kommo
● Evita poluir agenda com dados incompletos
🔁 ETAPA 4 — Loop por astrônomo
Node — Loop Over Items
Tipo: Split In Batches
📌 Função
Processa um astrônomo por vez, garantindo:
● Isolamento de falhas
● Controle de concorrência
● Escalabilidade futura (centenas de astrônomos)
📌 Cada iteração representa um astrônomo completo.
🧩 ETAPA 5 — Subcaminhos por tipo de
tarefa
Cada astrônomo possui 4 tipos de tarefa, e cada tipo segue um subcaminho próprio.
🔹 Subcaminho — PRÉ
Node — pre
● Consulta a tabela integration.cubo_kommo_tarefas
● Filtra pelo id_pre do astrônomo
Node — Edit Fields3
📌 Funções críticas:
● Normaliza payload
● Injeta identificadores:
○ TIPO = PRE
○ id_astronomo
○ Dados fixos do astrônomo
● Prepara payload para o worker
Node — Execute Workflow
Chama o subfluxo worker, responsável por:
● Interpretar o tipo
● Criar / atualizar eventos
● Garantir idempotência
🔹 Subcaminho — VISITA
Node — visita
Consulta tarefas da Kommo via id_visita.
Node — Edit Fields1
📌 Destaques:
● TIPO = VISITA
● Payload enriquecido com:
○ Astrônomo
○ Custos estimados
○ Dados de origem (rota, cidade base)
Node — Execute Workflow1
Delegação para o worker.
🔹 Subcaminho — RESERVA
Node — reserva
Consulta tarefas via id_reserva.
Node — Edit Fields
📌 Marca explicitamente:
● TIPO = RESERVA
Node — Execute Workflow2
Delegação para o worker.
🔹 Subcaminho — NÃO MARCAR
Node — não marcar
Consulta tarefas via id_n_marcar.
Node — Edit Fields2
📌 Marca:
● TIPO = Ñ MARCAR
⚠️ Esse tipo existe para excluir eventos do planejamento, mas ainda assim precisa ser
processado para manter coerência.
Node — Execute Workflow3
Delegação para o worker.
🔗 ETAPA 6 — Barreira de sincronização
Node — Merge
Tipo: Merge (4 inputs)
📌 Função
Este node não transforma dados.
Ele atua como uma barreira de sincronização:
● Só libera o fluxo quando:
○ PRÉ terminou
○ VISITA terminou
○ RESERVA terminou
○ NÃO MARCAR terminou
📌 Sem isso:
● O loop poderia avançar antes de concluir um tipo
● Eventos ficariam incompletos ou duplicados
🔁 Retorno ao Loop
Após o Merge:
● O fluxo retorna ao Loop Over Items
● O próximo astrônomo é processado
● O ciclo se repete até finalizar todos
⚠️ Pontos Críticos de Manutenção
● Nunca remover o Merge → ele garante consistência
● IDs de tarefa são chaves sistêmicas, não podem ser nulos
● O fluxo não cria lógica de negócio, apenas orquestra
● O worker é quem decide:
○ Insert
○ Update
○ Ignore
● Qualquer mudança em Edit Fields impacta toda a agenda
🧠 Filosofia do Fluxo
Este fluxo funciona como um scheduler-orquestrador:
● Stateless
● Determinístico
● Reexecutável
● Seguro contra falhas parciais
Ele garante que a agenda sempre reflita a realidade da Kommo, sem depender de ações
manuais.
Fluxo 3 — Worker (Processador de Eventos)
🎯 Objetivo do fluxo
O Fluxo 3 (Worker) é o executor real da Agenda Inteligente.
Ele é responsável por:
● Receber eventos já classificados (PRÉ, VISITA, RESERVA, NÃO MARCAR)
● Decidir se o evento será enriquecido ou não
● Calcular rotas, distâncias e duração
● Lidar com cidades inválidas ou mal formatadas
● Garantir fallbacks automáticos
● Persistir o evento no PostgreSQL sem interromper o loop
📌 Regra de ouro:
Nenhum evento pode quebrar o processamento dos demais.
🧭 Visão Arquitetural
Trigger (Execute Workflow)
↓
Switch por TIPO
↓
IF data >= hoje (VISITA)
↓
Loop por evento
↓
Wait (rate limit)
↓
Normalização de cidade
↓
Geocoding destino (OSM)
↓ sucesso ───────────────┐
↓ falha │
GPT normaliza cidade │
↓ │
Geocoding novamente │
↓ │
Junta origem + destino │
↓ │
Calcula rota (OSRM) │
↓ │
Extrai distância/duração │
↓ │
Organiza payload final │
↓ │
UPSERT Postgres ◄───────────┘
↓
Próximo evento
▶️ ETAPA 1 — Entrada do Worker
Node — When Executed by Another Workflow
Tipo: Execute Workflow Trigger
📌 Função
● Permite que este fluxo seja chamado exclusivamente pelo Fluxo 2 (Orquestrador).
● Recebe eventos já classificados, enriquecidos com:
○ TIPO
○ Dados do astrônomo
○ Dados da tarefa (Kommo)
📎 Design:
● O worker não consulta a Kommo
● Ele apenas processa o que recebe
🔀 ETAPA 2 — Switch por tipo de tarefa
Node — Switch
📌 Função
Define o comportamento do fluxo com base no campo TIPO.
Tipos tratados:
● VISITA
● PRE
● RESERVA
● Ñ MARCAR
🧠 Decisão arquitetural
● Somente VISITA é enriquecido com rota
● Outros tipos pulam enriquecimento e seguem direto para persistência
Isso reduz:
● Uso de API
● Tempo de execução
● Risco de timeout
📅 ETAPA 3 — Filtro temporal (somente
VISITA)
Node — If (data >= hoje)
📌 Função
Verifica se o evento de VISITA ocorre a partir da data atual.
● ✅ Se futuro ou hoje → continua enriquecimento
● ❌ Se passado → salva direto no banco
📌 Motivo:
● Eventos antigos não precisam de rota
● Evita sobrecarga com histórico grande
● Mantém o sistema rápido mesmo com anos de dados
🔁 ETAPA 4 — Loop por evento
Node — Loop / Split
📌 Função
Processa um evento por vez, garantindo:
● Isolamento de falhas
● Ordem
● Controle de chamadas externas
📎 Regra:
Se um evento falhar, o próximo continua.
⏳ ETAPA 5 — Controle de taxa
Node — Wait
📌 Função
Adiciona um pequeno delay entre eventos.
🧠 Protege contra:
● Rate limit do OpenStreetMap
● Rate limit do OSRM
● Sobrecarga do próprio n8n
🧹 ETAPA 6 — Normalização de cidade
Node — Code (normalize cidade)
📌 Função
Normaliza strings de cidade e UF:
● Remove acentos
● Remove caracteres especiais
● Padroniza entrada
Exemplo:
"São João d’Oeste" → "Sao Joao d Oeste"
📌 Isso aumenta drasticamente o sucesso no geocoding.
🌍 ETAPA 7 — Geocoding destino
(OpenStreetMap)
Node — HTTP Request (Nominatim)
📌 Função
Obtém:
● lat
● lon
da cidade de destino.
📌 Características:
● API gratuita
● Sem custo
● Header User-Agent obrigatório (boa prática)
Node — If (lat/lon existem)
📌 Função
Decide:
● ✅ Se coordenadas existem → fluxo principal
● ❌ Se não existem → fluxo alternativo (GPT)
🤖 ETAPA 8 — Fallback inteligente com
GPT
Node — gpt
📌 Função
Quando o OSM falha:
● Envia o nome da cidade ao GPT
● Solicita apenas cidade + UF normalizados
● Retorna string pronta para nova consulta
📌 Uso estratégico:
● Só entra quando realmente necessário
● Evita chamadas desnecessárias
● Corrige erros humanos de digitação
Node — HTTP Request (Nominatim – retry)
● Reexecuta o geocoding usando a resposta do GPT
● Se funcionar → volta ao fluxo principal
● Se falhar → ainda assim o evento será salvo
📌 Nenhum evento é descartado.
🧭 ETAPA 9 — Consolidação de
coordenadas
Node — Set (origem + destino)
📌 Função
Agrupa:
● Coordenadas da cidade base do astrônomo
● Coordenadas da cidade destino
Esses dados alimentam o cálculo de rota.
🚗 ETAPA 10 — Cálculo de rota
Node — HTTP Request (OSRM)
📌 Função
Calcula rota entre:
origem_lon, origem_lat → destino_lon, destino_lat
Retorna:
● Geometria
● Distância
● Duração
📌 API:
● Gratuita
● Open-source
● Alta confiabilidade
📐 ETAPA 11 — Extração de métricas
Node — Code (extrair rota)
📌 Função
Extrai apenas:
● distancia_km
● duracao_horas
Ignora todo o resto do payload.
📌 Isso mantém:
● Banco limpo
● Payload leve
● Fácil manutenção
🔄 ETAPA 12 — Rota contínua (opcional)
Node — Code (rota contínua)
📌 Função
Se habilitado:
● Atualiza a cidade atual como nova base
● Permite cálculo encadeado de eventos
📌 Usado para:
● Astrônomos em viagem contínua
● Turnês
● Sequência de cidades
📦 ETAPA 13 — Organização final do
payload
Node — Edit Fields (final)
📌 Função
Reagrupa TODOS os dados:
● Dados originais da Kommo
● Dados do astrônomo
● Coordenadas
● Distância
● Duração
● Flags de controle
● TIPO
Esse é o payload exatamente compatível com a tabela agenda_eventos.
💾 ETAPA 14 — Persistência
Node — Postgres (UPSERT agenda_eventos)
📌 Função
● Insere ou atualiza evento
● Usa id como chave
● Nunca duplica registros
● Mantém eventos sempre sincronizados
📌 Se algo falhar antes:
● Evento ainda é salvo
● Apenas campos enriquecidos ficam vazios
🧠 Filosofia do Worker
Este fluxo foi projetado para ser:
● Fail-safe
● Idempotente
● Escalável
● Barato (APIs gratuitas)
● Auto-corretivo
● Resiliente a dados ruins
📌 Ele não confia em:
● Texto humano
● APIs externas
● Datas antigas
● Respostas perfeitas
Ele sempre tenta, mas nunca trava.
Perfeito. Esse último fluxo fecha o ciclo da Agenda Inteligente e, mesmo estando
incompleto, já dá para documentar ele corretamente como Fluxo 4 – Analisador de Rotas
Contínuas, deixando explícito o que está pronto, o que foi descontinuado e o que deve
ser refeito.
Isso é ouro para manutenção futura (inclusive para você mesmo daqui a 6 meses).
Fluxo 4 — Identificação de Rotas Contínuas
(Manutenção)
🎯 Objetivo original do fluxo
Este fluxo foi criado para:
● Analisar eventos do tipo VISITA já salvos
● Identificar rotas contínuas
● Agrupar eventos consecutivos por astrônomo
● Calcular:
○ Data de início
○ Data de término
○ Distância total
○ Cidades envolvidas
● Gerar identificadores de rota
● Persistir essas rotas no banco
⚠️ Situação atual
O fluxo está parcialmente implementado, pois a regra de negócio mudou após a
implementação inicial.
🧭 Visão geral do fluxo atual
Schedule Trigger
↓
Select VISITA no Postgres
↓
IF data >= hoje
↓
Loop por evento
↓
Code (CANDIDATOS – lógica de rotas)
↓
(retorno para loop)
↓
Respond / Persistência futura
▶️ ETAPA 1 — Disparo do fluxo
Node — Schedule Trigger
Tipo: scheduleTrigger
📌 Função
● Executa o fluxo de forma agendada
● Serve para:
○ Reprocessar eventos
○ Recalcular rotas
○ Ajustar lógica sem reprocessar tudo manualmente
📌 Arquitetura correta:
● Esse fluxo não depende de webhook
● Ele é batch / análise, não realtime
🗃️ ETAPA 2 — Seleção de eventos
Node — Select rows from a table
Tabela: agenda_eventos
📌 Filtro aplicado
WHERE tipo_da_tarefa = 'VISITA'
📌 Função
● Carrega todos os eventos de visita
● Base para análise de rotas
📌 Observação:
● Aqui já pressupõe que os eventos:
○ Estão enriquecidos
○ Já passaram pelo Worker
○ Já possuem datas, cidade, distância, etc.
📅 ETAPA 3 — Filtro temporal
Node — If
📌 Função
Verifica:
data_e_hora_do_agendamento >= hoje
🧠 Motivo
● Eventos antigos:
○ Não precisam entrar em rota contínua
○ Não alteram logística atual
● Mantém o processamento leve
⚠️ Nota de manutenção
Esse IF pode ser:
● Mantido
● Ou removido futuramente se quiser recalcular histórico
🔁 ETAPA 4 — Loop por evento
Node — Loop Over Items
📌 Função
● Processa eventos individualmente
● Evita carga excessiva
● Permite lógica acumulativa no Code
📌 Fluxo:
● Cada item entra
● É analisado
● Retorna ao loop
🧠 ETAPA 5 — Lógica de rotas (node
crítico)
Node — CANDIDATOS (Code)
📌 Papel deste node
Este é o cérebro do fluxo.
Ele:
● Agrupa eventos por astrônomo
● Ordena por data
● Analisa sequências
● Cria rotas contínuas
● Gera payloads prontos para salvar
🧩 Lógica implementada (estado atual)
Regras que EXISTEM no código atual:
● Eventos ordenados por data_e_hora_do_agendamento
● Uso de numero_de_diarias
● Verificação de datas consecutivas
● Criação de múltiplas rotas por astrônomo
● Cálculo de:
○ distância total
○ data fim
○ cidades da rota
Regra antiga (hoje OBSOLETA):
distancia_km > 250
Essa regra:
● Definia se um evento poderia iniciar rota
● Foi removida por decisão de negócio
⚠️ Importante
O código já foi parcialmente ajustado para permitir:
“qualquer evento pode iniciar rota”
Mas a regra de consecutividade ainda precisa ser simplificada.
🔄 NOVA REGRA DEFINITIVA (decisão
atual)
Se houver evento consecutivo, é rota contínua.
Independente de:
● quilômetros
● distância
● cidade
● custo
Nova definição formal:
● Dois ou mais eventos do mesmo astrônomo
● Datas consecutivas (considerando diárias)
● ⇒ pertencem à mesma rota contínua
📐 Regra correta de consecutividade
Um evento B é consecutivo ao evento A se:
data_inicio_B == data_fim_A + 1 dia
Onde:
data_fim_A = data_inicio_A + (numero_de_diarias - 1)
🧠 Como o Code node deve ficar
(conceito)
Lógica correta (em alto nível):
1. Agrupa eventos por astrônomo
2. Ordena por data
3. Inicia rota com o primeiro evento
4. Para cada próximo evento:
○ Se consecutivo → adiciona à rota atual
○ Se não → encerra rota e inicia nova
5. Salva todas as rotas encontradas
📌 Sem:
● Condição de km
● Condição de distância mínima
● Condição de “evento inicial especial”
💾 Persistência (ainda NÃO
implementada)
O que falta neste fluxo
Este fluxo ainda não salva no Postgres, mas deveria:
Opções de arquitetura:
1. Tabela separada
○ rotas_continuas
2. Campos extras em agenda_eventos
○ rota_id
○ rota_inicio
○ rota_fim
○ rota_index
📌 Recomendação:
👉 Tabela separada
Mais limpa, mais escalável, mais fácil de refatorar.
Perfeito — agora sim deu para fechar o quebra-cabeça inteiro do Painel RH 👍
Vou te devolver a documentação técnica + leitura arquitetural, no mesmo nível
profissional dos outros fluxo
🧑‍💼 Fluxo 4 — Painel RH (Gestão
Operacional de Astrônomos & Eventos)
🎯 Objetivo do fluxo
Este fluxo é o centro administrativo do RH da Urânia, responsável por:
● Gerenciar astrônomos (CRUD completo)
● Importar múltiplos astrônomos via CSV
● Gerenciar imagens de eventos
● Sincronizar Postgres + Google Drive + Google Sheets
● Servir dados diretamente ao painel web
● Garantir consistência visual e operacional para o astrônomo em campo
É o fluxo mais complexo do sistema porque:
● mistura dados estruturados, arquivos binários, APIs externas
● precisa ser idempotente, seguro e rápido
● opera tanto em tempo real quanto em batch
🧱 Arquitetura Geral
Frontend RH
↓
Webhook (multi-action)
↓
Switch (action)
├─ add
├─ edit
├─ delete
├─ list
├─ import_csv
├─ add_img
├─ get_img
└─ delete_img
Tudo entra por um único endpoint, e o comportamento muda 100% pelo parâmetro
action.
🔁 Entrada principal
🔹 Webhook
● Endpoint único (/novo-astronomo-1)
● Aceita POST + GET
● Usado pelo painel RH
● Resposta controlada via Respond to Webhook
🔹 Switch ação
Responsável por rotear toda a lógica do sistema:
action Função
add Criar novo astrônomo
edit Editar dados
delete Remover astrônomo
list Listar todos
import_c
sv
Importação em massa
add_img Upload de imagens
get_img Buscar imagens
delete_i
mg
Remover imagem
Esse switch é o coração do fluxo.
🧑‍🚀 Gestão de Astrônomos (CRUD)
➕ ADD — Criar Astrônomo
Fluxo:
Switch (add)
→ Postgres (INSERT astronautas_login)
→ Set (organiza campos)
→ Respond (ADD)
✔️ Salva:
● Dados pessoais
● Custos operacionais
● Configurações financeiras
● IDs de tipos de tarefa
● Coordenadas de origem (se informadas)
✏️ EDIT — Atualizar Astrônomo
Fluxo:
Switch (edit)
→ Postgres (UPDATE por id_astronomo)
→ Respond (EDIT)
✔️ Atualiza apenas campos enviados
✔️ Usa replaceEmptyStrings para evitar lixo
✔️ Mantém integridade dos cálculos futuros
❌ DELETE — Remover Astrônomo
Fluxo:
Switch (delete)
→ Postgres (DELETE)
→ Respond (DELETE)
⚠️ Ação destrutiva
● Remove completamente o astrônomo
● Impacta histórico e agendas
● Correto estar isolado e explícito
📋 LIST — Listar Astrônomos
Fluxo:
Switch (list)
→ Postgres (SELECT *)
→ Respond
Usado para:
● Popular o painel
● Seleção em formulários
● Auditoria administrativa
📥 Importação em Massa (CSV)
Este é um dos pontos mais bem pensados do sistema.
Fluxo completo:
Switch (import_csv)
→ IF (arquivo existe?)
→ Extract from File
→ Code (normaliza)
→ SplitInBatches
→ Nominatim (cidade base)
→ Set (organiza dados)
→ Postgres (UPSERT)
→ Respond IMPORT CSV
🧠 Pontos fortes:
● Normalização completa de campos
● Tolerância a CSVs “sujos”
● Extração numérica inteligente
● Não quebra se faltar colunas
● Pode importar dezenas de astrônomos de uma vez
Isso aqui é nível SaaS, não automação simples.
🖼️ Gestão de Imagens de Eventos
Esse trecho é cirúrgico e resolve um problema real de operação.
➕ ADD_IMG — Upload de imagens
Fluxo:
Switch (add_img)
→ split nas imagens
→ converte img pra data
→ Loop Over Items
→ Google Drive (Upload)
→ Share file (public read)
→ Construir URL
→ Set final
✔️ Limite de 10 imagens por evento
✔️ Nomeação automática (evento_imgX.jpg)
✔️ Links sem CORS (thumbnail)
✔️ Astrônomo vê direto no painel
📄 Persistência das imagens
● Google Drive → arquivo físico
● Google Sheets → índice de imagens por evento
● Painel lê do Sheets, não do Drive diretamente
👉 Isso reduz custo, latência e complexidade no frontend.
👀 GET_IMG — Buscar imagens
Fluxo:
Switch (get_img)
→ Google Sheets (lookup por id_evento)
→ Respond
Simples, rápido e eficiente.
🗑️ DELETE_IMG — Remover imagem
Fluxo:
Switch (delete_img)
→ Code (extrai fileId da URL)
→ Google Sheets (delete row)
→ Google Drive (delete file)
→ Respond
✔️ Remove referência + arquivo
✔️ Evita lixo no Drive
✔️ Evita links quebrados
🧠 Pontos críticos de manutenção (IMPORTANTE)
❗ NÃO MEXER sem cuidado
● Switch ação
● Normalização do CSV
● Contador de imagens por evento
● Lógica de nomes dos arquivos
● UPSERT por id_astronomo
⚠️ Riscos conhecidos
● DELETE é destrutivo
● CSV malformado pode sobrescrever dados
● Exposição de Drive se permissões mudarem
🔄 Integração com os outros fluxos
Este fluxo alimenta diretamente:
● 📆 Agenda do Astrônomo
● 🧮 Worker de custos e rotas
● 📊 Painel operacional
● 🧑‍🚀 Visualização do evento pelo astrônomo
Sem o Painel RH:
o sistema vira apenas “agenda”, não operação.
email utilizado para este fluxo:
imagensurania@gmail.com
senha: S@m@r1@12
Att: Eliezer Vargas

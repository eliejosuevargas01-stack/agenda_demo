# Manual Técnico
## Fluxo de Integração Direta com o Frontend — Workflow `agenda-astronomos` (Agenda astronomos)

## 1. Objetivo do fluxo

Este workflow é o **ponto de entrada operacional do frontend** no sistema.

Sua função é receber requisições do painel dos astrônomos, interpretar a ação solicitada e executar a operação correspondente no banco de dados.

Esse fluxo é responsável por operações como:

- consultar agenda já enriquecida
- lançar despesas
- consultar histórico
- deletar evento
- consultar eventos finalizados
- consultar debug da agenda original
- consultar feedbacks de eventos concluídos

Em termos práticos, este é o **workflow de serviço** do frontend.

## 2. Papel do fluxo na arquitetura

Na arquitetura geral, este fluxo fica na camada de **entrega e operação de dados**.

Fluxo lógico:

Frontend  
↓  
Webhook `agenda-astronomos`  
↓  
Switch por `action`  
↓  
Consulta / gravação / exclusão / comparação  
↓  
Resposta ao frontend

Este fluxo **não é responsável por enriquecer a agenda**.

Ele trabalha principalmente sobre:

- `agenda_eventos` → tabela enriquecida
- `despesas` → tabela de despesas reais lançadas
- `integration.cubo_kommo_tarefas` → tabela original (usada em debug, histórico e feedback)

## 3. Entrada do fluxo

### 3.1 Webhook principal

Node:

```
agenda astronomo
```

Tipo:

```
Webhook
```

Métodos aceitos:

- GET
- POST

Path:

```
agenda-astronomos
```

Esse webhook recebe chamadas do frontend do painel de operação.

O frontend envia uma ação por:

- `query.action`
- ou `body.action`

O fluxo suporta os dois formatos.

### 3.2 Estrutura da requisição

O workflow espera que o frontend envie um campo chamado:

- `action`

Esse campo define qual operação será executada.

Exemplos de ações válidas:

- `atualizar_agenda`
- `lancar_despesas`
- `historico`
- `delete_evento`
- `finalizados`
- `debug`
- `get_feedback`

## 4. Roteamento da requisição

### 4.1 Switch principal

Node:

```
Switch
```

Função:

Ler o valor de:

```
$json.query.action + $json.body.action
```

E encaminhar a execução para o ramo correto.

Este node é o **roteador central** do workflow.

## 5. Ações disponíveis

### 5.1 Ação `atualizar_agenda`

#### Objetivo

Entregar ao frontend os eventos já processados e salvos na tabela enriquecida.

#### Fluxo

```
Switch → obtem agenda → Respond to atualizar agenda
```

#### Node principal

`obtem agenda`

Este node executa uma query em:

- `agenda_eventos`

Filtrando pelos IDs de tipo de tarefa recebidos do frontend:

- `id_visita`
- `id_pre`
- `id_reserva`
- `id_n_marcar`

#### Lógica

O frontend informa quais IDs pertencem ao astrônomo logado. O workflow então busca todos os eventos da tabela enriquecida que pertençam a esses tipos.

#### Saída

Retorna todos os eventos encontrados diretamente ao frontend.

#### Observação técnica

Essa ação consulta a **tabela enriquecida**, não a original.

Se o evento estiver faltando aqui, o problema pode estar:

- no fluxo de enriquecimento
- no worker
- na tabela enriquecida
- nos IDs de tipo de tarefa configurados

### 5.2 Ação `lancar_despesas`

#### Objetivo

Salvar ou atualizar despesas reais lançadas pelo frontend.

#### Fluxo

```
Switch → lançar despesas/finalizar → lançar despesas → Respond to lançar despesas reais
```

#### Node de preparação

`lançar despesas/finalizar`

Este node remove o campo `action` do corpo recebido e preserva o restante dos dados (limpa o payload antes de gravar no banco).

#### Node principal

`lançar despesas`

Este node faz um **upsert** na tabela:

- `despesas`

Campos principais gravados:

- `id`
- `finalizado`
- `hospedagem`
- `alimentacao`
- `outros`
- `data_agendamento`
- `nome_da_escola`
- `id_tipo_tarefa`
- `cidade`
- `astronomo`
- `combustivel`
- `pedagios`
- `monitor`
- `id_astronomo`
- `valor_total`

#### Lógica

- Se já existir uma despesa com o mesmo `id`, ela é atualizada.
- Se não existir, ela é criada.

#### Resposta

O fluxo retorna:

```
despesas salvas com sucesso!!
```

#### Observação técnica

Essa ação não recalcula agenda, não chama worker e não mexe na tabela original. Ela grava apenas as despesas operacionais reais.

### 5.3 Ação `historico`

#### Objetivo

Retornar um histórico combinado de:

- eventos completos vindos da tabela original
- despesas já lançadas na tabela `despesas`

#### Fluxo

```
Switch → get eventos completos + historico1 → Code in JavaScript1 → Merge → Respond
```

#### Ramo 1 — Eventos completos

Node:

`get eventos completos`

Consulta a tabela original:

- `integration.cubo_kommo_tarefas`

Filtra apenas eventos:

- `completo = 'Sim'`
- `deletada = 'Não'`
- `tipo_responsavel = 'Astronomo'`
- exclui PRÉ, PRE, RESERVA, Ñ MARCAR e Visita cancelada
- `completo_ate < CURRENT_DATE`

Também filtra pelos IDs enviados no body.

#### Ramo 2 — Histórico de despesas

Node:

`historico1`

Consulta a tabela:

- `despesas`

Filtrando por:

- `id_astronomo = body.id_astronomo`

#### Conversão auxiliar

Node:

`Code in JavaScript1`

Converte `id_tarefa` para número, para possibilitar merge correto com `id` da tabela de despesas.

#### Merge

Node:

`Merge`

Faz junção por:

- `id_tarefa` (eventos completos)
- `id` (despesas)

Modo:

```
keepEverything
```

#### Resultado

O frontend recebe um histórico unificado contendo:

- dados do evento concluído
- dados de despesas, se existirem

#### Observação técnica

Este merge é uma junção real de dados, usada para combinar duas fontes (não é merge apenas coordenador como no enriquecimento).

### 5.4 Ação `delete_evento`

#### Objetivo

Excluir um evento da tabela enriquecida.

#### Fluxo

```
Switch → deletar evento → Respond
```

#### Node principal

`deletar evento`

Executa:

```sql
DELETE FROM agenda_eventos
WHERE
  id = ...
  AND astronomo ILIKE ...
  AND nome_da_escola ILIKE ...
  AND data_e_hora_do_agendamento = ...
RETURNING *;
```

#### Lógica

A exclusão usa múltiplas condições para evitar apagar o evento errado.

#### Observação técnica

Essa operação afeta apenas a tabela enriquecida.

Se o evento continuar existindo na tabela original, ele poderá reaparecer depois que o fluxo de enriquecimento rodar novamente.

Ou seja: este delete é uma remoção operacional local da tabela tratada, não necessariamente uma remoção definitiva da origem.

### 5.5 Ação `finalizados`

#### Objetivo

Retornar todos os registros da tabela `despesas`.

#### Fluxo

```
Switch → historico/finalizados → Respond to Webhook2
```

#### Node principal

`historico/finalizados`

Faz um select completo na tabela:

- `despesas`

#### Observação técnica

Apesar do nome da action ser `finalizados`, o node retorna a tabela `despesas`.

### 5.6 Ação `debug`

#### Objetivo

Consultar a tabela original para fins de diagnóstico.

#### Fluxo

```
Switch → obtem agenda1 → Respond to atualizar agenda1
```

#### Node principal

`obtem agenda1`

Consulta:

- `urania.integration.cubo_kommo_tarefas`

Filtrando por:

- `completo = 'Não'`
- `deletada = 'Não'`
- `tipo_responsavel = 'Astronomo'`
- `id_tipo_tarefa IN (id_reserva, id_pre, id_visita, id_n_marcar)`

#### Função

Este ramo serve para o frontend comparar a tabela original com a tabela enriquecida (usado na página de debug).

#### Uso técnico (interpretação)

Se um evento está:

- na original e não na enriquecida → problema no enriquecimento
- na enriquecida e não na original → cancelado, apagado ou mudou de tipo
- em nenhuma → problema na origem, acionar ANALISOU

### 5.7 Ação `get_feedback`

#### Objetivo

Retornar feedbacks de eventos concluídos.

#### Fluxo

```
Switch → feedback → Respond to atualizar agenda1
```

#### Node principal

`feedback`

Consulta:

- `integration.cubo_kommo_tarefas`

Filtrando:

- `completo = 'Sim'`
- `deletada = 'Não'`
- `tipo_responsavel = 'Astronomo'`
- exclui PRÉ, PRE, RESERVA, Ñ MARCAR e Visita cancelada
- `completo_ate < CURRENT_DATE`
- `id_tipo_tarefa = body.id_visita`

Campos retornados:

- tipo da tarefa
- data do evento
- cidade
- nome da escola
- responsável
- NPS
- nota NPS
- avaliação
- avaliação geral do astrônomo
- nome do astrônomo

#### Função

Este ramo serve para exibir feedbacks operacionais de eventos já executados.

## 6. Tabelas utilizadas

### 6.1 `agenda_eventos`

Tabela enriquecida consumida pelo frontend para exibir a agenda atual.

Usada em:

- `atualizar_agenda`
- `delete_evento`

### 6.2 `despesas`

Tabela de despesas reais lançadas pelo painel.

Usada em:

- `lancar_despesas`
- `historico`
- `finalizados`

### 6.3 `integration.cubo_kommo_tarefas`

Tabela original de origem.

Usada em:

- `historico`
- `debug`
- `get_feedback`

## 7. Respostas ao frontend

Cada ramo termina em um node **Respond to Webhook**.

Isso significa que o workflow foi construído para sempre responder diretamente ao frontend dentro do mesmo request.

Tipos de resposta:

- retorno completo de registros
- retorno combinado por merge
- confirmação textual de operação
- retorno de registros deletados

## 8. Dependências críticas

Este fluxo depende diretamente de:

- webhook ativo no n8n
- banco Postgres da base enriquecida
- banco Postgres da base original
- integridade dos IDs de tipo de tarefa enviados pelo frontend

## 9. Pontos críticos para manutenção

### 9.1 Dependência dos IDs enviados pelo frontend

Grande parte das consultas depende de:

- `id_visita`
- `id_pre`
- `id_reserva`
- `id_n_marcar`

Se esses valores estiverem errados, o frontend receberá dados errados ou incompletos.

### 9.2 Tabela enriquecida desatualizada

Se a ação `atualizar_agenda` falhar em trazer eventos, o problema pode não ser deste workflow. Pode ser do fluxo de enriquecimento ou do worker.

### 9.3 Exclusão local não remove origem

A ação `delete_evento` remove da enriquecida, mas não necessariamente da original.

Se a origem continuar trazendo o evento, ele poderá reaparecer após novo enriquecimento.

### 9.4 Histórico depende de duas bases

A ação `historico` depende de:

- eventos completos na original
- despesas salvas na tabela local

Se uma dessas bases estiver inconsistente, o merge ficará incompleto.

## 10. Procedimentos de diagnóstico

### Se o frontend não carregar agenda

Verificar:

- webhook funcionando
- `action = atualizar_agenda`
- IDs de tipo de tarefa enviados
- tabela `agenda_eventos`
- fluxo de enriquecimento

### Se não salvar despesas

Verificar:

- `action = lancar_despesas`
- payload recebido no body
- node `lançar despesas/finalizar`
- permissão de escrita na tabela `despesas`

### Se o histórico estiver incompleto

Verificar:

- se o evento concluído existe na original
- se a despesa existe na tabela `despesas`
- se o merge está unindo por `id_tarefa` e `id`

### Se o debug divergir da agenda

Verificar:

- se o evento existe na original
- se o fluxo de enriquecimento rodou
- se o worker completou corretamente
- se a tabela enriquecida está atualizada

## 11. Função do fluxo para o sistema

Este workflow é o serviço operacional do frontend.

Ele não substitui o fluxo de enriquecimento nem o worker. Ele existe para:

- entregar dados ao painel
- registrar operações feitas pelo usuário
- consultar histórico
- apoiar debug
- apoiar feedback
- excluir registros operacionais

Em resumo: o frontend conversa com este workflow, e este workflow conversa com as tabelas do sistema.

## 12. Resumo técnico final

O workflow `agenda-astronomos` é um gateway operacional via webhook entre o frontend e o banco de dados.

Ele centraliza múltiplas funções em um único endpoint e usa o campo `action` para decidir qual operação executar.

As funções desse workflow são:

- consultar agenda enriquecida
- lançar despesas
- consultar histórico consolidado
- deletar eventos
- consultar despesas/finalizados
- consultar debug da origem
- consultar feedbacks de eventos concluídos

Ele é um fluxo crítico porque qualquer falha nele impacta diretamente a operação do painel.


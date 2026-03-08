# Manual Técnico de Manutenção
## Sistema de Enriquecimento de Agenda de Astrônomos (Fluxo 01 — separa por ID-Tarefa)

## 1. Objetivo do documento

Este manual fornece instruções técnicas para manutenção, diagnóstico e atualização do **sistema de enriquecimento de eventos** utilizado na agenda de astrônomos.

O documento destina-se a técnicos responsáveis pela manutenção do sistema, incluindo:

- manutenção do fluxo no n8n
- manutenção das tabelas de banco de dados
- verificação da integração com o frontend
- diagnóstico de falhas operacionais
- atualização da lógica do fluxo

## 2. Visão geral do sistema

O sistema tem como objetivo transformar eventos brutos da base operacional em uma **tabela enriquecida** pronta para consumo no frontend e em processos internos.

Arquitetura (fluxo lógico simplificado):

Tabela original  
↓  
Fluxo de enriquecimento (n8n)  
↓  
Worker complementar  
↓  
Merge de sincronização  
↓  
Tabela enriquecida  
↓  
Webhook  
↓  
Frontend

Cada etapa depende da anterior. Se uma camada falhar, as camadas seguintes podem apresentar:

- dados incompletos
- eventos incorretos
- ausência de eventos
- inconsistência na agenda

## 3. Componentes do sistema

### 3.1 Tabela original

A tabela original contém os eventos operacionais gerados pelo sistema externo.

- Responsável pela origem: **ANALISOU**
- Esta tabela é considerada a **fonte primária** de dados

Se os dados estiverem errados aqui, o restante do sistema também apresentará erro.

### 3.2 Fluxo de enriquecimento no n8n

O fluxo no n8n é responsável por:

- ler eventos da tabela original
- identificar o astrônomo responsável
- classificar eventos por tipo de tarefa
- combinar eventos com dados fixos do astrônomo
- preparar registros enriquecidos
- enviar eventos para processamento adicional (worker)
- gravar os resultados na tabela enriquecida

Esse fluxo executa periodicamente (e pode ser executado manualmente para diagnóstico).

### 3.3 Worker complementar

O worker é um workflow auxiliar utilizado para complementar o processamento de determinados eventos.

Ele pode executar operações adicionais que não são realizadas no fluxo principal.

Se o worker falhar:

- o enriquecimento pode ficar incompleto
- o fluxo pode falhar
- dados inconsistentes podem ser gravados

### 3.4 Merge de sincronização

O node **Merge** no fluxo não realiza associação de dados.

Ele atua como coordenador de execução, sinalizando que todos os ramos necessários do fluxo foram concluídos.

Cada item no fluxo representa a agenda de um astrônomo. Quando o Merge é atingido, significa:

- o processamento daquele item foi finalizado

### 3.5 Tabela enriquecida

A tabela enriquecida é o resultado final do processamento. Ela contém:

- dados do evento
- dados fixos do astrônomo
- informações complementares do worker
- estrutura pronta para consumo pelo frontend

Essa tabela é a base utilizada pelo sistema de visualização e operação.

### 3.6 Comunicação com o frontend

O frontend não utiliza APIs tradicionais. Ele utiliza **webhooks** que acionam workflows no n8n.

Fluxo de comunicação:

Frontend  
↓  
Webhook  
↓  
Workflow de consulta  
↓  
Tabela enriquecida  
↓  
Resposta ao frontend

Isso significa que falhas de dados podem ter origem em:

- webhook
- workflow de consulta
- tabela enriquecida
- fluxo de enriquecimento

## 4. Funcionamento do enriquecimento

### 4.1 Dados fixos dos astrônomos

Cada astrônomo possui dados fixos armazenados na base administrativa. Esses dados incluem:

- identificação
- parâmetros logísticos
- parâmetros financeiros
- localização
- IDs de tipo de tarefa

Esses dados são essenciais para o funcionamento do fluxo.

### 4.2 Match entre evento e astrônomo

O match não ocorre no Merge.

O match acontece nos nodes **Edit Fields (Set)**, que combinam:

dados do evento  
 +  
dados fixos do astrônomo

Produzindo um registro enriquecido.

### 4.3 IDs de tipo de tarefa

O sistema depende de quatro identificadores fundamentais:

- `id_reserva`
- `id_visita`
- `id_pre`
- `id_n_marcar`

Esses IDs determinam como os eventos são classificados no fluxo.

O match acontece quando:

`id_tipo_tarefa` do evento = `id_tipo_tarefa` configurado no cadastro do astrônomo

Se esses valores não corresponderem, o evento não será corretamente associado (e pode “sumir” ou ser classificado incorretamente).

### 4.4 Configuração dos IDs

Os IDs são configurados no painel administrativo do RH (`rh-astronomos.html`).

Eles não devem ser alterados diretamente no fluxo.

Alterações incorretas nesses campos podem causar:

- eventos não processados
- eventos classificados incorretamente
- agenda incompleta

## 5. Página de diagnóstico do frontend

O frontend possui páginas de debug técnico que comparam bases:

- `debug-astronomo.html`: comparação no contexto do usuário logado
- `debug-rh.html`: comparação com seleção de qualquer astrônomo (admin)

Essas ferramentas ajudam a identificar rapidamente em qual camada o problema está localizado (original vs enriquecida).

## 6. Procedimentos de diagnóstico

### 6.1 Evento existe na tabela original mas não na enriquecida

Isso indica falha no fluxo de enriquecimento.

Possíveis causas:

- fluxo não executou
- erro no worker
- erro no match de tipo de tarefa
- IDs configurados incorretamente
- erro no fluxo n8n

Ação recomendada:

- verificar execução do fluxo
- executar fluxo manualmente
- verificar worker
- verificar IDs de tipo de tarefa

### 6.2 Evento existe na tabela enriquecida mas não na original

Isso indica que o evento foi removido ou alterado na origem.

Possíveis causas:

- cancelamento
- exclusão
- mudança de tipo de tarefa

Ação recomendada:

- executar novamente o fluxo de enriquecimento
- validar a origem (se houve mudança/cancelamento)

### 6.3 Evento não existe em nenhuma tabela

Isso indica que o evento não foi gerado na origem (ou há falha upstream).

Nesse caso, o problema está fora do sistema de enriquecimento. Deve-se acionar:

- equipe **ANALISOU**

## 7. Problemas comuns no n8n

### 7.1 Fluxo executa mas não gera eventos

Possíveis causas:

- filtros SQL incorretos
- IDs de tipo de tarefa incorretos
- dados fixos incorretos
- erro no worker
- tabela original sem eventos válidos

### 7.2 Falha no worker

Sintomas:

- eventos incompletos
- enriquecimento parcial
- erro na execução

Ação recomendada:

- executar worker manualmente
- verificar payload recebido
- verificar retorno esperado

### 7.3 Falha no fluxo de enriquecimento

Possíveis causas:

- erro em node SQL
- erro de transformação
- falha no banco
- mudança de estrutura da tabela

Ação recomendada:

- executar fluxo manualmente
- verificar cada node
- validar dados intermediários

## 8. Problemas de conexão

Problemas de conexão podem ocorrer entre:

- n8n e banco de dados
- frontend e webhook
- workflow e worker

Sintomas comuns:

- timeout
- connection refused
- authentication failed

Procedimentos de verificação:

- verificar se o banco está ativo
- testar credenciais
- verificar rede
- verificar firewall
- testar conexão externa

## 9. Procedimentos de manutenção

Antes de qualquer alteração:

- exportar o workflow do n8n
- registrar a configuração atual
- realizar backup da tabela enriquecida
- documentar a alteração

## 10. Atualizações no sistema

Alterações podem ocorrer em diferentes camadas:

- banco de dados
- fluxo n8n
- worker
- painel administrativo
- frontend

Sempre verificar impacto nas demais camadas antes de aplicar mudanças.

## 11. Sequência recomendada de diagnóstico

Ao investigar problemas, seguir sempre esta ordem:

1. verificar frontend
2. verificar webhook
3. verificar workflow de consulta
4. verificar tabela enriquecida
5. verificar fluxo de enriquecimento
6. verificar worker
7. verificar dados fixos dos astrônomos
8. verificar IDs de tipo de tarefa
9. verificar tabela original
10. acionar equipe ANALISOU

## 12. Boas práticas de manutenção

- nunca alterar o fluxo sem backup
- sempre testar manualmente após alterações
- validar dados intermediários no n8n
- manter registro das alterações realizadas
- evitar alterar IDs de tipo de tarefa sem validação
- validar funcionamento do worker após mudanças

## Conclusão

O sistema de enriquecimento depende da consistência entre três elementos principais:

- dados da tabela original
- dados fixos dos astrônomos
- funcionamento correto do fluxo no n8n

Qualquer inconsistência nesses pontos pode resultar em falha de processamento ou dados incorretos na agenda.

A tabela enriquecida representa o estado final consolidado do sistema e deve sempre refletir corretamente os dados da tabela original após o processamento do fluxo.


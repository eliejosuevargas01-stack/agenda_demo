# Manual Técnico
## Fluxo Administrativo, Cadastro e Login — Workflow `painel rh-astronomos` (Webhook `novo-astronomo-1`)

## 1. Objetivo do fluxo

Este workflow é o **endpoint administrativo central** do sistema.

Ele é responsável por:

- cadastrar astrônomos
- editar astrônomos
- excluir astrônomos
- importar astrônomos por CSV
- listar astrônomos
- autenticar astrônomos no login do painel
- autenticar administradores
- cadastrar administradores
- editar administradores
- excluir administradores
- listar administradores
- salvar imagens de eventos
- consultar imagens de eventos
- excluir imagens de eventos

Em termos práticos, este fluxo é o **gateway administrativo e de autenticação** do sistema.

## 2. Papel do fluxo na arquitetura

Esse workflow atende a camada de administração e controle de acesso.

Fluxo lógico:

```text
Frontend admin / tela de login
        ↓
Webhook novo-astronomo-1
        ↓
Switch por action
        ↓
Operação em banco / importação / autenticação
        ↓
Resposta ao frontend
```

Ele trabalha principalmente sobre três tabelas:

- `astronautas_login`
- `admin_login_agenda`
- `imagens_eventos`

## 3. Webhook de entrada

### 3.1 Endpoint principal

Node:

`Webhook`

Path:

```text
novo-astronomo-1
```

Configuração relevante:

- aceita múltiplos métodos
- responde via `responseNode`
- `allowedOrigins: *`

Esse endpoint recebe requisições do frontend administrativo e da tela de login.

## 4. Roteamento por ação

### 4.1 Switch central

Node:

`ação`

Esse node lê:

```text
$json.body.action + $json.query.action
```

E encaminha a execução para o ramo correto.

As ações suportadas são:

- `add`
- `edit`
- `delete`
- `import_csv`
- `list`
- `add_img`
- `get_img`
- `delete_img`
- `login`
- `admin`
- `add_admin`
- `edit_admin`
- `delete_admin`
- `get_admin`

Esse node é o **roteador principal do painel administrativo**.

## 5. Estrutura funcional do workflow

O workflow está dividido em quatro grandes grupos:

1. gestão de astrônomos
2. login de astrônomos
3. gestão de administradores
4. gestão de imagens de eventos

## 6. Gestão de astrônomos

### 6.1 Ação `add`

#### Objetivo

Cadastrar um novo astrônomo na tabela principal de configuração e login.

#### Fluxo

`Webhook` → `ação` → `add_astronomo` → `organize` → `Respond (ADD)`

#### Tabela usada

```text
astronautas_login
```

#### Node principal

`add_astronomo`

Esse node insere um novo registro contendo:

- usuário
- senha
- nome completo
- nome curto / astrônomo
- cidade base
- estado
- telefone
- email
- veículo
- consumo
- combustível
- valor do litro
- hospedagem
- alimentação
- monitor
- pedágios
- porcentagem de lucro
- origem geográfica
- IDs de tipo de tarefa:
  - `id_visita`
  - `id_pre`
  - `id_reserva`
  - `id_n_marcar`

#### Observação importante

Esse cadastro não é apenas de login. Ele também armazena os **dados fixos operacionais** do astrônomo.

Ou seja, essa tabela é crítica para:

- autenticação
- enriquecimento de agenda
- worker logístico
- cálculo de custos
- match por tipo de tarefa

#### Node `organize`

Serve para reorganizar o payload retornado antes da resposta.

#### Impacto técnico

Se esse cadastro estiver incorreto, o sistema inteiro pode falhar em:

- login
- match de eventos
- enriquecimento
- cálculo logístico
- filtros do frontend

### 6.2 Ação `edit`

#### Objetivo

Atualizar os dados de um astrônomo existente.

#### Fluxo

`ação` → `edit` → `Respond (EDIT)`

#### Tabela usada

```text
astronautas_login
```

#### Regra de atualização

O update usa:

```text
id_astronomo
```

Como chave de match.

#### Campos atualizados

Atualiza praticamente toda a configuração operacional e de login do astrônomo.

#### Impacto técnico

Essa é uma das operações mais sensíveis do sistema, porque altera:

- login
- dados fixos
- IDs de tipo de tarefa
- localização base
- parâmetros financeiros

Se houver erro aqui, o astrônomo pode:

- perder acesso
- deixar de receber eventos
- receber eventos errados
- calcular distâncias incorretamente
- gerar agenda incompleta

### 6.3 Ação `delete`

#### Objetivo

Excluir um astrônomo do cadastro.

#### Fluxo

`ação` → `delete` → `Respond (DELETE)`

#### Tabela usada

```text
astronautas_login
```

#### Query executada

Remove o registro por:

```text
id_astronomo
```

#### Efeito prático

Após a exclusão, o sistema perde:

- login do astrônomo
- configuração operacional
- parâmetros de enriquecimento
- dados de match de tipo de tarefa

#### Observação técnica

Excluir um astrônomo pode quebrar o processamento da agenda se ainda existirem eventos vinculados logicamente a ele.

### 6.4 Ação `list`

#### Objetivo

Listar todos os astrônomos cadastrados.

#### Fluxo

`ação` → `Select rows from a table` → `Respond to Webhook`

#### Tabela usada

```text
astronautas_login
```

#### Função

Esse ramo é utilizado pelo painel administrativo para exibir os astrônomos cadastrados e seus dados fixos.

## 7. Importação por CSV

### 7.1 Ação `import_csv`

#### Objetivo

Cadastrar ou atualizar vários astrônomos em lote a partir de um arquivo CSV.

#### Fluxo

`ação` → `Verificar arquivo csv` → `Extract from File` → `normaliza` → `Loop Over Items` → `HTTP • Nominatim` → `Edit Fields` → `IMPORT CSV` → `Respond IMPORT CSV`

### 7.2 Validação do arquivo

Node:

`Verificar arquivo csv`

Verifica se existe arquivo binário em:

```text
$binary.file
```

Se não houver arquivo, o fluxo não prossegue corretamente.

### 7.3 Extração do CSV

Node:

`Extract from File`

Lê o CSV com:

- cabeçalho habilitado
- leitura como string

Esse node converte o arquivo em itens estruturados para o fluxo.

### 7.4 Normalização dos campos

Node:

`normaliza`

Esse node faz o mapeamento entre colunas do CSV e os campos internos do sistema.

Ele também:

- limpa espaços
- padroniza texto
- extrai números
- converte formatos textuais em numéricos
- garante presença do campo `pedagios`
- tenta derivar `usuario` a partir de `tipo_da_tarefa` se estiver ausente

#### Função crítica

Esse node é o tradutor entre o formato do CSV e a estrutura exigida pelo banco.

Se o CSV mudar de layout, esse node será o primeiro a quebrar.

### 7.5 Loop item a item

Node:

`Loop Over Items`

Processa um astrônomo por vez.

### 7.6 Geolocalização da origem

Node:

`HTTP • Nominatim (Origem/curret-loc)`

Consulta o Nominatim para obter:

- `origem_lat`
- `origem_lon`

Com base em:

```text
cidade_base, estado
```

#### Função

Gerar automaticamente as coordenadas da base do astrônomo durante a importação.

Isso é importante porque essas coordenadas serão usadas depois pelo worker logístico.

### 7.7 Enriquecimento dos dados importados

Node:

`Edit Fields`

Monta o payload final do astrônomo importado, combinando:

- dados do CSV
- coordenadas obtidas via Nominatim

### 7.8 Gravação em lote

Node:

`IMPORT CSV`

Faz `upsert` na tabela:

```text
astronautas_login
```

Usando:

```text
id_astronomo
```

Como chave de match.

#### Efeito

- Se o astrônomo já existir, atualiza.
- Se não existir, cria.

## 8. Login de astrônomos

### 8.1 Ação `login`

#### Objetivo

Autenticar o astrônomo no painel operacional.

#### Fluxo

`ação` → `Select rows from a table1` → `If` → resposta positiva ou negativa

#### Tabela usada

```text
astronautas_login
```

#### Filtro aplicado

Busca por:

- `usuario = body.usuario`
- `senha_usuario = body.senha`

#### Node `If`

Valida se:

- o usuário retornado é igual ao enviado
- a senha retornada é igual à enviada

#### Resposta de sucesso

Node:

`Respond to Webhook4`

Retorna o registro do astrônomo encontrado.

#### Resposta de falha

Node:

`Respond to Webhook5`

Retorna:

```text
Login ou senha incorreta
```

#### Observação técnica importante

A autenticação é feita diretamente contra o banco, com comparação direta de texto.

## 9. Login de administradores

### 9.1 Ação `admin`

#### Objetivo

Autenticar usuário administrador.

#### Fluxo

`ação` → `Select rows from a table3` → `If1` → resposta positiva ou negativa

#### Tabela usada

```text
admin_login_agenda
```

#### Filtro aplicado

Busca por:

- `email = body.usuario`
- `senha = body.senha`

#### Node `If1`

Valida se:

- o email retornado é igual ao enviado
- a senha retornada é igual à enviada

#### Resposta de sucesso

Node:

`Respond to Webhook6`

#### Resposta de falha

Node:

`Respond to Webhook7`

Retorna:

```text
Login ou senha incorreta
```

## 10. Gestão de administradores

### 10.1 Ação `add_admin`

#### Objetivo

Cadastrar novo administrador.

#### Fluxo

`ação` → `add admin` → `Respond to Webhook8`

#### Tabela usada

```text
admin_login_agenda
```

#### Campos gravados

- `email`
- `senha`
- `criado_em`

### 10.2 Ação `edit_admin`

#### Objetivo

Editar um administrador existente.

#### Fluxo

`ação` → `edit admin` → `Respond to Webhook9`

#### Regra

Atualiza por `id`.

### 10.3 Ação `delete_admin`

#### Objetivo

Excluir administrador.

#### Fluxo

`ação` → `delete admin` → `Respond to Webhook10`

#### Regra

Exclui por `id`.

### 10.4 Ação `get_admin`

#### Objetivo

Listar administradores cadastrados.

#### Fluxo

`ação` → `Select rows from a table4` → `Respond to Webhook6`

#### Tabela usada

```text
admin_login_agenda
```

## 11. Gestão de imagens de eventos

### 11.1 Ação `add_img`

#### Objetivo

Salvar imagem vinculada a um evento.

#### Fluxo

`ação` → `Insert image from events` → `Respond to Webhook3`

#### Tabela usada

```text
imagens_eventos
```

#### Campos gravados

- `id` do evento
- `conteudo_base64`
- `criado_em`

#### Observação

As imagens são armazenadas em base64 no banco.

### 11.2 Ação `get_img`

#### Objetivo

Consultar imagens de um evento.

#### Fluxo

`ação` → `Select images from event` → `Respond to Webhook1`

#### Filtro

Busca por:

```text
id = body.id_evento
```

### 11.3 Ação `delete_img`

#### Objetivo

Excluir imagem específica de um evento.

#### Fluxo

`ação` → `delete images from event1` → `Respond to Webhook2`

#### Filtro

Remove por:

- `id = body.id_evento`
- `conteudo_base64 = body.conteudo_base64`

## 12. Tabelas utilizadas

### 12.1 `astronautas_login`

Tabela principal dos astrônomos.

Armazena:

- login
- senha
- dados pessoais
- dados operacionais
- dados geográficos
- parâmetros de custo
- IDs de tipo de tarefa

É uma tabela crítica do sistema.

### 12.2 `admin_login_agenda`

Tabela de login administrativo.

Armazena:

- email
- senha
- data de criação

### 12.3 `imagens_eventos`

Tabela de imagens dos eventos.

Armazena:

- id do evento
- imagem em base64
- data de criação

## 13. Importância técnica da tabela `astronautas_login`

Essa tabela não serve apenas para login.

Ela também é fonte para:

- match entre evento e astrônomo
- ids de tipo de tarefa
- cidade base
- origem geográfica
- custos médios
- worker de rotas
- enriquecimento da agenda

Ou seja:

> qualquer erro nessa tabela afeta muito mais do que o login.

Se os dados estiverem errados, o sistema pode falhar em:

- autenticação
- enriquecimento
- cálculo de rota
- cálculo de custo
- exibição correta da agenda

## 14. Procedimentos de diagnóstico

### 14.1 Se o login do astrônomo falhar

Verificar:

1. se a action enviada é `login`
2. se `usuario` e `senha` chegaram no body
3. se o registro existe em `astronautas_login`
4. se a senha cadastrada coincide exatamente
5. se não houve alteração manual indevida no banco

### 14.2 Se o login do admin falhar

Verificar:

1. se a action enviada é `admin`
2. se `usuario` corresponde ao email esperado
3. se a senha foi cadastrada corretamente em `admin_login_agenda`
4. se o registro ainda existe

### 14.3 Se um astrônomo não aparecer na agenda depois do cadastro

Verificar:

1. se o registro foi realmente inserido em `astronautas_login`
2. se os IDs:
   - `id_visita`
   - `id_pre`
   - `id_reserva`
   - `id_n_marcar`
   estão corretos
3. se `cidade_base`, `origem_lat` e `origem_lon` estão corretos
4. se o enriquecimento está lendo esse astrônomo corretamente

### 14.4 Se a importação CSV falhar

Verificar:

1. se o arquivo chegou em `$binary.file`
2. se o cabeçalho do CSV continua igual ao esperado
3. se o node `normaliza` ainda cobre todas as colunas
4. se o Nominatim retornou coordenadas
5. se o `id_astronomo` está presente e consistente

### 14.5 Se imagens não forem recuperadas

Verificar:

1. se a action é `get_img`
2. se `id_evento` foi enviado corretamente
3. se o registro existe em `imagens_eventos`
4. se a imagem foi de fato salva via `add_img`

## 15. Pontos críticos para manutenção

### 15.1 Senhas estão sendo tratadas como texto direto

O fluxo usa comparação direta de senha com o banco.

Isso significa que qualquer alteração indevida no valor armazenado quebra o login imediatamente.

### 15.2 Cadastro do astrônomo é acoplado à lógica operacional

Editar cadastro não impacta só o login. Impacta também o restante do sistema.

### 15.3 Importação CSV depende fortemente do layout do arquivo

Se o CSV mudar nome de coluna, ordem ou formato, o node `normaliza` pode deixar de mapear corretamente.

### 15.4 `allowedOrigins: *`

O webhook está aberto para qualquer origem.

Do ponto de vista técnico isso facilita integração, mas exige atenção de segurança.

## 16. Considerações de segurança

Este workflow, como está, mostra algumas características que o técnico deve conhecer:

### 16.1 Login por comparação direta

Astrônomos e admins são autenticados por busca direta no banco com usuário/senha.

### 16.2 Senhas em banco

Pelo desenho do fluxo, as senhas parecem estar armazenadas em formato legível, não com hash.

### 16.3 CORS aberto

O webhook aceita qualquer origem.

### 16.4 Operações sensíveis por action

Um único endpoint concentra:

- login
- cadastro
- exclusão
- admin
- importação
- imagens

Isso exige cuidado extra com validação e proteção do acesso no frontend e na infraestrutura.

## 17. Resumo técnico final

O workflow `novo-astronomo-1` é o **painel administrativo e de autenticação** do sistema.

Ele centraliza:

- cadastro e manutenção de astrônomos
- importação em lote
- login de astrônomos
- login e gestão de administradores
- gerenciamento de imagens de eventos

A tabela mais importante desse fluxo é `astronautas_login`, porque ela é usada tanto para autenticação quanto para toda a lógica operacional do sistema.

Em resumo:

> este fluxo controla quem entra no sistema e também controla os dados fixos que sustentam o restante da operação.


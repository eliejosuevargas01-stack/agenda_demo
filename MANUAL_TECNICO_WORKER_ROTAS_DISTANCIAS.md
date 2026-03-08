# Manual Técnico
## Worker de Cálculo de Rotas e Distâncias — n8n

## 1. Objetivo do Worker

Este workflow é responsável por:

1. Receber eventos do sistema principal.
2. Identificar a localização geográfica do evento.
3. Calcular a rota entre a base do astrônomo e o evento.
4. Determinar distância e duração da viagem.
5. Aplicar regras logísticas de deslocamento.
6. Registrar os resultados na tabela `agenda_eventos` do banco de dados.

O worker funciona como um **processador logístico automático** de eventos.

## 2. Fluxo Geral do Worker

Fluxo resumido:

```
Workflow Principal
        ↓
Trigger (When Executed by Another Workflow)
        ↓
Loop de eventos
        ↓
Normalização da cidade
        ↓
Geocoding (Nominatim)
        ↓
Fallback GPT (se cidade inválida)
        ↓
Cálculo de rota (OSRM)
        ↓
Cálculo de distância e duração
        ↓
Lógica de rota contínua
        ↓
Atualização no banco PostgreSQL
```

## 3. Entrada de Dados

O workflow recebe objetos contendo dados do evento, como:

Campos principais utilizados:

| Campo | Descrição |
| --- | --- |
| `id` | ID do evento |
| `cidade` | Cidade do evento |
| `cidade_base` | Cidade base do astrônomo |
| `origem_lat` | Latitude da base |
| `origem_lon` | Longitude da base |
| `data_e_hora_agendamento` | Data do evento |
| `nome_da_escola` | Local do evento |
| `numero_alunos` | Quantidade de alunos |

Esses dados são recebidos através do node:

```
When Executed by Another Workflow
```

## 4. Loop de Processamento

Node:

```
Loop Over Items (Split in Batches)
```

Função:

Processar **um evento por vez**, evitando sobrecarga nas APIs externas.

Fluxo do loop:

```
evento 1 → processa
evento 2 → processa
evento 3 → processa
```

## 5. Normalização da Cidade

Node:

```
Code
```

Função:

Padronizar o nome da cidade para evitar erros de geolocalização.

Exemplo de transformação:

```
São José → Sao Jose
Maricá → Marica
```

Código utilizado:

```javascript
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
```

Remoções aplicadas:

- acentos
- caracteres especiais
- espaços extras

## 6. Geocodificação da Cidade

Node:

```
HTTP Request
```

API utilizada:

```
Nominatim (OpenStreetMap)
```

Endpoint:

```
https://nominatim.openstreetmap.org/search
```

Parâmetros enviados:

```
format=jsonv2
limit=1
countrycodes=br
q=cidade
```

Resposta esperada:

```
lat
lon
display_name
```

## 7. Verificação de Coordenadas

Node:

```
If
```

Verifica se o Nominatim retornou:

```
lat
lon
```

Se **existirem coordenadas**:

```
segue para cálculo de rota
```

Se **não existir resultado**:

```
usa GPT para corrigir a cidade
```

## 8. Correção de Cidade via GPT

Node:

```
gpt
```

Função:

Corrigir nomes de cidade inválidos.

Exemplo:

Entrada:

```
Rip de Janeiro - RJ
```

Saída esperada:

```
Rio de Janeiro - RJ
```

Após correção:

A cidade corrigida é enviada novamente para:

```
Nominatim
```

## 9. Cálculo de Rota

Node:

```
HTTP Request (OSRM)
```

API utilizada:

```
Open Source Routing Machine
```

Endpoint:

```
router.project-osrm.org
```

Parâmetros:

```
origem_lon,origem_lat
destino_lon,destino_lat
```

Exemplo:

```
route/v1/driving/origem;destino
```

Resposta contém:

```
distance
duration
geometry
```

## 10. Conversão de Distância e Tempo

Node:

```
Code
```

Transformações realizadas:

Distância:

```
metros → quilômetros
```

Tempo:

```
segundos → horas
```

Exemplo:

```
distance = 420000 m
→ 420 km
```

```
duration = 18000 s
→ 5 horas
```

Saída final:

```
distancia_km
duracao_horas
```

## 11. Lógica de Rota Logística

Node:

```
Code7 / Code8
```

Este bloco define regras de deslocamento.

Regra principal:

```
Se distância > 250 km
→ rota contínua
```

Caso contrário:

```
astrônomo retorna para base
```

Variáveis geradas:

| Campo | Descrição |
| --- | --- |
| `origem_real` | ponto real de partida |
| `rota_continua` | indica se continua viagem |
| `precisa_voltar_para_base` | indica retorno |

## 12. Atualização do Banco

Node:

```
Postgres
```

Operação:

```
UPSERT
```

Tabela:

```
agenda_eventos
```

Campos atualizados:

| Campo | Descrição |
| --- | --- |
| `distancia_km` | distância da viagem |
| `duracao_horas` | tempo estimado |
| `destino_lat` | latitude do evento |
| `destino_lon` | longitude do evento |
| `cidade_evento` | cidade confirmada |
| `rota_continua` | regra logística |
| `precisa_voltar_para_base` | retorno à base |

## 13. Estrutura da Tabela

Tabela principal:

```
agenda_eventos
```

Campos relacionados ao worker:

```
origem_lat
origem_lon
destino_lat
destino_lon
distancia_km
duracao_horas
cidade_evento
rota_continua
precisa_voltar_para_base
```

## 14. Tratamento de Erros

O workflow possui proteção para:

### Falha de geocoding

Se Nominatim falhar:

```
GPT corrige cidade
```

### Falha de rota

Se OSRM não retornar rota válida:

```
retorna erro controlado
```

## 15. Dependências Externas

APIs utilizadas:

| Serviço | Função |
| --- | --- |
| Nominatim | geocodificação |
| OSRM | cálculo de rotas |
| OpenAI | correção de cidades |

## 16. Observações Operacionais

O worker depende de:

- conexão com banco PostgreSQL
- acesso à internet
- APIs externas disponíveis

## 17. Recomendações Técnicas

Para produção recomenda-se:

1. Implementar cache de cidades
2. Limitar requisições Nominatim
3. Usar chave segura para OpenAI
4. Monitorar tempo de resposta das APIs

## 18. Resultado Final

Após execução do worker, cada evento possuirá:

```
cidade validada
coordenadas geográficas
distância da base
tempo estimado de viagem
regra logística aplicada
```

Essas informações são utilizadas posteriormente para:

- cálculo de custos
- planejamento de viagens
- organização da agenda logística


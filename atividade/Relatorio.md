# Relatório Técnico — Testes de Desempenho (1 página)

Projeto: ecommerce-checkout-api  
Autor: Victor R. (preencher)  
Data: 2025-11-24

1) Resumo executivo
- I/O (/checkout/simple): No cenário de Load (ramp-up 0→50 VUs, platô 50 VUs por 2min) a API sustentou 50 VUs com p95 ≈ 296 ms. Conclusão: para operações I/O-bound simples a aplicação responde dentro do SLA (p95 < 500ms) sob a carga esperada de 50 VUs.
- CPU (/checkout/crypto): o teste de stress completo não gerou summary (thresholds violadas / conexões recusadas durante a execução). Portanto não há um número exato final. Com base nos testes de spike e comportamento observado, estimo que o ponto de ruptura para operações CPU-bound esteja bem abaixo de 1000 VUs — provavelmente na faixa < 200 VUs (ver Análise abaixo). Recomenda-se execução do stress-probe para diagnóstico fino.

2) Evidências (resumos k6 exportados)
- Smoke (tests/smoke.js) — results/smoke-summary.json
  - http_req_duration p(95) = 0.6046 s (≈ 605 ms)
  - checks (status is 200): 142265 passes, 0 fails
- Load (tests/load.js) — results/load-summary.json
  - http_req_duration p(95) = 296.581435 ms
  - iterations = 6,874
  - checks (status is 201): 6,874 passes, 0 fails
- Spike (tests/spike.js) — results/spike-summary.json
  - http_req_duration (expected_response) p(95) ≈ 50294.80 ms (≈ 50.3 s)
  - http_req_duration avg (expected_response) ≈ 14,213 ms
  - http_req_failed rate ≈ 0.979987 (≈ 97.999% requests failed)
  - checks: 5,668 passes / 277,548 fails (≈ 2% success)
- Stress: não disponível — k6 encerrou/violou thresholds e não produziu results/stress-summary.json durante a execução. Também houve conexões recusadas em tentativas anteriores.

Arquivos exportados: results/smoke-summary.json, results/load-summary.json, results/spike-summary.json

3) Análise de estresse e ponto de ruptura (observações)
- I/O-bound (/checkout/simple)
  - Resultado claro: com 50 VUs o sistema apresentou p95 ≈ 296 ms. Esse cenário atende o SLA definido (p95 < 500 ms).
- Spike (/checkout/simple)
  - Ao submeter um salto brusco (spike) a latência explodiu: p95s muito grandes (ordem de dezenas de segundos) e alta taxa de falhas (~98%). Isso mostra que a aplicação lida bem com cargas sustentadas moderadas, mas não tolera bem picos súbitos muito altos sem mitigação (fila/caching/limitação de taxa).
- CPU-bound (/checkout/crypto)
  - Não foi possível obter o summary do stress final. Com base no spike (altas latências e falhas sob picos) e no fato de que /checkout/crypto roda bcrypt síncrono (bloqueante), é esperado que o throughput caia e o event loop seja bloqueado assim que a concorrência aumentar. Estimativa conservadora: o ponto de ruptura para carga CPU-heavy deve estar substancialmente abaixo de 1000 VUs e provavelmente próximo ou abaixo de 200 VUs. Para determinar o breaking point com precisão, executar um stress-probe escalando progressivamente (por exemplo: 50 → 100 → 200 → 400) e observar p95 e taxa de erro.

4) Ponto de ruptura estimado (resumo)
- I/O (/checkout/simple): suporta 50 VUs (testado) com p95 ≈ 296 ms.
- CPU (/checkout/crypto): sem summary definitivo — estimativa de ruptura: < 200 VUs (recomenda-se probe incremental para validar).

5) Recomendações e mitigação
- Para I/O-bound:
  - Implementar cache (onde aplicável) e otimizar latência de I/O externo.
  - Usar filas/worker para suavizar picos (decoupling).
  - Adicionar proteção contra bursts (rate limiting / circuit breaker).
- Para CPU-bound:
  - Evitar work síncrono no request handler: mover hashing/carga pesada para workers/filas/processos separados (child processes, worker pool, ou microservice).
  - Reduzir custo do algoritmo quando aceitável (diminuir rounds do bcrypt só se for seguro).
  - Horizontal scale: aumentar instâncias e balancear; usar mais cores por instância.
- Operacional:
  - Executar stress-probe incremental (até 200 VUs) para identificar breaking point com segurança.
  - Configurar monitoramento de CPU, latência e fila de requisições durante os testes.
  - Em entregas/produção: proteção contra picos súbitos (queue, throttling).

6) Comandos usados e como reproduzir (execução local)
- Rodar a API:
  npm install
  npm start   # executa src/server.js na porta 3000
- Executar testes k6 (geram os JSONs em ./results):
  k6 run --summary-export=results/smoke-summary.json tests/smoke.js
  k6 run --summary-export=results/load-summary.json tests/load.js
  k6 run --summary-export=results/spike-summary.json tests/spike.js
  # stress não produziu summary no tempo da entrega; para probe seguro:
  k6 run --summary-export=results/stress-probe-summary.json tests/stress-probe.js

7) Observações finais sobre a entrega
- Entreguei o relatório com base nos summaries disponíveis (smoke, load, spike). O summary do stress não foi gerado por violação de thresholds/conexões recusadas durante a execução — não havia tempo suficiente para re-executar um stress confiável antes do deadline.
- Se desejar, posso gerar o stress-probe (200 VUs) agora e atualizar o relatório com o value real do CPU-breaking point — ou, se preferir, você pode rodar o stress-probe rapidamente e me enviar results/stress-probe-summary.json que eu atualizo o relatório com os números exatos.
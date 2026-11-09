# 🍔 iFood Ops - Agente de Triagem com IA

🔗 **Demo ao vivo (24/7):** https://ifood-ops.vercel.app

Sistema de triagem automática e análise de risco para operações de delivery. O agente analisa a reclamação do cliente, consulta a telemetria do pedido via *Tool Calling* e define a alçada de atendimento (estorno automático, cupom ou bloqueio por fraude).

## 🚀 Arquitetura Híbrida e Resiliência

O projeto foi construído para operar com alta disponibilidade, utilizando duas abordagens complementares:

1. **Modo Cloud Serverless (Next.js + Vercel):** A interface consome a API do Google Gemini diretamente via rota `/api/triagem`.
2. **Fallback Local:** Caso a API do Google fique indisponível (ex: Erro 503 High Demand ou limite de cota), o sistema intercepta a falha e aciona instantaneamente um motor de regras simples, garantindo que a central de operações nunca fique fora do ar.
3. **Modo Low-Code (n8n):** O fluxo arquitetural da IA, simulando a operação interna, foi orquestrado visualmente e está disponível no arquivo `workflow-n8n.json`.

## ⚙️ Como o Agente Funciona

- **Entrada:** O operador cola o relato do cliente.
- **Integração de Dados (Tool Calling):** Ao identificar um número de pedido (ex: `#9988`), o agente consulta o banco simulado para resgatar status logístico, tempo de atraso e perfil de risco do cliente.
- **Decisão:** A IA classifica o nível de urgência e aplica regras de negócio rígidas (ex: bloquear estornos se o cliente tiver alto índice de reembolsos recentes, independentemente da reclamação).
- **Sanitização de Contrato:** O JSON de saída passa por um *guardrail* de código para garantir o formato correto e injetar metadados determinísticos (Protocolo e Timestamp).

## 📂 Repositório e Execução

- **Código Front-end/Back-end:** Todo o código está neste repositório.
- **Execução via n8n:** Importe o arquivo `workflow-n8n.json` no seu n8n local, configure a credencial do Google Gemini e publique o workflow.

# Padronização de Arquitetura e Fluxo de Deploy

Este documento resume a infraestrutura padrão e o fluxo de trabalho utilizado para hospedar, orquestrar e expor aplicações utilizando um ambiente de servidor local de alto desempenho e baixo custo.

## 1. Controle de Versão e Infraestrutura como Código (GitHub)
Todo o código-fonte da aplicação é centralizado em repositórios no GitHub.
A base da infraestrutura é definida por um arquivo `docker-compose.yml` na raiz de cada projeto, que mapeia e orquestra todos os microsserviços necessários para a aplicação funcionar de forma independente.

## 2. Orquestração e Gestão de Containers (Docker + Portainer)
O deploy é gerenciado visualmente através do **Portainer** rodando no servidor local. O fluxo funciona da seguinte maneira:

* **Stacks via Git:** Cada projeto é adicionado como uma "Stack" no Portainer.
* **Pull Direto:** Em vez de uploads manuais, a Stack é configurada para puxar o código diretamente do repositório do GitHub fornecido. O Portainer lê o `docker-compose.yml` e levanta o ambiente.
* **Topologia Padrão de Containers:** Geralmente, uma stack completa é dividida nos seguintes serviços:
    * **Frontend:** Interface da aplicação.
    * **Backend:** API principal.
    * **Banco de Dados:** Instância isolada.
    * **Gerenciamento de DB:** Ferramentas visuais anexadas à rede interna da stack.

## 3. Exposição Externa e Segurança (Cloudflare Tunnels)
Para disponibilizar as aplicações na internet sem expor o IP da rede local ou abrir portas no roteador, a infraestrutura utiliza **Cloudflare Zero Trust (Tunnels)**.

* **Túnel Ativo:** Um daemon do Cloudflare roda no servidor local, estabelecendo uma conexão de saída segura.
* **Roteamento (Public Hostnames):** Cada serviço e painel de controle recebe um subdomínio dedicado sob o domínio principal.
* **Mapeamento de Portas:** O tráfego recebido no subdomínio da Cloudflare é roteado internamente para o IP e a porta específica do container correspondente.

---
**Resumo do Ciclo de Vida:**
`Código (Local)` ➜ `Push para GitHub` ➜ `Portainer atualiza a Stack (Pull)` ➜ `Containers sobem localmente` ➜ `Cloudflare Tunnel roteia o acesso web para a porta do container`.
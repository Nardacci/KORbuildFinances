# KORbuild Finances

Protótipo navegável do KORbuild Finances, orientado à jornada de construção de patrimônio.

## Jornada atual

**Workspace Setup**

1. 👤 Você
2. 💰 Sua primeira conta
3. 💵 Sua primeira receita
4. 🎯 Seu objetivo
5. 📐 Seu primeiro plano

O objetivo do Wizard é configurar o contexto mínimo do usuário antes de apresentar o Dashboard.

## Conceitos do produto

- Objetivo → Estratégia → Planejamento → Vida real → Patrimônio → Evolução → Replanejamento
- Dashboard: objetivo primeiro, patrimônio, evolução e detalhes sob demanda
- Objetivo separado da estratégia
- Investimentos como instrumentos das estratégias
- Orçamento planejado × realizado
- Patrimônio separado do fluxo financeiro
- Cenários sem alterar a realidade
- Valores e premissas exibidos no protótipo são ilustrativos

## Estrutura do protótipo

- `index.html` — entrada e composição da página Workspace Setup
- `styles.css` — estilos compartilhados do protótipo
- `css/wizard.css` — camada visual isolada do Wizard
- `app.js` — estado local, navegação, validações e cálculos do Wizard

A separação da camada do Wizard evita misturar sua apresentação com as futuras páginas do produto.

## Segurança e evolução

Este repositório é atualmente um protótipo UX/fluxo. Não há autenticação real, acesso ao Supabase, dados financeiros produtivos ou motor financeiro de produção.

As informações preenchidas no Wizard são armazenadas apenas no `localStorage` do navegador para permitir a avaliação do fluxo. Nenhum dado é enviado a um servidor nesta etapa.

## Status

**Fase:** Workspace Setup / Onboarding UX

**Próximo marco:** validar visualmente os 5 passos e, somente depois, estruturar Dashboard e demais páginas do produto.

-- Item 4: taxa esperada por investimento, declarada pelo usuário na criação
-- (renda fixa ou variável), mesma unidade/convenção dos 5 cenários da tela
-- de Planejamento (% a.m.). finances.investments está vazia em todo o
-- projeto (confirmado via count(*) antes de aplicar) — sem default nem
-- backfill necessários.
ALTER TABLE finances.investments
  ADD COLUMN expected_monthly_rate numeric NOT NULL;

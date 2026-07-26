-- Valores financeiros precisam de representação decimal exata.
-- ROUND preserva o contrato atual de duas casas durante a conversão.
BEGIN;

ALTER TABLE "Transaction"
ALTER COLUMN "amount" TYPE DECIMAL(14, 2)
USING ROUND("amount"::numeric, 2);

ALTER TABLE "Debt"
ALTER COLUMN "amount" TYPE DECIMAL(14, 2)
USING ROUND("amount"::numeric, 2);

ALTER TABLE "MonthlyClosure"
ALTER COLUMN "totalIncomes" TYPE DECIMAL(14, 2)
USING ROUND("totalIncomes"::numeric, 2),
ALTER COLUMN "totalExpenses" TYPE DECIMAL(14, 2)
USING ROUND("totalExpenses"::numeric, 2),
ALTER COLUMN "balance" TYPE DECIMAL(14, 2)
USING ROUND("balance"::numeric, 2);

COMMIT;

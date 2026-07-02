ALTER TABLE incomes
ADD COLUMN IF NOT EXISTS income_method text;

ALTER TABLE incomes
DROP CONSTRAINT IF EXISTS incomes_income_method_check;

ALTER TABLE incomes
ADD CONSTRAINT incomes_income_method_check
CHECK (
  income_method IN ('pix', 'transfer', 'cash', 'boleto', 'deposit', 'card', 'other')
  OR income_method IS NULL
);

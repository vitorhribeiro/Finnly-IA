ALTER TABLE incomes 
ADD COLUMN income_type text NOT NULL DEFAULT 'variable';

ALTER TABLE incomes 
ADD CONSTRAINT incomes_income_type_check 
CHECK (income_type IN ('fixed', 'variable'));

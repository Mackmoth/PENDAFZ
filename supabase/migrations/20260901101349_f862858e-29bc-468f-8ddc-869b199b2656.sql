ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'UGX';
ALTER TABLE public.organization_settings ALTER COLUMN membership_fee_currency SET DEFAULT 'UGX';
UPDATE public.payments SET currency = 'UGX' WHERE currency = 'KES';
UPDATE public.organization_settings SET membership_fee_currency = 'UGX' WHERE membership_fee_currency = 'KES' OR membership_fee_currency IS NULL;
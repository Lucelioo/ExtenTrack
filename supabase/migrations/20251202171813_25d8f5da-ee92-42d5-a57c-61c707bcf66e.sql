-- Rename phone column to ano_ingresso (year of enrollment)
ALTER TABLE public.estudantes RENAME COLUMN phone TO ano_ingresso;
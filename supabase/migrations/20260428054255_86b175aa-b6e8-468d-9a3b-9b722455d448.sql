CREATE TYPE public.urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
ALTER TABLE public.issues ADD COLUMN urgency public.urgency_level;
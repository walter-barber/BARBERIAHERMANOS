-- App móvil de los barberos (Android e iOS): entran a su perfil con un toque, sin PIN.
-- La app trae una llave propia («app:…») que reemplaza al PIN en cada llamada del portal.
-- Aquí solo se guarda la huella SHA-256 de la llave; la llave está en .env.app (fuera de git).
-- En la web el portal sigue pidiendo el PIN de siempre.
-- Para quitarle el acceso a la app: UPDATE app_access_keys SET active = false WHERE id = 'barberos';

CREATE TABLE IF NOT EXISTS public.app_access_keys (
  id text PRIMARY KEY,
  key_sha256 text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_access_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_access_keys FROM PUBLIC, anon, authenticated;

INSERT INTO public.app_access_keys (id, key_sha256)
VALUES ('barberos', '6805771cae8f675a6124d6582ed84e731e1cef9783f0546aade54575be53e955')
ON CONFLICT (id) DO UPDATE SET key_sha256 = EXCLUDED.key_sha256, active = true;

CREATE OR REPLACE FUNCTION public.barber_authenticate(p_barber_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_barber barbers%ROWTYPE;
BEGIN
  SELECT * INTO v_barber FROM barbers WHERE id = p_barber_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_PIN';
  END IF;
  -- Llave de la app de los barberos: entra sin PIN y sin contar intentos
  IF p_pin LIKE 'app:%' THEN
    IF EXISTS (
      SELECT 1 FROM app_access_keys
      WHERE id = 'barberos' AND active
        AND key_sha256 = encode(digest(substr(p_pin, 5), 'sha256'), 'hex')
    ) THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'INVALID_PIN';
  END IF;
  IF v_barber.pin_locked_until IS NOT NULL AND v_barber.pin_locked_until > now() THEN
    RAISE EXCEPTION 'PIN_LOCKED';
  END IF;
  IF v_barber.pin <> crypt(coalesce(p_pin, ''), v_barber.pin) THEN
    RAISE EXCEPTION 'INVALID_PIN';
  END IF;
  IF v_barber.pin_failed_attempts > 0 THEN
    UPDATE barbers SET pin_failed_attempts = 0, pin_locked_until = NULL WHERE id = p_barber_id;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.barber_authenticate(uuid, text) FROM PUBLIC, anon, authenticated;

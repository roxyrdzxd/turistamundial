-- Corregir is_online para NPCs existentes
-- Los NPCs son jugadores que no tienen una sesión de autenticación válida
-- y por lo tanto nunca deberían estar online

-- Actualizar todos los session_players donde is_online es NULL o no está definido
-- y el user_id no corresponde a un usuario autenticado válido
UPDATE session_players sp
SET is_online = false
WHERE sp.is_online IS NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM auth.users au 
    WHERE au.id = sp.user_id
  );

-- También actualizar session_players donde is_online podría estar en true
-- pero el usuario no existe en auth.users (indicando que es un NPC)
UPDATE session_players sp
SET is_online = false
WHERE sp.is_online = true
  AND NOT EXISTS (
    SELECT 1 
    FROM auth.users au 
    WHERE au.id = sp.user_id
  );


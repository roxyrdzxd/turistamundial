-- Usar URLs publicas de Supabase Storage para que Next/Image cargue las insignias.
UPDATE snake_achievements
SET badge_url = CASE requirement_type
  WHEN 'games_played' THEN 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/snake-badges/snake-first-game.png'
  WHEN 'best_score' THEN 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/snake-badges/snake-rookie.png'
  WHEN 'best_level' THEN 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/snake-badges/snake-level-3.png'
  WHEN 'record_breaker' THEN 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/snake-badges/snake-record-breaker.png'
  WHEN 'weekly_rank' THEN 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/snake-badges/snake-weekly-top-10.png'
  ELSE badge_url
END
WHERE requirement_type IN ('games_played', 'best_score', 'best_level', 'record_breaker', 'weekly_rank');

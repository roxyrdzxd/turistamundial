/**
 * Utilidad para filtrar contenido ofensivo
 */

// Lista de palabras prohibidas (en español)
const BANNED_WORDS = [
  // Palabras ofensivas comunes
  'puto', 'puta', 'marica', 'maricon', 'joto', 'jota',
  'pendejo', 'pendeja', 'idiota', 'imbecil', 'imbécil',
  'cabron', 'cabrón', 'culero', 'culera', 'chinga', 'chingar',
  'verga', 'vergas', 'pinche', 'pinches', 'mamada', 'mamadas',
  'mamón', 'mamona', 'hijo de puta', 'hija de puta',
  'hdp', 'h de p', 'h de la p',
  // Variaciones con números
  'p3nd3j0', '1d10t4', 'm4r1c4', 'p3nd3j4',
  // Otras palabras ofensivas
  'estupido', 'estúpido', 'estupida', 'estúpida',
  'retrasado', 'retrasada', 'tonto', 'tonta',
  'imbecil', 'imbécil', 'imbeciles', 'imbéciles',
  
  // Palabras relacionadas con sexo explícito
  'sexo', 'sexual', 'coito', 'cojer', 'coger', 'follar', 'follando',
  'pene', 'pito', 'polla', 'pollas', 'vagina', 'vaginas', 'vulva',
  'masturbar', 'masturbacion', 'masturbación', 'masturbando',
  'orgasmo', 'orgasmos', 'eyaculacion', 'eyaculación', 'eyaculando',
  'pornografia', 'pornografía', 'porno', 'xxx', 'xxx',
  'prostituta', 'prostitutas', 'prostibulo', 'prostíbulo',
  'escort', 'escorts', 'puteria', 'putería',
  'zoofilia', 'pedofilia', 'necrofilia',
  'violacion', 'violación', 'violar', 'violando',
  'incesto', 'incestuoso',
  
  // Palabras relacionadas con narcotráfico
  'narcotrafico', 'narcotráfico', 'narco', 'narcos',
  'traficante', 'traficantes', 'trafico', 'tráfico',
  'cartel', 'carteles', 'cartel de drogas',
  'sicario', 'sicarios', 'matar', 'matando', 'asesinar', 'asesinato',
  'coca', 'cocaina', 'cocaína', 'coke', 'perico',
  'marihuana', 'marijuana', 'mota', 'hierba', 'weed', 'ganja',
  'heroina', 'heroína', 'heroin', 'chiva',
  'cristal', 'cristal meth', 'metanfetamina', 'anfetamina',
  'lsd', 'acido', 'ácido', 'hongos', 'hongos alucinogenos',
  'mdma', 'extasis', 'éxtasis', 'molly',
  'crack', 'crack cocaine', 'piedra',
  'fentanilo', 'fentanyl', 'opio', 'opioides',
  'drogadicto', 'drogadicta', 'adicto', 'adicta',
  'drogas', 'droga', 'drogado', 'drogada', 'drogandose',
  'inyectar', 'inyeccion', 'inyección', 'inyectando',
  'snort', 'esnifar', 'esnifando', 'fumar', 'fumando',
  'dealer', 'dealers', 'vendedor de drogas',
  'plantacion', 'plantación', 'cultivo de drogas',
  'laboratorio', 'laboratorios', 'cocina de drogas',
  
  // Variaciones y evasiones comunes
  's3x0', 's3xo', 'c0j3r', 'c0jer', 'f0ll4r',
  'p3n3', 'p1t0', 'p0ll4', 'v4g1n4',
  'n4rc0', 'tr4f1c0', 'dr0g4', 'dr0g4s',
  'c0c4', 'c0c41n4', 'm4r1h14n4', 'h3r01n4',
]

/**
 * Normaliza el texto para comparación (elimina acentos, convierte a minúsculas, etc.)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9\s]/g, '') // Elimina caracteres especiales
}

/**
 * Reemplaza caracteres comunes usados para evadir filtros
 */
function replaceEvasionChars(text: string): string {
  return text
    .replace(/[0@]/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[$]/g, 's')
    .replace(/[@]/g, 'a')
    .replace(/[!]/g, 'i')
}

/**
 * Verifica si un texto contiene palabras ofensivas
 */
export function containsProfanity(text: string): boolean {
  if (!text || text.trim().length === 0) return false

  const normalized = normalizeText(text)
  const withoutEvasion = replaceEvasionChars(normalized)
  const words = withoutEvasion.split(/\s+/)

  // Verificar cada palabra contra la lista de palabras prohibidas
  for (const word of words) {
    for (const bannedWord of BANNED_WORDS) {
      if (word.includes(bannedWord) || bannedWord.includes(word)) {
        return true
      }
    }
  }

  // Verificar frases completas
  for (const bannedWord of BANNED_WORDS) {
    if (withoutEvasion.includes(bannedWord)) {
      return true
    }
  }

  return false
}

/**
 * Filtra un texto reemplazando palabras ofensivas con asteriscos
 */
export function filterProfanity(text: string): string {
  if (!text || text.trim().length === 0) return text

  let filtered = text
  const normalized = normalizeText(text)
  const withoutEvasion = replaceEvasionChars(normalized)

  for (const bannedWord of BANNED_WORDS) {
    if (withoutEvasion.includes(bannedWord)) {
      // Crear regex para encontrar la palabra (case insensitive)
      const regex = new RegExp(bannedWord, 'gi')
      filtered = filtered.replace(regex, '*'.repeat(bannedWord.length))
    }
  }

  return filtered
}

/**
 * Valida un nombre de usuario
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'El nombre de usuario no puede estar vacío' }
  }

  if (username.length < 3) {
    return { valid: false, error: 'El nombre de usuario debe tener al menos 3 caracteres' }
  }

  if (username.length > 20) {
    return { valid: false, error: 'El nombre de usuario no puede tener más de 20 caracteres' }
  }

  if (containsProfanity(username)) {
    return { valid: false, error: 'El nombre de usuario contiene palabras no permitidas' }
  }

  return { valid: true }
}

/**
 * Valida un mensaje de chat
 */
export function validateChatMessage(message: string): { valid: boolean; error?: string; filtered?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'El mensaje no puede estar vacío' }
  }

  if (message.length > 500) {
    return { valid: false, error: 'El mensaje no puede tener más de 500 caracteres' }
  }

  if (containsProfanity(message)) {
    // Filtrar el mensaje automáticamente en lugar de rechazarlo
    const filtered = filterProfanity(message)
    return { valid: true, filtered }
  }

  return { valid: true }
}


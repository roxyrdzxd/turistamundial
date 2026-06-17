export type WorldCup2026Country = {
  code: string
  name: string
  flag: string
  group: string
}

export const WORLD_CUP_2026_COUNTRIES: WorldCup2026Country[] = [
  { code: 'MEX', name: 'México', flag: '🇲🇽', group: 'A' },
  { code: 'RSA', name: 'Sudáfrica', flag: '🇿🇦', group: 'A' },
  { code: 'KOR', name: 'Corea del Sur', flag: '🇰🇷', group: 'A' },
  { code: 'CZE', name: 'Chequia', flag: '🇨🇿', group: 'A' },
  { code: 'CAN', name: 'Canadá', flag: '🇨🇦', group: 'B' },
  { code: 'BIH', name: 'Bosnia y Herzegovina', flag: '🇧🇦', group: 'B' },
  { code: 'QAT', name: 'Catar', flag: '🇶🇦', group: 'B' },
  { code: 'SUI', name: 'Suiza', flag: '🇨🇭', group: 'B' },
  { code: 'BRA', name: 'Brasil', flag: '🇧🇷', group: 'C' },
  { code: 'MAR', name: 'Marruecos', flag: '🇲🇦', group: 'C' },
  { code: 'HAI', name: 'Haití', flag: '🇭🇹', group: 'C' },
  { code: 'SCO', name: 'Escocia', flag: '🏴', group: 'C' },
  { code: 'USA', name: 'Estados Unidos', flag: '🇺🇸', group: 'D' },
  { code: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'D' },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺', group: 'D' },
  { code: 'TUR', name: 'Turquía', flag: '🇹🇷', group: 'D' },
  { code: 'GER', name: 'Alemania', flag: '🇩🇪', group: 'E' },
  { code: 'CUW', name: 'Curazao', flag: '🇨🇼', group: 'E' },
  { code: 'CIV', name: 'Costa de Marfil', flag: '🇨🇮', group: 'E' },
  { code: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'E' },
  { code: 'NED', name: 'Países Bajos', flag: '🇳🇱', group: 'F' },
  { code: 'JPN', name: 'Japón', flag: '🇯🇵', group: 'F' },
  { code: 'SWE', name: 'Suecia', flag: '🇸🇪', group: 'F' },
  { code: 'TUN', name: 'Túnez', flag: '🇹🇳', group: 'F' },
  { code: 'BEL', name: 'Bélgica', flag: '🇧🇪', group: 'G' },
  { code: 'EGY', name: 'Egipto', flag: '🇪🇬', group: 'G' },
  { code: 'IRN', name: 'Irán', flag: '🇮🇷', group: 'G' },
  { code: 'NZL', name: 'Nueva Zelanda', flag: '🇳🇿', group: 'G' },
  { code: 'ESP', name: 'España', flag: '🇪🇸', group: 'H' },
  { code: 'CPV', name: 'Cabo Verde', flag: '🇨🇻', group: 'H' },
  { code: 'KSA', name: 'Arabia Saudita', flag: '🇸🇦', group: 'H' },
  { code: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'H' },
  { code: 'FRA', name: 'France', flag: '🇫🇷', group: 'I' },
  { code: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'I' },
  { code: 'IRQ', name: 'Irak', flag: '🇮🇶', group: 'I' },
  { code: 'NOR', name: 'Norway', flag: '🇳🇴', group: 'I' },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'J' },
  { code: 'ALG', name: 'Argelia', flag: '🇩🇿', group: 'J' },
  { code: 'AUT', name: 'Austria', flag: '🇦🇹', group: 'J' },
  { code: 'JOR', name: 'Jordania', flag: '🇯🇴', group: 'J' },
  { code: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'K' },
  { code: 'COD', name: 'RD Congo', flag: '🇨🇩', group: 'K' },
  { code: 'UZB', name: 'Uzbekistán', flag: '🇺🇿', group: 'K' },
  { code: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'K' },
  { code: 'ENG', name: 'Inglaterra', flag: '🏴', group: 'L' },
  { code: 'CRO', name: 'Croacia', flag: '🇭🇷', group: 'L' },
  { code: 'GHA', name: 'Ghana', flag: '🇬🇭', group: 'L' },
  { code: 'PAN', name: 'Panamá', flag: '🇵🇦', group: 'L' },
]

export const WORLD_CUP_2026_COUNTRY_CODES = WORLD_CUP_2026_COUNTRIES.map((country) => country.code)

export function getWorldCup2026Country(code?: string | null) {
  if (!code) return null
  return WORLD_CUP_2026_COUNTRIES.find((country) => country.code === code) || null
}

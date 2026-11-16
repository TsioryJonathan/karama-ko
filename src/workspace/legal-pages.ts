export const LEGAL_PAGES = [
  { id: 'mentions-legales', title: 'Mentions légales' },
  { id: 'confidentialite', title: 'Confidentialité' },
  { id: 'cookies', title: 'Cookies et stockage local' },
  { id: 'conditions', title: 'Conditions d’utilisation' },
  { id: 'accessibilite', title: 'Accessibilité' },
  { id: 'licence', title: 'Licence' },
] as const
export type LegalId = (typeof LEGAL_PAGES)[number]['id']
export const isLegalId = (id: string): id is LegalId => LEGAL_PAGES.some((page) => page.id === id)

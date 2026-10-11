//? Documents légaux du site. Leur texte (markdown) est tenu à jour sur le CDN, hors du dépôt : le
//? modifier ne demande pas de redéployer.
export const LEGAL_DOCUMENTS = {
  'legal-notice': {
    title: 'Mentions légales',
    url: 'https://cdn.f95france.site/raw/legal-notice.md',
  },
  'privacy-policy': {
    title: 'Politique de confidentialité',
    url: 'https://cdn.f95france.site/raw/privacy-policy.md',
  },
} as const;

export type LegalDocumentId = keyof typeof LEGAL_DOCUMENTS;

export const isLegalDocumentId = (value: string): value is LegalDocumentId =>
  value in LEGAL_DOCUMENTS;

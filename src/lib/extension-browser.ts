//? L'extension se télécharge sous deux formes : un fichier .xpi pour Firefox, une archive .zip pour
//? Chrome et ses dérivés. On propose celle du navigateur du visiteur.
export type ExtensionBrowserTarget = 'firefox' | 'chromium' | 'unknown';

export interface ExtensionDownloadUrls {
  //? Page de la dernière version, avec tous ses fichiers.
  page: string;
  firefox: string;
  chromium: string;
}

export const detectExtensionBrowserTarget = (
  userAgent: string | null | undefined,
): ExtensionBrowserTarget => {
  const ua = userAgent ?? '';

  //? Firefox et ses dérivés (Zen, Waterfox…) s'annoncent tous comme Firefox.
  if (/Firefox\//i.test(ua) && !/Seamonkey/i.test(ua)) return 'firefox';
  //? Chrome, Edge, Opera, Brave : tous annoncent « Chrome/ ».
  if (/Chrome\/|Chromium\/|Edg\/|OPR\//i.test(ua)) return 'chromium';

  return 'unknown';
};

export const extensionDownloadHref = (
  target: ExtensionBrowserTarget,
  urls: ExtensionDownloadUrls,
) => (target === 'unknown' ? urls.page : urls[target]);

export const extensionDownloadLabel = (target: ExtensionBrowserTarget) => {
  switch (target) {
    case 'firefox':
      return 'Télécharger pour Firefox';
    case 'chromium':
      return 'Télécharger pour Chrome';
    default:
      return "Télécharger l'extension";
  }
};

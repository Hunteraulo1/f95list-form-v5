// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: import('$lib/server/hooks/auth').SessionUser | null;
      //? Renseigné uniquement pour une requête authentifiée par clé API (`Bearer f95_…`).
      apiKey?: { id: string; userId: string };
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};

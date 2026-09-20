//? Soumet un formulaire de la page par son id, comme un clic sur son bouton : `use:enhance` (et
//? sa confirmation éventuelle) s'appliquent. Sert aux menus, dont les entrées déclenchent les
//? formulaires cachés de leur ligne.
export const submitForm = (id: string) =>
  document.querySelector<HTMLFormElement>(`form[id="${id}"]`)?.requestSubmit();

import { Migration } from '@mikro-orm/migrations';

//? « Gérer les jeux » (manage.game) est scindée : créer, modifier, ajouter des traductions, et
//? modifier celles des autres. Les rôles qui l'avaient reçoivent les quatre nouvelles permissions,
//? donc rien ne change pour eux ; le rôle traducteur reçoit celle d'ajouter des traductions.
const NEW_PERMISSIONS = [
  'game.create',
  'game.edit',
  'translation.add',
  'translation.edit_others',
];

export class Migration20260920200000_split_game_permissions extends Migration {
  override name = 'Migration20260920200000_split_game_permissions';

  private async grant(roleId: string, permissions: string[]) {
    for (const permission of permissions) {
      await this.execute(
        'insert ignore into `role_permission` (`role_id`, `permission`) values (?, ?)',
        [roleId, permission],
      );
    }
  }

  override async up(): Promise<void> {
    const holders = await this.execute(
      "select distinct role_id as roleId from role_permission where permission = 'manage.game'",
    );

    for (const { roleId } of holders) await this.grant(roleId, NEW_PERMISSIONS);

    await this.execute(
      "delete from `role_permission` where `permission` = 'manage.game'",
    );

    const [translator] = await this.execute(
      "select id from `role` where `name` = 'translator'",
    );
    if (translator) await this.grant(translator.id, ['translation.add']);
  }

  override async down(): Promise<void> {
    const holders = await this.execute(
      "select distinct role_id as roleId from role_permission where permission = 'game.edit'",
    );

    for (const { roleId } of holders) await this.grant(roleId, ['manage.game']);

    await this.execute(
      `delete from \`role_permission\` where \`permission\` in (${NEW_PERMISSIONS.map(() => '?').join(', ')})`,
      NEW_PERMISSIONS,
    );
  }
}

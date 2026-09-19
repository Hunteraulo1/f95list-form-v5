import { Migration } from '@mikro-orm/migrations';

export class Migration20260919124539_make_game_translation_type_not_null extends Migration {
  override name = 'Migration20260919124539_make_game_translation_type_not_null';

  override up(): void | Promise<void> {
    this.addSql(
      `update \`game_translation\` set \`type\` = 'translation' where \`type\` is null;`,
    );
    this.addSql(
      `alter table \`game_translation\` modify \`type\` enum('no_translation','integrated','translation','translation_with_mods','mods') not null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`game_translation\` modify \`type\` enum('no_translation','integrated','translation','translation_with_mods','mods') null;`,
    );
  }
}

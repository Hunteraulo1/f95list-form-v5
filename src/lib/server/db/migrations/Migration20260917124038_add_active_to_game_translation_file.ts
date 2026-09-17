import { Migration } from '@mikro-orm/migrations';

export class Migration20260917124038_add_active_to_game_translation_file extends Migration {

  override name = 'Migration20260917124038_add_active_to_game_translation_file';

  override up(): void | Promise<void> {
    this.addSql(`alter table \`game_translation_file\` add \`active\` tinyint(1) not null default true;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table \`game_translation_file\` drop column \`active\`;`);
  }

}

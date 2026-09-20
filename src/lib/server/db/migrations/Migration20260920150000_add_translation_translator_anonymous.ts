import { Migration } from '@mikro-orm/migrations';

export class Migration20260920150000_add_translation_translator_anonymous extends Migration {
  override name =
    'Migration20260920150000_add_translation_translator_anonymous';

  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`game_translation_translator\` add \`anonymous\` tinyint(1) not null default false;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`game_translation_translator\` drop column \`anonymous\`;`,
    );
  }
}

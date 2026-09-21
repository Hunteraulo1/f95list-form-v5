import { Migration } from '@mikro-orm/migrations';
import { F95_TAG_ID_BY_NAME } from '../f95-tag-ids';

//? `active` : faux pour les tags à classer, c'est-à-dire sans id F95Checker et absents du dictionnaire
//? `F95_TAG_ID_BY_NAME` (les tags mappés sur `0`, sans équivalent chez F95zone, restent actifs).
export class Migration20260921160000_add_game_tags_active extends Migration {
  override name = 'Migration20260921160000_add_game_tags_active';

  override async up(): Promise<void> {
    await this.execute(
      'alter table `game_tags` add column if not exists `active` tinyint(1) not null default true',
    );

    const known = Object.keys(F95_TAG_ID_BY_NAME);
    await this.execute(
      `update \`game_tags\` set \`active\` = false where \`f95_id\` is null and \`name\` not in (${known.map(() => '?').join(', ')})`,
      known,
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      'alter table `game_tags` drop column if exists `active`',
    );
  }
}

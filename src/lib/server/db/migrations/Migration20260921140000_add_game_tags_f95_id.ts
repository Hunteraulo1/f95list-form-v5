import { Migration } from '@mikro-orm/migrations';

//? Identifiant F95Checker d'un tag : permet au scraper de rattacher les tags d'un thread sans passer
//? par une correspondance sur le nom. Nul pour les tags qui n'en ont pas (unique : plusieurs NULL permis).
export class Migration20260921140000_add_game_tags_f95_id extends Migration {
  override name = 'Migration20260921140000_add_game_tags_f95_id';

  override async up(): Promise<void> {
    await this.execute(
      'alter table `game_tags` add column if not exists `f95_id` smallint unsigned null, add unique `game_tags_f95_id_unique` (`f95_id`)',
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      'alter table `game_tags` drop index if exists `game_tags_f95_id_unique`, drop column if exists `f95_id`',
    );
  }
}

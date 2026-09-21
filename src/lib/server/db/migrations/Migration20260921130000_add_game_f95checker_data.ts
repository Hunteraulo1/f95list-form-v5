import { Migration } from '@mikro-orm/migrations';

//? Données du jeu récupérées via l'API de F95Checker (scraper), en complément de `last_change`.
export class Migration20260921130000_add_game_f95checker_data extends Migration {
  override name = 'Migration20260921130000_add_game_f95checker_data';

  override async up(): Promise<void> {
    await this.execute(
      'alter table `game` add column if not exists `developer` varchar(255) null, add column if not exists `last_updated` datetime null, add column if not exists `score` decimal(3,2) null, add column if not exists `votes` int unsigned null, add column if not exists `downloads` json null, add column if not exists `reviews` json null',
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      'alter table `game` drop column if exists `developer`, drop column if exists `last_updated`, drop column if exists `score`, drop column if exists `votes`, drop column if exists `downloads`, drop column if exists `reviews`',
    );
  }
}

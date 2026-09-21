import { Migration } from '@mikro-orm/migrations';

//? Timestamp du dernier changement connu par l'API de F95Checker (scraper) : nul tant que le jeu
//? n'a jamais été synchronisé, ce qui force un premier `/full`.
export class Migration20260921120000_add_game_last_change extends Migration {
  override name = 'Migration20260921120000_add_game_last_change';

  override async up(): Promise<void> {
    await this.execute(
      'alter table `game` add column if not exists `last_change` int unsigned null',
    );
  }

  override async down(): Promise<void> {
    await this.execute('alter table `game` drop column if exists `last_change`');
  }
}

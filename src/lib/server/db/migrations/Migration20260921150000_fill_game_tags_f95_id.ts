import { Migration } from '@mikro-orm/migrations';
import { F95_TAGS } from '../f95-tags';

//? Renseigne `game_tags.f95_id` : correspondance id F95Checker → nom du tag, reprise de l'enum `Tag`
//? de F95Checker (common/structs.py, GPLv3). Un tag déjà présent (même nom, sans tenir compte de la
//? casse) reçoit l'id, sur sa ligne la plus ancienne car `f95_id` est unique ; un tag absent est créé.
//? Les tags de la v4 sans équivalent chez F95 gardent un `f95_id` nul. La liste est dans `../f95-tags`.
export class Migration20260921150000_fill_game_tags_f95_id extends Migration {
  override name = 'Migration20260921150000_fill_game_tags_f95_id';

  override async up(): Promise<void> {
    for (const [id, name] of F95_TAGS) {
      await this.execute(
        'update `game_tags` set `f95_id` = ? where `id` = (select `id` from (select min(`id`) as `id` from `game_tags` where `name` = ?) as `oldest`) and `f95_id` is null',
        [id, name],
      );
      await this.execute(
        'insert into `game_tags` (`name`, `f95_id`) select ?, ? from dual where not exists (select 1 from `game_tags` where `name` = ?)',
        [name, id, name],
      );
    }
  }

  //? Les tags créés par `up` restent : rien ne les distingue d'un tag ajouté ensuite à la main.
  override async down(): Promise<void> {
    await this.execute('update `game_tags` set `f95_id` = null');
  }
}

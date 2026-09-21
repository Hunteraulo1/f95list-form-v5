import { Migration } from '@mikro-orm/migrations';
import { F95_TAG_ID_BY_NAME } from '../f95-tag-ids';

//? Lie les tags aux tags de F95zone au lieu de les fusionner : `game_tags.f95_tag_id` pointe un tag F95zone,
//? et `game.tags_f95` est la version filtrée des tags d'un jeu (ids F95Checker). Les liens de départ viennent
//? du dictionnaire `F95_TAG_ID_BY_NAME` ; ils se corrigent ensuite sur /admin/tags.
export class Migration20260921180000_add_game_tags_f95 extends Migration {
  override name = 'Migration20260921180000_add_game_tags_f95';

  override async up(): Promise<void> {
    await this.execute(
      'alter table `game_tags` add column if not exists `f95_tag_id` mediumint unsigned null, add constraint `game_tags_f95_tag_fk` foreign key (`f95_tag_id`) references `game_tags` (`id`) on update restrict on delete set null',
    );
    await this.execute(
      'alter table `game` add column if not exists `tags_f95` json null',
    );

    for (const [name, f95Id] of Object.entries(F95_TAG_ID_BY_NAME)) {
      if (f95Id === 0) continue;

      await this.execute(
        'update `game_tags` `t` join `game_tags` `f` on `f`.`f95_id` = ? set `t`.`f95_tag_id` = `f`.`id` where `t`.`f95_id` is null and `t`.`f95_tag_id` is null and `t`.`name` = ?',
        [f95Id, name],
      );
    }

    await this.execute(
      'update `game` `g` set `g`.`tags_f95` = coalesce((select json_arrayagg(distinct coalesce(`t`.`f95_id`, `l`.`f95_id`) order by coalesce(`t`.`f95_id`, `l`.`f95_id`)) from `game_game_tags` `gt` join `game_tags` `t` on `t`.`id` = `gt`.`game_tag_id` left join `game_tags` `l` on `l`.`id` = `t`.`f95_tag_id` where `gt`.`game_id` = `g`.`id` and coalesce(`t`.`f95_id`, `l`.`f95_id`) is not null), json_array())',
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      'alter table `game_tags` drop foreign key `game_tags_f95_tag_fk`',
    );
    await this.execute(
      'alter table `game_tags` drop column if exists `f95_tag_id`',
    );
    await this.execute('alter table `game` drop column if exists `tags_f95`');
  }
}

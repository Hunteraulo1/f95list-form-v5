import { Migration } from '@mikro-orm/migrations';
import { SlugAllocator } from '../../../slug';

//? Ajoute l'adresse de profil de chaque compte. Les slugs existants sont fabriqués depuis les
//? noms, du plus ancien compte au plus récent : en cas de collision, le plus ancien garde le slug
//? simple et les suivants reçoivent un suffixe (-2, -3…).
export class Migration20260920190000_add_user_slug extends Migration {
  override name = 'Migration20260920190000_add_user_slug';

  override async up(): Promise<void> {
    await this.execute('alter table `user` add `slug` varchar(64) null');

    const users = await this.execute(
      'select id, name from `user` order by created_at, id',
    );
    const allocator = new SlugAllocator();

    for (const user of users) {
      await this.execute('update `user` set `slug` = ? where `id` = ?', [
        allocator.allocate(user.name),
        user.id,
      ]);
    }

    const [{ missing }] = await this.execute(
      'select count(*) as missing from `user` where `slug` is null',
    );
    if (Number(missing) > 0) {
      throw new Error(`${missing} compte(s) sans slug après le remplissage.`);
    }

    await this.execute('alter table `user` modify `slug` varchar(64) not null');
    await this.execute(
      'alter table `user` add unique `user_slug_unique` (`slug`)',
    );
  }

  override async down(): Promise<void> {
    await this.execute('alter table `user` drop index `user_slug_unique`');
    await this.execute('alter table `user` drop column `slug`');
  }
}

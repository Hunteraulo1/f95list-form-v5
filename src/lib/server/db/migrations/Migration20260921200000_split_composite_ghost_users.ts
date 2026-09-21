import { Migration } from '@mikro-orm/migrations';
import { splitCompositeGhostUsers } from '../split-composite-users';

//? Découpe les comptes fantômes hérités de la v4 qui désignent plusieurs personnes (voir
//? `splitCompositeGhostUsers`). Irréversible : restaurer la sauvegarde pour revenir en arrière.
export class Migration20260921200000_split_composite_ghost_users extends Migration {
  override name = 'Migration20260921200000_split_composite_ghost_users';

  override async up(): Promise<void> {
    await splitCompositeGhostUsers((sql, params) => this.execute(sql, params));
  }

  override async down(): Promise<void> {
    throw new Error(
      'Migration irréversible : restaurer la sauvegarde pour revenir en arrière.',
    );
  }
}

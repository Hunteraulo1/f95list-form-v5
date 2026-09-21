import { Migration } from '@mikro-orm/migrations';
import { splitCompositeGhostUsers } from '../split-composite-users';

//? Rejoue la découpe des comptes fantômes composites avec la règle étendue « A (Avec la participation de
//? B) » (voir `splitCompositeGhostUsers`) : sans effet sur ceux déjà découpés. Irréversible : restaurer la sauvegarde pour revenir en arrière.
export class Migration20260921210000_split_participation_ghost_users extends Migration {
  override name = 'Migration20260921210000_split_participation_ghost_users';

  override async up(): Promise<void> {
    await splitCompositeGhostUsers((sql, params) => this.execute(sql, params));
  }

  override async down(): Promise<void> {
    throw new Error(
      'Migration irréversible : restaurer la sauvegarde pour revenir en arrière.',
    );
  }
}

import { Migration } from '@mikro-orm/migrations';

//? Trace de l'acceptation des règles du traducteur (formulaire « Devenir traducteur ») : la date, et la
//? version des règles acceptées, pour pouvoir redemander quand elles changent.
export class Migration20260921190000_add_user_translator_rules extends Migration {
  override name = 'Migration20260921190000_add_user_translator_rules';

  override async up(): Promise<void> {
    await this.execute(
      'alter table `user` add column if not exists `translator_rules_accepted_at` datetime null, add column if not exists `translator_rules_version` smallint unsigned null',
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      'alter table `user` drop column if exists `translator_rules_accepted_at`, drop column if exists `translator_rules_version`',
    );
  }
}

import { Migration } from '@mikro-orm/migrations';

export class Migration20260920090736_add_role_hierarchy extends Migration {
  override name = 'Migration20260920090736_add_role_hierarchy';

  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`role\` add \`description\` text null, add \`priority\` int unsigned not null default 0, add \`is_system\` tinyint(1) not null default false;`,
    );
    this.addSql(
      `alter table \`role\` add unique \`role_name_unique\` (\`name\`);`,
    );

    //? Les 5 rôles d'origine sont des rôles système, classés du plus faible au plus fort.
    this.addSql(
      `update \`role\` set \`is_system\` = true, \`priority\` = case \`name\` when 'user' then 0 when 'author' then 20 when 'translator' then 40 when 'moderator' then 60 when 'admin' then 100 end where \`name\` in ('user', 'author', 'translator', 'moderator', 'admin');`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table \`role\` drop index \`role_name_unique\`;`);
    this.addSql(
      `alter table \`role\` drop column \`description\`, drop column \`priority\`, drop column \`is_system\`;`,
    );
  }
}

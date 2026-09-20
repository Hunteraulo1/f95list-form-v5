import { Migration } from '@mikro-orm/migrations';

export class Migration20260920085307_add_role_permission extends Migration {
  override name = 'Migration20260920085307_add_role_permission';

  override up(): void | Promise<void> {
    this.addSql(
      `create table \`role_permission\` (\`role_id\` char(36) not null, \`permission\` varchar(64) not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`role_id\`, \`permission\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`role_permission\` add index \`role_permission_role_id_index\` (\`role_id\`);`,
    );
    this.addSql(
      `alter table \`role_permission\` add constraint \`role_permission_role_id_role_id_fkey\` foreign key (\`role_id\`) references \`role\` (\`id\`) on update restrict on delete cascade;`,
    );

    //? Le rôle « admin » a toutes les permissions sans ligne ici. Par défaut, les modérateurs
    //? reçoivent l'accès à l'administration et la gestion des jeux, rien de plus.
    this.addSql(
      `insert into \`role_permission\` (\`role_id\`, \`permission\`) select \`id\`, 'admin.access' from \`role\` where \`name\` = 'moderator';`,
    );
    this.addSql(
      `insert into \`role_permission\` (\`role_id\`, \`permission\`) select \`id\`, 'manage.game' from \`role\` where \`name\` = 'moderator';`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`role_permission\`;`);
  }
}

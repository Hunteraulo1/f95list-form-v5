import { Migration } from '@mikro-orm/migrations';

export class Migration20260920170000_add_impersonation extends Migration {
  override name = 'Migration20260920170000_add_impersonation';

  override up(): void | Promise<void> {
    this.addSql(
      `create table \`impersonation\` (\`user_id\` char(36) not null, \`target_id\` char(36) not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`user_id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`impersonation\` add index \`impersonation_user_id_index\` (\`user_id\`);`,
    );
    this.addSql(
      `alter table \`impersonation\` add index \`impersonation_target_id_index\` (\`target_id\`);`,
    );
    this.addSql(
      `alter table \`impersonation\` add constraint \`impersonation_user_id_user_id_fkey\` foreign key (\`user_id\`) references \`user\` (\`id\`) on update restrict on delete cascade;`,
    );
    this.addSql(
      `alter table \`impersonation\` add constraint \`impersonation_target_id_user_id_fkey\` foreign key (\`target_id\`) references \`user\` (\`id\`) on update restrict on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`impersonation\`;`);
  }
}

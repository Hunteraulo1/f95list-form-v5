import { Migration } from '@mikro-orm/migrations';

export class Migration20261011120000_add_session extends Migration {
  override name = 'Migration20261011120000_add_session';

  override up(): void | Promise<void> {
    this.addSql(
      `create table \`session\` (\`id\` varchar(64) not null, \`user_id\` char(36) not null, \`id_token\` text null, \`access_token\` text null, \`refresh_token\` text null, \`access_token_expires_at\` datetime null, \`expires_at\` datetime not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`session\` add index \`session_user_id_index\` (\`user_id\`);`,
    );
    this.addSql(
      `alter table \`session\` add constraint \`session_user_id_user_id_fkey\` foreign key (\`user_id\`) references \`user\` (\`id\`) on update restrict on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`session\`;`);
  }
}

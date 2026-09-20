import { Migration } from '@mikro-orm/migrations';

export class Migration20260920082154_add_api_key extends Migration {
  override name = 'Migration20260920082154_add_api_key';

  override up(): void | Promise<void> {
    this.addSql(
      `create table \`api_key\` (\`id\` char(36) not null, \`user_id\` char(36) not null, \`name\` varchar(64) not null, \`prefix\` varchar(16) not null, \`hash\` varchar(64) not null, \`last_used_at\` datetime null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`api_key\` add index \`api_key_user_id_index\` (\`user_id\`);`,
    );
    this.addSql(
      `alter table \`api_key\` add unique \`api_key_hash_unique\` (\`hash\`);`,
    );
    this.addSql(
      `alter table \`api_key\` add constraint \`api_key_user_id_user_id_fkey\` foreign key (\`user_id\`) references \`user\` (\`id\`) on update restrict on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`api_key\`;`);
  }
}

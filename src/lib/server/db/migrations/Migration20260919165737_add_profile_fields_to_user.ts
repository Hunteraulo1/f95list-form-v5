import { Migration } from '@mikro-orm/migrations';

export class Migration20260919165737_add_profile_fields_to_user extends Migration {
  override name = 'Migration20260919165737_add_profile_fields_to_user';

  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`user\` add \`name\` varchar(64) not null, add \`email\` varchar(128) not null, add \`description\` text null, add \`avatar\` varchar(2048) null, add \`banner\` varchar(2048) null, add \`discord\` varchar(32) null, add \`theme\` enum('system','light','dark') not null default 'system';`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`user\` drop column \`name\`, drop column \`email\`, drop column \`description\`, drop column \`avatar\`, drop column \`banner\`, drop column \`discord\`, drop column \`theme\`;`,
    );
  }
}

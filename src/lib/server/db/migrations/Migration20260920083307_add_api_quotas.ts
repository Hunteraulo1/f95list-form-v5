import { Migration } from '@mikro-orm/migrations';

export class Migration20260920083307_add_api_quotas extends Migration {
  override name = 'Migration20260920083307_add_api_quotas';

  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`role\` add \`api_key_limit\` int unsigned not null default 10, add \`api_daily_quota\` int unsigned not null default 1000;`,
    );
    this.addSql(
      `alter table \`api_key\` add \`daily_quota\` int unsigned null, add \`usage_count\` int unsigned not null default 0, add \`usage_date\` date null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`api_key\` drop column \`daily_quota\`, drop column \`usage_count\`, drop column \`usage_date\`;`,
    );
    this.addSql(
      `alter table \`role\` drop column \`api_key_limit\`, drop column \`api_daily_quota\`;`,
    );
  }
}

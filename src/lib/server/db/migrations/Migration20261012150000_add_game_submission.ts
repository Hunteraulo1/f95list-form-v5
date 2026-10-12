import { Migration } from '@mikro-orm/migrations';

//? Soumissions de jeux (table `game_submission`, voir `$lib/server/game-submission`) : un jeu d'un
//? site autre que F95zone, proposé sans le droit de modifier les jeux, attend d'être accepté.
export class Migration20261012150000_add_game_submission extends Migration {
  override name = 'Migration20261012150000_add_game_submission';

  override async up(): Promise<void> {
    this.addSql(
      `create table \`game_submission\` (\`id\` char(36) not null, \`user_id\` char(36) not null, \`reviewed_by_id\` char(36) null, \`status\` enum('pending', 'accepted', 'rejected') not null, \`data\` json not null, \`game_id\` mediumint unsigned null, \`note\` varchar(500) null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`game_submission\` add index \`game_submission_status_index\` (\`status\`);`,
    );
    this.addSql(
      `alter table \`game_submission\` add constraint \`game_submission_user_id_user_id_fkey\` foreign key (\`user_id\`) references \`user\` (\`id\`) on update restrict on delete cascade;`,
    );
    this.addSql(
      `alter table \`game_submission\` add constraint \`game_submission_reviewed_by_id_user_id_fkey\` foreign key (\`reviewed_by_id\`) references \`user\` (\`id\`) on update restrict on delete set null;`,
    );
    this.addSql(
      `alter table \`game_submission\` add constraint \`game_submission_game_id_game_id_fkey\` foreign key (\`game_id\`) references \`game\` (\`id\`) on update restrict on delete set null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`game_submission\`;`);
  }
}

import { MikroORM } from '@mikro-orm/mariadb';
import mikroOrmConfig from '../../../../mikro-orm.config';

export const orm = await MikroORM.init(mikroOrmConfig);

export * from './entities';

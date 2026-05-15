import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

config({ path: resolve(process.cwd(), '.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASS || ''),
  database: process.env.DB_NAME || 'postgres',
  schema: "task_service",
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/db/migrations/*.js'],
  migrationsTableName: 'migrations',
  migrationsRun: false,
  synchronize: false,
  logging: process.env.ENV !== 'production',
  extra: {
    connectionLimit: 10,
  },
};

const dataSource = new DataSource(dataSourceOptions);

dataSource.initialize()

export default dataSource;
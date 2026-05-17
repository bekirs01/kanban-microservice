import { config } from 'dotenv';
import { existsSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

config({ path: resolve(process.cwd(), '.env') });

function datasourcePackageRoot(): string {
  const fromNpm = process.env.npm_package_json;
  if (fromNpm && existsSync(fromNpm)) {
    return dirname(fromNpm);
  }
  const parent = dirname(__dirname);
  return basename(parent) === 'dist' ? dirname(parent) : parent;
}

function typeormArtifactMode(): 'source' | 'dist' {
  if (process.env.TYPEORM_USE_TS === '1') {
    return 'source';
  }
  if (process.env.TYPEORM_USE_TS === '0') {
    return 'dist';
  }
  return process.env.NODE_ENV !== 'production' ? 'source' : 'dist';
}

const dbSsl =
  process.env.DB_SSL === "true" || process.env.DB_SSL === "1";

const packageRoot = datasourcePackageRoot();
const artifacts = typeormArtifactMode();

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASS || ''),
  database: process.env.DB_NAME || 'postgres',
  ssl: dbSsl ? { rejectUnauthorized: false } : false,
  schema: "auth_service",
  entities:
    artifacts === "source"
      ? [join(packageRoot, "src/**/*.entity.ts")]
      : [join(packageRoot, "dist/**/*.entity.js")],
  migrations:
    artifacts === "source"
      ? [join(packageRoot, "db/migrations/*.ts")]
      : [join(packageRoot, "dist/db/migrations/*.js")],
  migrationsTableName: 'migrations',
  migrationsRun: false,
  synchronize: process.env.TYPEORM_SYNC === "true",
  logging: process.env.NODE_ENV !== 'production',
  extra: {
    connectionLimit: 10,
  },
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

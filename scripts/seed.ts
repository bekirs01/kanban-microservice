import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'challenge_db',
  synchronize: false,
  logging: false,
});

async function seed() {
  console.log('🌱 Iniciando Seed do Banco de Dados...');

  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();

    console.log('🧹 Limpando tabelas antigas...');
    await queryRunner.query(`TRUNCATE TABLE "task_service"."comments" CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE "task_service"."tasks" CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE "auth_service"."users" CASCADE`);

    console.log('👤 Criando Usuários...');

    const passwordHash = await bcrypt.hash('123456', 10);

    const users = await Promise.all([
      queryRunner.query(
        `INSERT INTO "auth_service"."users" (email, username, "passwordHash") VALUES ($1, $2, $3) RETURNING id`,
        ['admin@jungle.gg', 'Admin', passwordHash]
      ),
      queryRunner.query(
        `INSERT INTO "auth_service"."users" (email, username, "passwordHash") VALUES ($1, $2, $3) RETURNING id`,
        ['thiago@jungle.gg', 'ThiagoDev', passwordHash]
      ),
      queryRunner.query(
        `INSERT INTO "auth_service"."users" (email, username, "passwordHash") VALUES ($1, $2, $3) RETURNING id`,
        ['ana@jungle.gg', 'AnaManager', passwordHash]
      ),
    ]);



    const adminId = users[0][0].id;
    const thiagoId = users[1][0].id;
    const anaId = users[2][0].id;

    console.log(`✅ 3 Usuários criados! (Senha padrão: 123456)`);

    console.log('📝 Criando Tarefas...');

    const tasks = await Promise.all([
      queryRunner.query(
        `INSERT INTO "task_service"."tasks" (title, description, status, priority, "creatorId", "deadline") 
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '2 days') RETURNING id`,
        ['Configurar Pipeline CI/CD', 'Criar actions para deploy automático.', 'DONE', 'HIGH', adminId]
      ),
      queryRunner.query(
        `INSERT INTO "task_service"."tasks" (title, description, status, priority, "creatorId", "deadline") 
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '5 days') RETURNING id`,
        ['Desenvolver Seed Script', 'Popular o banco para testes.', 'IN_PROGRESS', 'URGENT', thiagoId]
      ),
      queryRunner.query(
        `INSERT INTO "task_service"."tasks" (title, description, status, priority, "creatorId", "deadline") 
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days') RETURNING id`,
        ['Revisar Documentação', 'Garantir que o README está perfeito.', 'TODO', 'MEDIUM', anaId]
      ),
      queryRunner.query(
        `INSERT INTO "task_service"."tasks" (title, description, status, priority, "creatorId", "deadline") 
         VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '10 days') RETURNING id`,
        ['Otimizar Queries', 'Melhorar performance do dashboard.', 'TODO', 'LOW', thiagoId]
      )
    ]);

    const taskId1 = tasks[0][0].id;
    const taskId2 = tasks[1][0].id;



    console.log(`✅ 4 Tarefas criadas!`);

    console.log('💬 Adicionando Comentários...');

    await queryRunner.query(
      `INSERT INTO "task_service"."comments" (content, "taskId", "authorId") VALUES ($1, $2, $3)`,
      ['Ótimo trabalho nisso!', taskId1, anaId]
    );
    await queryRunner.query(
      `INSERT INTO "task_service"."comments" (content, "taskId", "authorId") VALUES ($1, $2, $3)`,
      ['Já finalizei a estrutura básica.', taskId2, thiagoId]
    );

    console.log(`✅ Comentários adicionados!`);

    await dataSource.destroy();
    console.log('🌱 Seed concluído com sucesso! 🚀');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro ao rodar seed:', error);
    if (dataSource.isInitialized) await dataSource.destroy();
    process.exit(1);
  }
}

seed();
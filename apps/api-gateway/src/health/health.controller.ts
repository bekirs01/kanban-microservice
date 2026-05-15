import { Controller, Get } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, MicroserviceHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private microservice: MicroserviceHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) { }

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.microservice.pingCheck('auth-service', {
        transport: Transport.TCP,
        options: {
          host: process.env.AUTH_SERVICE_HOST || 'auth-service',
          port: Number(process.env.AUTH_SERVICE_PORT) || 3002,
        },
        timeout: 3000,
      }),
      () => this.microservice.pingCheck('tasks-service', {
        transport: Transport.TCP,
        options: {
          host: process.env.TASKS_SERVICE_HOST || 'tasks-service',
          port: Number(process.env.TASKS_SERVICE_PORT) || 3003,
        },
        timeout: 3000,
      }),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
    ]);
  }
}
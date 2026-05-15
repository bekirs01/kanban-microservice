import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskHistory } from './entity/task-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaskHistory])]
})
export class HistoryModule { }

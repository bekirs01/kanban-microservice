import { TaskNotificationPayload } from '@challenge/types';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entity/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: Repository<Notification>;
  let wsGateway: NotificationsGateway;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWsGateway = {
    notifyUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: NotificationsGateway,
          useValue: mockWsGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    wsGateway = module.get<NotificationsGateway>(NotificationsGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('notifyTaskAssigned', () => {
    const mockPayload: TaskNotificationPayload = {
      recipients: ['user-1', 'user-2'],
      task: {
        id: 'task-123',
        title: 'Tarefa de Teste',
        status: 'TODO',
        assigneeIds: [],
      },
      action: 'ASSIGN',
    };

    const mockNotification = {
      id: 'notification-123',
      userId: 'user-1',
      title: 'Nova Atribuição',
      content: 'Você foi atribuído à tarefa: Tarefa de Teste',
      createdAt: new Date(),
    };

    it('deve salvar notificação para cada destinatário', async () => {
      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      await service.notifyTaskAssigned(mockPayload);

      expect(mockNotificationRepository.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: 'Nova Atribuição',
        content: 'Você foi atribuído à tarefa: Tarefa de Teste',
      });
      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        userId: 'user-2',
        title: 'Nova Atribuição',
        content: 'Você foi atribuído à tarefa: Tarefa de Teste',
      });
    });

    it('deve chamar wsGateway.notifyUser para cada destinatário', async () => {
      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      await service.notifyTaskAssigned(mockPayload);

      expect(mockWsGateway.notifyUser).toHaveBeenCalledTimes(2);
      expect(mockWsGateway.notifyUser).toHaveBeenCalledWith('user-1', 'task:updated', {
        content: 'Você foi atribuído à tarefa: Tarefa de Teste',
        title: 'Nova Atribuição',
      });
      expect(mockWsGateway.notifyUser).toHaveBeenCalledWith('user-2', 'task:updated', {
        content: 'Você foi atribuído à tarefa: Tarefa de Teste',
        title: 'Nova Atribuição',
      });
    });

    it('deve lidar com um único destinatário', async () => {
      const singleRecipientPayload: TaskNotificationPayload = {
        ...mockPayload,
        recipients: ['user-1'],
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      await service.notifyTaskAssigned(singleRecipientPayload);

      expect(mockNotificationRepository.create).toHaveBeenCalledTimes(1);
      expect(mockNotificationRepository.save).toHaveBeenCalledTimes(1);
      expect(mockWsGateway.notifyUser).toHaveBeenCalledTimes(1);
    });

    it('deve criar notificação com conteúdo correto baseado no título da tarefa', async () => {
      const customPayload: TaskNotificationPayload = {
        recipients: ['user-1'],
        task: {
          id: 'task-456',
          title: 'Implementar Feature X',
          assigneeIds: [],
          status: 'IN_PROGRESS',
        },
        action: 'ASSIGN',
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      await service.notifyTaskAssigned(customPayload);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: 'Nova Atribuição',
        content: 'Você foi atribuído à tarefa: Implementar Feature X',
      });
    });
  });
});
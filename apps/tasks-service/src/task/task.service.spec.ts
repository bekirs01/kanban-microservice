import { TaskNotFoundRpcException, UnauthorizedRpcException } from '@challenge/exceptions';
import { ActionType, TaskPriority, TaskStatus } from '@challenge/types';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentService } from '../comment/comment.service';
import { TaskHistory } from '../history/entity/task-history.entity';
import { Task } from './entity/task.entity';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let taskService: TaskService;
  let taskRepository: Repository<Task>;
  let historyRepository: Repository<TaskHistory>;
  let notificationClient: any;
  let commentService: CommentService;

  const mockTaskRepository = {
    save: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockHistoryRepository = {
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockNotificationClient = {
    emit: jest.fn(),
  };

  const mockCommentService = {
    create: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(TaskHistory),
          useValue: mockHistoryRepository,
        },
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: mockNotificationClient,
        },
        {
          provide: CommentService,
          useValue: mockCommentService,
        },
      ],
    }).compile();

    taskService = module.get<TaskService>(TaskService);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    historyRepository = module.get<Repository<TaskHistory>>(
      getRepositoryToken(TaskHistory),
    );
    notificationClient = module.get('NOTIFICATION_SERVICE');
    commentService = module.get<CommentService>(CommentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(taskService).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      title: 'Nova tarefa',
      description: 'Descrição da tarefa',
      creatorId: 'user-123',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      deadline: new Date()
    };

    const mockTask = {
      id: 'task-123',
      ...createDto,
    };

    it('deve criar uma nova tarefa', async () => {
      mockTaskRepository.save.mockResolvedValue(mockTask);

      const result = await taskService.create(createDto);

      expect(result).toEqual(mockTask);
      expect(mockTaskRepository.save).toHaveBeenCalledWith(createDto);
    });
  });

  describe('delete', () => {
    const deleteData = {
      taskId: 'task-123',
      userId: 'user-123',
    };

    const mockTask = {
      id: 'task-123',
      title: 'Tarefa para deletar',
      status: TaskStatus.TODO,
      creatorId: 'user-123',
    };

    it('deve deletar uma tarefa e salvar histórico', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.delete.mockResolvedValue({ affected: 1 });
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await taskService.delete(deleteData);

      expect(result).toEqual({ affected: 1 });
      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { id: deleteData.taskId },
      });
      expect(mockHistoryRepository.save).toHaveBeenCalledWith({
        action: ActionType.DELETE,
        taskId: mockTask.id,
        changes: {
          new: {},
          old: { ...mockTask },
        },
        changedBy: deleteData.userId,
      });
      expect(mockTaskRepository.delete).toHaveBeenCalledWith(deleteData.taskId);
    });

    it('deve lançar TaskNotFoundRpcException quando tarefa não existir', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(taskService.delete(deleteData)).rejects.toThrow(
        TaskNotFoundRpcException,
      );
      expect(mockTaskRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateData = {
      taskId: 'task-123',
      authorId: 'user-123',
      title: 'Título atualizado',
      status: TaskStatus.IN_PROGRESS,
    };

    const mockTask = {
      id: 'task-123',
      title: 'Título antigo',
      status: TaskStatus.TODO,
      creatorId: 'user-123',
      assignees: ['user-456'],
    };

    it('deve atualizar tarefa e salvar histórico', async () => {
      const updatedTask = { ...mockTask, ...updateData };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(updatedTask);
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await taskService.update(updateData);

      expect(result).toEqual(updatedTask);
      expect(mockHistoryRepository.save).toHaveBeenCalled();
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'task.updated',
        expect.objectContaining({
          recipients: expect.arrayContaining(['user-456']),
          action: ActionType.STATUS_CHANGE,
        }),
      );
    });

    it('não deve salvar histórico quando não houver mudanças', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      await taskService.update({ taskId: 'task-123', authorId: 'user-123' });

      expect(mockHistoryRepository.save).not.toHaveBeenCalled();
      expect(mockNotificationClient.emit).not.toHaveBeenCalled();
    });

    it('deve lançar TaskNotFoundRpcException quando tarefa não existir', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(taskService.update(updateData)).rejects.toThrow(
        TaskNotFoundRpcException,
      );
    });
  });

  describe('getAll', () => {
    const pagination = {
      page: 1,
      limit: 10,
      userId: 'user-123',
    };

    const mockTasks = [
      { id: 'task-1', title: 'Tarefa 1', creatorId: 'user-123' },
      { id: 'task-2', title: 'Tarefa 2', assignees: ['user-123'] },
    ];

    it('deve retornar tarefas paginadas do usuário', async () => {
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTasks, 2]);

      const result = await taskService.getAll(pagination);

      expect(result).toEqual({
        items: mockTasks,
        data: {
          totalItems: 2,
          itemCount: 2,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      });
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.orWhere).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    const taskId = 'task-123';
    const mockTask = {
      id: taskId,
      title: 'Tarefa teste',
      comments: [],
    };

    it('deve retornar tarefa por id com comentários', async () => {
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockTask);

      const result = await taskService.getById(taskId);

      expect(result).toEqual(mockTask);
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'task.comments',
        'comments',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('task.id = :id', {
        id: taskId,
      });
    });

    it('deve lançar TaskNotFoundRpcException quando tarefa não existir', async () => {
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(taskService.getById(taskId)).rejects.toThrow(
        TaskNotFoundRpcException,
      );
    });
  });

  describe('assignUser', () => {
    const assignData = {
      taskId: 'task-123',
      assigneeId: 'user-456',
      assignerId: 'user-123',
    };

    const mockTask = {
      id: 'task-123',
      title: 'Tarefa teste',
      status: TaskStatus.TODO,
      description: 'Descrição',
      assignees: [],
    };

    it('deve atribuir usuário à tarefa', async () => {
      const updatedTask = { ...mockTask, assignees: ['user-456'] };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(updatedTask);
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await taskService.assignUser(assignData);

      expect(result.assignees).toContain('user-456');
      expect(mockHistoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ActionType.ASSIGNED,
        }),
      );
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'task.assigned',
        expect.objectContaining({
          recipients: ['user-456'],
          action: ActionType.ASSIGNED,
        }),
      );
    });

    it('não deve adicionar usuário já atribuído', async () => {
      const taskWithAssignee = {
        ...mockTask,
        assignees: ['user-456'],
      };
      mockTaskRepository.findOne.mockResolvedValue(taskWithAssignee);

      const result = await taskService.assignUser(assignData);

      expect(mockTaskRepository.save).not.toHaveBeenCalled();
      expect(mockNotificationClient.emit).not.toHaveBeenCalled();
    });

    it('deve lançar TaskNotFoundRpcException quando tarefa não existir', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(taskService.assignUser(assignData)).rejects.toThrow(
        TaskNotFoundRpcException,
      );
    });
  });

  describe('unassignUser', () => {
    const unassignData = {
      taskId: 'task-123',
      assigneeId: 'user-456',
      assignerId: 'user-123',
    };

    const mockTask = {
      id: 'task-123',
      title: 'Tarefa teste',
      status: TaskStatus.TODO,
      description: 'Descrição',
      assignees: ['user-456'],
    };

    it('deve remover usuário da tarefa', async () => {
      const updatedTask = { ...mockTask, assignees: [] };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(updatedTask);
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await taskService.unassignUser(unassignData);

      expect(result.assignees).not.toContain('user-456');
      expect(mockHistoryRepository.save).toHaveBeenCalled();
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'task.updated',
        expect.any(Object),
      );
    });

    it('não deve remover usuário não atribuído', async () => {
      const taskWithoutAssignee = { ...mockTask, assignees: [] };
      mockTaskRepository.findOne.mockResolvedValue(taskWithoutAssignee);

      const result = await taskService.unassignUser(unassignData);

      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar TaskNotFoundRpcException quando tarefa não existir', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(taskService.unassignUser(unassignData)).rejects.toThrow(
        TaskNotFoundRpcException,
      );
    });
  });

  describe('comment', () => {
    const commentData = {
      taskId: 'task-123',
      authorId: 'user-123',
      content: 'Comentário teste',
    };

    const mockTask = {
      id: 'task-123',
      title: 'Tarefa teste',
      status: TaskStatus.TODO,
      description: 'Descrição',
      creatorId: 'user-456',
      assignees: ['user-789'],
    };

    const mockComment = {
      id: 'comment-123',
      ...commentData,
    };

    it('deve criar comentário e notificar usuários', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockCommentService.create.mockResolvedValue(mockComment);
      mockHistoryRepository.save.mockResolvedValue({});

      const result = await taskService.comment(commentData);

      expect(result).toEqual(mockComment);
      expect(mockHistoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ActionType.COMMENT,
        }),
      );
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'task.comment',
        expect.objectContaining({
          recipients: expect.arrayContaining(['user-456', 'user-789']),
          action: ActionType.COMMENT,
        }),
      );
    });

    it('deve lançar TaskNotFoundRpcException quando tarefa não existir', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(taskService.comment(commentData)).rejects.toThrow(
        TaskNotFoundRpcException,
      );
    });
  });

  describe('getTaskHistory', () => {
    const historyData = {
      taskId: 'task-123',
      userId: 'user-123',
      page: 1,
      limit: 10,
    };

    const mockTask = {
      id: 'task-123',
      creatorId: 'user-123',
      assignees: [],
    };

    const mockHistory = [
      {
        id: 'history-1',
        taskId: 'task-123',
        action: ActionType.CREATED,
        changes: {
          old: {},
          new: { title: 'Nova tarefa' },
        },
        changedBy: 'user-123',
        changedAt: new Date('2024-01-01'),
      },
    ];

    it('deve retornar histórico da tarefa', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockHistoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockHistory, 1]);

      const result = await taskService.getTaskHistory(historyData);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty('action', ActionType.CREATED);
      expect(result.items[0]).toHaveProperty('content');
      expect(result.data.totalItems).toBe(1);
    });

    it('deve lançar TaskNotFoundRpcException quando tarefa não existir', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(taskService.getTaskHistory(historyData)).rejects.toThrow(
        TaskNotFoundRpcException,
      );
    });

    it('deve lançar UnauthorizedRpcException quando usuário não tiver permissão', async () => {
      const unauthorizedTask = {
        id: 'task-123',
        creatorId: 'user-456',
        assignees: [],
      };
      mockTaskRepository.findOne.mockResolvedValue(unauthorizedTask);

      await expect(taskService.getTaskHistory(historyData)).rejects.toThrow(
        UnauthorizedRpcException,
      );
    });
  });
});
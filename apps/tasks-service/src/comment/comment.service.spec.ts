import { TaskNotFoundRpcException, UnauthorizedRpcException } from '@challenge/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../task/entity/task.entity';
import { CommentService } from './comment.service';
import { Comment } from './entity/comment.entity';

describe('CommentService', () => {
  let commentService: CommentService;
  let commentRepository: Repository<Comment>;
  let taskRepository: Repository<Task>;
  let notificationClient: any;

  const mockCommentRepository = {
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockTaskRepository = {
    findOne: jest.fn(),
  };

  const mockNotificationClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: mockNotificationClient,
        },
      ],
    }).compile();

    commentService = module.get<CommentService>(CommentService);
    commentRepository = module.get<Repository<Comment>>(getRepositoryToken(Comment));
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    notificationClient = module.get('NOTIFICATION_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(commentService).toBeDefined();
  });

  describe('create', () => {
    const createCommentData = {
      taskId: 'task-123',
      authorId: 'user-123',
      content: 'Comentário de teste',
    };

    const mockTask = {
      id: 'task-123',
      title: 'Tarefa teste',
      creatorId: 'user-123',
      assignees: [],
    };

    const mockComment = {
      id: 'comment-123',
      ...createCommentData,
      createdAt: new Date(),
    };

    it('deve criar um comentário com sucesso', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockCommentRepository.save.mockResolvedValue(mockComment);

      const result = await commentService.create(createCommentData);

      expect(result).toEqual(mockComment);
      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { id: createCommentData.taskId },
      });
      expect(mockCommentRepository.save).toHaveBeenCalledWith(createCommentData);
    });

    it('deve lançar TaskNotFoundRpcException quando tarefa não existir', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(commentService.create(createCommentData)).rejects.toThrow(
        TaskNotFoundRpcException,
      );
      expect(mockCommentRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getByTaskId', () => {
    const taskId = 'task-123';
    const userId = 'user-123';

    const mockComments = [
      {
        id: 'comment-1',
        taskId,
        authorId: 'user-456',
        content: 'Comentário 1',
        createdAt: new Date('2024-01-02'),
      },
      {
        id: 'comment-2',
        taskId,
        authorId: 'user-789',
        content: 'Comentário 2',
        createdAt: new Date('2024-01-01'),
      },
    ];

    it('deve retornar comentários quando usuário é o criador', async () => {
      const mockTask = {
        id: taskId,
        title: 'Tarefa teste',
        creatorId: userId,
        assignees: [],
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockCommentRepository.find.mockResolvedValue(mockComments);

      const result = await commentService.getByTaskId(taskId, userId);

      expect(result).toEqual(mockComments);
      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { id: taskId },
      });
      expect(mockCommentRepository.find).toHaveBeenCalledWith({
        where: { taskId },
        order: { createdAt: 'DESC' },
      });
    });

    it('deve retornar comentários quando usuário é um assignee', async () => {
      const mockTask = {
        id: taskId,
        title: 'Tarefa teste',
        creatorId: 'user-456',
        assignees: [userId, 'user-789'],
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockCommentRepository.find.mockResolvedValue(mockComments);

      const result = await commentService.getByTaskId(taskId, userId);

      expect(result).toEqual(mockComments);
      expect(mockCommentRepository.find).toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedRpcException quando usuário não tiver permissão', async () => {
      const mockTask = {
        id: taskId,
        title: 'Tarefa teste',
        creatorId: 'user-456',
        assignees: ['user-789'],
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      await expect(commentService.getByTaskId(taskId, userId)).rejects.toThrow(
        UnauthorizedRpcException,
      );
      expect(mockCommentRepository.find).not.toHaveBeenCalled();
    });

    it('deve lançar TaskNotFoundRpcException quando tarefa não existir', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(commentService.getByTaskId(taskId, userId)).rejects.toThrow(
        TaskNotFoundRpcException,
      );
      expect(mockCommentRepository.find).not.toHaveBeenCalled();
    });

    it('deve lidar com assignees undefined', async () => {
      const mockTask = {
        id: taskId,
        title: 'Tarefa teste',
        creatorId: 'user-456',
        assignees: undefined,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      await expect(commentService.getByTaskId(taskId, userId)).rejects.toThrow(
        UnauthorizedRpcException,
      );
    });
  });
});
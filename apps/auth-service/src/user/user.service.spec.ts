import { UserAlreadyExistsException, UserNotFoundException } from '@challenge/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { UserService } from './user.service';

jest.mock('bcryptjs');

describe('UserService', () => {
  let userService: UserService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    preload: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(userService).toBeDefined();
  });

  describe('getByEmail', () => {
    const email = 'teste@jungle.com';
    const mockUser = {
      id: 'uuid-123',
      email: 'teste@jungle.com',
      username: 'thiago',
      passwordHash: 'hash-senha',
    };

    it('deve retornar um usuário quando encontrado', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.getByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('deve lançar UserNotFoundException quando usuário não encontrado', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(userService.getByEmail(email)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('getById', () => {
    const userId = 'uuid-123';
    const mockUser = {
      id: 'uuid-123',
      email: 'teste@jungle.com',
      username: 'thiago',
      passwordHash: 'hash-senha',
    };

    it('deve retornar um usuário quando encontrado', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.getById(userId);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('deve lançar UserNotFoundException quando usuário não encontrado', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(userService.getById(userId)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('getAll', () => {
    const mockUsers = [
      {
        id: 'uuid-1',
        email: 'user1@jungle.com',
        username: 'user1',
      },
      {
        id: 'uuid-2',
        email: 'user2@jungle.com',
        username: 'user2',
      },
    ];

    it('deve retornar usuários paginados com valores padrão', async () => {
      mockUserRepository.findAndCount.mockResolvedValue([mockUsers, 2]);

      const result = await userService.getAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        items: mockUsers,
        data: {
          totalItems: 2,
          itemCount: 2,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      });
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });

    it('deve retornar usuários paginados com valores customizados', async () => {
      mockUserRepository.findAndCount.mockResolvedValue([[mockUsers[0]], 5]);

      const result = await userService.getAll({ page: 2, limit: 2 });

      expect(result.data).toEqual({
        totalItems: 5,
        itemCount: 1,
        itemsPerPage: 2,
        totalPages: 3,
        currentPage: 2,
      });
      expect(mockUserRepository.findAndCount).toHaveBeenCalledWith({
        skip: 2,
        take: 2,
      });
    });
  });

  describe('create', () => {
    const registerPayload = {
      email: 'novo@jungle.com',
      password: 'senha123',
      username: 'novousuario',
    };

    const mockSavedUser = {
      id: 'uuid-new',
      email: 'novo@jungle.com',
      username: 'novousuario',
      passwordHash: 'hashed-password',
    };

    it('deve criar um novo usuário com sucesso', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockSavedUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await userService.create(registerPayload);

      expect(result).toEqual(mockSavedUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: [
          { email: registerPayload.email },
          { username: registerPayload.username },
        ],
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerPayload.password, 10);
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        username: registerPayload.username,
        email: registerPayload.email,
        passwordHash: 'hashed-password',
      });
    });

    it('deve lançar UserAlreadyExistsException quando usuário já existe', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'existing-id',
        email: registerPayload.email,
      });

      await expect(userService.create(registerPayload)).rejects.toThrow(
        UserAlreadyExistsException,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const userId = 'uuid-123';
    const mockUser = {
      id: userId,
      email: 'teste@jungle.com',
      username: 'thiago',
      passwordHash: 'old-hash',
    };

    it('deve atualizar usuário com senha', async () => {
      const updateDto = { password: 'nova-senha' };
      const updatedUser = { ...mockUser, passwordHash: 'new-hashed-password' };

      mockUserRepository.preload.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const result = await userService.update(userId, updateDto);

      expect(result).toEqual(updatedUser);
      expect(bcrypt.hash).toHaveBeenCalledWith(updateDto.password, 10);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('deve atualizar usuário com refreshTokenHash', async () => {
      const updateDto = { refreshTokenHash: 'new-refresh-token' };
      const updatedUser = {
        ...mockUser,
        refreshTokenHash: 'new-hashed-refresh-token',
      };

      mockUserRepository.preload.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh-token');

      const result = await userService.update(userId, updateDto);

      expect(result).toEqual(updatedUser);
      expect(bcrypt.hash).toHaveBeenCalledWith(
        updateDto.refreshTokenHash,
        10,
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('deve lançar UserNotFoundException quando usuário não encontrado', async () => {
      mockUserRepository.preload.mockResolvedValue(null);

      await expect(userService.update(userId, {})).rejects.toThrow(
        UserNotFoundException,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const userId = 'uuid-123';
    const mockUser = {
      id: userId,
      email: 'teste@jungle.com',
      username: 'thiago',
      refreshTokenHash: 'old-refresh-token',
    };

    it('deve fazer logout removendo refreshTokenHash', async () => {
      const loggedOutUser = { ...mockUser, refreshTokenHash: '' };

      mockUserRepository.preload.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(loggedOutUser);

      const result = await userService.logout(userId);

      expect(result).toEqual(loggedOutUser);
      expect(mockUserRepository.preload).toHaveBeenCalledWith({ id: userId });
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        refreshTokenHash: '',
      });
    });

    it('deve lançar UserNotFoundException quando usuário não encontrado', async () => {
      mockUserRepository.preload.mockResolvedValue(null);

      await expect(userService.logout(userId)).rejects.toThrow(
        UserNotFoundException,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getManyByIds', () => {
    const ids = ['uuid-1', 'uuid-2'];
    const mockUsers = [
      { id: 'uuid-1', username: 'user1', email: 'user1@jungle.com' },
      { id: 'uuid-2', username: 'user2', email: 'user2@jungle.com' },
    ];

    it('deve retornar usuários pelos ids', async () => {
      mockUserRepository.find.mockResolvedValue(mockUsers);

      const result = await userService.getManyByIds(ids);

      expect(result).toEqual(mockUsers);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
        select: ['id', 'username', 'email'],
      });
    });

    it('deve retornar array vazio quando ids estiver vazio', async () => {
      const result = await userService.getManyByIds([]);

      expect(result).toEqual([]);
      expect(mockUserRepository.find).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio quando ids for undefined', async () => {
      const result = await userService.getManyByIds(undefined as any);

      expect(result).toEqual([]);
      expect(mockUserRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('getAllSimple', () => {
    const mockUsers = [
      { id: 'uuid-1', username: 'user1', email: 'user1@jungle.com' },
      { id: 'uuid-2', username: 'user2', email: 'user2@jungle.com' },
    ];

    it('deve retornar todos os usuários com campos selecionados', async () => {
      mockUserRepository.find.mockResolvedValue(mockUsers);

      const result = await userService.getAllSimple();

      expect(result).toEqual(mockUsers);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        select: ['id', 'username', 'email'],
      });
    });
  });
});
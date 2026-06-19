import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Notification } from '../mongo/schemas/notification.schema';
import { NotifyService } from './notify.service';

describe('NotifyService', () => {
  let service: NotifyService;
  let notificationModel: { findByIdAndUpdate: jest.Mock };

  beforeEach(async () => {
    // Arrange (común): modelo de Mongoose mockeado.
    notificationModel = { findByIdAndUpdate: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotifyService,
        {
          provide: getModelToken(Notification.name),
          useValue: notificationModel,
        },
      ],
    }).compile();

    service = moduleRef.get(NotifyService);
  });

  describe('markAsRead (TC-UNIT-016)', () => {
    describe('cuando el id no es un ObjectId válido', () => {
      it('lanza NotFoundException sin consultar la base de datos', async () => {
        // Act + Assert
        await expect(service.markAsRead('id-invalido')).rejects.toBeInstanceOf(
          NotFoundException,
        );
      });

      it('no llama a findByIdAndUpdate con un id inválido', async () => {
        // Act
        await service.markAsRead('id-invalido').catch(() => undefined);
        // Assert
        expect(notificationModel.findByIdAndUpdate).not.toHaveBeenCalled();
      });
    });
  });
});

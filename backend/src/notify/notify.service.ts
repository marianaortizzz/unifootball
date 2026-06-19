import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../mongo/schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotifyService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const created = await this.notificationModel.create({
      userId: dto.userId,
      title: dto.title,
      body: dto.body,
      read: false,
      createdAt: new Date(),
    });
    return created.toObject();
  }

  findByUser(userId: string): Promise<Notification[]> {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async markAsRead(id: string): Promise<Notification> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Notificación ${id} no encontrada`);
    }

    const updated = await this.notificationModel
      .findByIdAndUpdate(id, { read: true }, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException(`Notificación ${id} no encontrada`);
    }

    return updated;
  }
}

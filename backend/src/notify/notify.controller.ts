import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Notification } from '../mongo/schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotifyService } from './notify.service';

@ApiTags('notify')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notify')
export class NotifyController {
  constructor(private readonly service: NotifyService) {}

  @Post()
  @ApiOperation({ summary: 'Crear notificación' })
  create(@Body() dto: CreateNotificationDto): Promise<Notification> {
    return this.service.create(dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Notificaciones de un usuario' })
  findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<Notification[]> {
    return this.service.findByUser(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  markAsRead(@Param('id') id: string): Promise<Notification> {
    return this.service.markAsRead(id);
  }
}

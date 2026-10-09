import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Topic-scoped realtime transport. Clients join one topic room and receive
 * only events for that topic, keeping traffic bounded as the site grows.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class TopicsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('topic:join')
  joinTopic(@ConnectedSocket() client: Socket, @MessageBody() body: { topicId?: string }) {
    if (!body?.topicId) return { ok: false, message: 'topicId gerekli.' };
    void client.join(this.room(body.topicId));
    return { ok: true, topicId: body.topicId };
  }

  @SubscribeMessage('topic:leave')
  leaveTopic(@ConnectedSocket() client: Socket, @MessageBody() body: { topicId?: string }) {
    if (!body?.topicId) return { ok: false, message: 'topicId gerekli.' };
    void client.leave(this.room(body.topicId));
    return { ok: true, topicId: body.topicId };
  }

  emitTopicEvent(topicId: string, event: string, payload: unknown) {
    this.server?.to(this.room(topicId)).emit(event, payload);
  }

  private room(topicId: string) {
    return `topic:${topicId}`;
  }
}

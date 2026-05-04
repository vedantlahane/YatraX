//backend/src/shared/ws/hub.ts

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { logger } from '../logger/index.js';

type WsMessage = { type: string; payload: unknown };

export class WsHub {
  private wss?: WebSocketServer;
  private rooms = new Map<string, Set<WebSocket>>();
  private clientRooms = new Map<WebSocket, Set<string>>();

  attach(server: Server, path = '/ws-connect'): void {
    this.wss = new WebSocketServer({ server, path });
    this.wss.on('connection', (ws) => this.onConnection(ws));
    logger.info({ path }, 'websocket hub attached');
  }

  private onConnection(ws: WebSocket): void {
    this.clientRooms.set(ws, new Set());
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; room?: string };
        if (msg.type === 'JOIN' && msg.room) this.join(ws, msg.room);
        if (msg.type === 'LEAVE' && msg.room) this.leave(ws, msg.room);
      } catch { /* ignore */ }
    });
    ws.on('close', () => this.cleanup(ws));
  }

  private join(ws: WebSocket, room: string): void {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room)!.add(ws);
    this.clientRooms.get(ws)?.add(room);
  }

  private leave(ws: WebSocket, room: string): void {
    this.rooms.get(room)?.delete(ws);
    if (this.rooms.get(room)?.size === 0) this.rooms.delete(room);
    this.clientRooms.get(ws)?.delete(room);
  }

  private cleanup(ws: WebSocket): void {
    const rooms = this.clientRooms.get(ws);
    if (rooms) for (const r of rooms) this.leave(ws, r);
    this.clientRooms.delete(ws);
  }

  toRoom(room: string, message: WsMessage): void {
    const clients = this.rooms.get(room);
    if (!clients) return;
    const data = JSON.stringify(message);
    for (const c of clients) if (c.readyState === WebSocket.OPEN) c.send(data);
  }

  toAll(message: WsMessage): void {
    if (!this.wss) return;
    const data = JSON.stringify(message);
    for (const c of this.wss.clients) if (c.readyState === WebSocket.OPEN) c.send(data);
  }
}

export const wsHub = new WsHub();
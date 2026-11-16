import type { IncomingMessage, ServerResponse } from 'node:http'

export function readRequest(req: IncomingMessage, limit?: number): Promise<Request | null>
export function sendResponse(res: ServerResponse, response: Response): Promise<void>
export function visitorAddress(req: IncomingMessage, trustProxy?: boolean): string

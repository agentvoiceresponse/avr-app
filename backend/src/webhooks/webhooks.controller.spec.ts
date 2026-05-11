import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  const webhooksServiceMock = {
    verifySecret: jest.fn(),
    handleEvent: jest.fn(),
    listCalls: jest.fn(),
    getSummary: jest.fn(),
    getCallWithEvents: jest.fn(),
  };

  const event: WebhookEventDto = {
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    type: 'call_started',
    timestamp: '2026-05-10T22:12:45.075Z',
    payload: { from: '+123' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [{ provide: WebhooksService, useValue: webhooksServiceMock }],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    process.env.WEBHOOK_SECRET = 'test-secret';
    process.env.WEBHOOK_FORWARD_URL = 'https://example.test/webhooks';
    process.env.WEBHOOK_FORWARD_TIMEOUT_MS = '20';
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET;
    delete process.env.WEBHOOK_FORWARD_URL;
    delete process.env.WEBHOOK_FORWARD_TIMEOUT_MS;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should continue processing when forwarding fails with timeout', async () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('Timeout while forwarding webhook'));

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
    });

    await expect(
      controller.handleWebhook(event, 'test-secret', 'agent-1'),
    ).resolves.toEqual({ status: 'ok' });

    expect(webhooksServiceMock.verifySecret).toHaveBeenCalledWith(
      'test-secret',
    );
    expect(webhooksServiceMock.handleEvent).toHaveBeenCalledWith(
      event,
      'agent-1',
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to forward webhook',
      expect.any(Error),
    );
  });

  it('should continue processing when forwarding fails after remote disconnect', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed: socket hang up'));

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
    });

    await expect(
      controller.handleWebhook(event, 'test-secret', 'agent-2'),
    ).resolves.toEqual({ status: 'ok' });

    expect(webhooksServiceMock.verifySecret).toHaveBeenCalledWith(
      'test-secret',
    );
    expect(webhooksServiceMock.handleEvent).toHaveBeenCalledWith(
      event,
      'agent-2',
    );
  });

  it('should continue processing when forwarding endpoint returns bad request', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 400 });

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
    });

    await expect(
      controller.handleWebhook(event, 'test-secret', 'agent-3'),
    ).resolves.toEqual({ status: 'ok' });

    expect(webhooksServiceMock.verifySecret).toHaveBeenCalledWith(
      'test-secret',
    );
    expect(webhooksServiceMock.handleEvent).toHaveBeenCalledWith(
      event,
      'agent-3',
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Webhook forward failed with status 400',
    );
  });

  it('should continue processing when forwarding hangs and times out', async () => {
    jest.useFakeTimers();
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    const fetchMock = jest.fn().mockImplementationOnce((_url, init) => {
      return new Promise((_, reject) => {
        const abortSignal = init?.signal as AbortSignal | undefined;
        abortSignal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      });
    });

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
    });

    const request = controller.handleWebhook(event, 'test-secret', 'agent-4');

    await jest.advanceTimersByTimeAsync(25);

    await expect(request).resolves.toEqual({ status: 'ok' });
    expect(webhooksServiceMock.verifySecret).toHaveBeenCalledWith(
      'test-secret',
    );
    expect(webhooksServiceMock.handleEvent).toHaveBeenCalledWith(
      event,
      'agent-4',
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Webhook forward timed out after'),
    );
  });
});

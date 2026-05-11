import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.ADMIN_USERNAME = 'admin@agentvoiceresponse.com';
    process.env.ADMIN_PASSWORD = 'agentvoiceresponse';
    process.env.WEBHOOK_SECRET = 'test-webhook-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('rejects extra fields on login DTO', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin@agentvoiceresponse.com',
        password: 'agentvoiceresponse',
        extra: 'boom',
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain(
          'property extra should not exist',
        );
      });
  });

  it('rejects extra fields on webhook event DTO', () => {
    return request(app.getHttpServer())
      .post('/webhooks')
      .set('x-avr-webhook-secret', 'test-webhook-secret')
      .send({
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        type: 'call_started',
        timestamp: '2026-05-10T22:12:45.075Z',
        unknownField: 'boom',
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain(
          'property unknownField should not exist',
        );
      });
  });
});

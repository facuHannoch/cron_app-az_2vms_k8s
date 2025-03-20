// app.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import server from './cron'; // Adjust the path to your app file

let mongoServer;
process.env.NODE_ENV = 'test';


beforeAll(async () => {
  // Start an in-memory MongoDB instance for testing
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {});
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch (error) {
      console.error('Error during mongoose disconnect:', error);
    }
  }
  await mongoServer.stop();
});


describe('Timer App API Endpoints', () => {
  test('should start a timer for a project', async () => {
    const response = await request(server).get('/start?project=TestProject');
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Started timer for project: TestProject/);
  });

  test('should edit time for a project', async () => {
    const response = await request(server).get('/edit?project=TestProject&minutes=1');
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Edited time for project: TestProject/);
  });

  test('should list projects', async () => {
    const response = await request(server).get('/list');
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Listed all projects in console/);
  });

  test('should list today times', async () => {
    const response = await request(server).get('/list-today');
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Listed today's times in console/);
  });

  test('should stop a timer for a project', async () => {
    // First start a timer for a new project
    await request(server).get('/start?project=StopTest');
    const response = await request(server).get('/stop?project=StopTest');
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Stopped timer for project: StopTest/);
  });

  test('should stop all timers when no project is specified', async () => {
    // Start multiple timers
    await request(server).get('/start?project=Proj1');
    await request(server).get('/start?project=Proj2');
    const response = await request(server).get('/stop');
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Stopped all timers/);
  });
});

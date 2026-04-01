const request = require('supertest');
const app = require('../server');
const db = require('../models');

describe('Items Management', () => {
  let token;
  let testUser;

  beforeAll(async () => {
    // Don't force sync in production-like environment
    // await db.sequelize.sync({ force: true }); // Only use this if you want a fresh DB

    // Fetch an existing user
    testUser = await db.User.findOne({ where: { username: 'realuser' } });

    if (!testUser) {
      throw new Error(
        "User 'realuser' not found in database. Please create it with a hashed password and role 'operator'."
      );
    }

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: 'userpassword', // plain password matching hashed password in DB
      });

    token = loginResponse.body.token;
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Item',
          price: 25.5,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('item');
      expect(response.body.item.name).toBe('Test Item');
      expect(response.body.item.price).toBe('25.50');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '',
          price: -10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({
          name: 'Test Item',
          price: 25.5,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/items', () => {
    beforeEach(async () => {
      await db.Item.bulkCreate([
        { userId: testUser.id, name: 'Item 1', price: 10.0, isActive: true },
        { userId: testUser.id, name: 'Item 2', price: 20.0, isActive: true },
        { userId: testUser.id, name: 'Special Item', price: 30.0, isActive: true },
      ]);
    });

    afterEach(async () => {
      await db.Item.destroy({ where: { userId: testUser.id } });
    });

    it('should get all items', async () => {
      const response = await request(app)
        .get('/api/items')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body.items.length).toBe(3);
    });

    it('should search items by name', async () => {
      const response = await request(app)
        .get('/api/items?search=Special')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].name).toBe('Special Item');
    });
  });

  describe('PUT /api/items/:id', () => {
    let testItem;

    beforeEach(async () => {
      testItem = await db.Item.create({
        userId: testUser.id,
        name: 'Original Item',
        price: 15.0,
        isActive: true,
      });
    });

    afterEach(async () => {
      await db.Item.destroy({ where: { id: testItem.id } });
    });

    it('should update an existing item', async () => {
      const response = await request(app)
        .put(`/api/items/${testItem.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Item',
          price: 25.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.item.name).toBe('Updated Item');
      expect(response.body.item.price).toBe('25.00');
    });

    it('should reject update for non-existent item', async () => {
      const response = await request(app)
        .put('/api/items/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Item',
          price: 25.0,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/items/:id', () => {
    let testItem;

    beforeEach(async () => {
      testItem = await db.Item.create({
        userId: testUser.id,
        name: 'Item to Delete',
        price: 15.0,
        isActive: true,
      });
    });

    it('should delete an item with confirmation', async () => {
      const response = await request(app)
        .delete(`/api/items/${testItem.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      const deletedItem = await db.Item.findByPk(testItem.id);
      expect(deletedItem.isActive).toBe(false);
    });

    it('should reject deletion without confirmation', async () => {
      const response = await request(app)
        .delete(`/api/items/${testItem.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: false });

      expect(response.status).toBe(400);
    });
  });
});

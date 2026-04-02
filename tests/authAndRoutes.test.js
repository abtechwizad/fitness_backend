const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const Workout = require("../models/Workout");

describe("Auth and main routes", () => {
  const testEmail = `jestuser+${Date.now()}@example.com`;
  const password = "testpass123";

  beforeAll(async () => {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/fitness_tracker_test";
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await Workout.deleteMany({ name: /Jest Test Workout/i });
    await User.deleteMany({ email: testEmail });
    await mongoose.connection.close();
  });

  test("registers a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .field("name", "Jest User")
      .field("email", testEmail)
      .field("password", password);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("email", testEmail);
  });

  test("logs in and returns token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  test("accesses protected route /api/auth/me with token", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password });

    const token = login.body.token;
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("email", testEmail);
  });

  test("creates a workout for authenticated user", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password });

    const token = login.body.token;
    const today = new Date().toISOString().split("T")[0];

    const res = await request(app)
      .post("/api/workouts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Jest Test Workout",
        category: "Strength",
        notes: "Created from Jest test",
        date: today,
        exercises: [{ name: "Bench Press", sets: 3, reps: 10, weight: 50 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body).toHaveProperty("name", "Jest Test Workout");
  });

  test("root endpoint returns API running message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
  });
});


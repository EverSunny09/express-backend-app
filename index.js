const express = require("express");
const app = express();
const port = 3000;
const crypto = require("crypto");

// Middleware to parse JSON bodies
app.use(express.json());

// In-memory data stores
const USERS = [];
const QUESTIONS = [];
const SUBMISSIONS = [];

// Token store: Maps tokens to user emails
const TOKENS = {};

// Utility function to generate random tokens
const generateToken = () => {
  return crypto.randomBytes(16).toString("hex");
};

// Middleware for authenticating users based on token
const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1]; // Expecting format: "Bearer <token>"

  if (!token || !TOKENS[token]) {
    return res.status(401).json({ message: "Invalid or missing token" });
  }

  // Attach user email to request object for further use
  req.userEmail = TOKENS[token];
  next();
};

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
  const user = USERS.find(u => u.email === req.userEmail);
  
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (!user.isAdmin) {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }

  next();
};

// Route: Home
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Route: Signup
app.post("/signup", (req, res) => {
  const { email, password, isAdmin } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Check if user already exists
  const existingUser = USERS.find(user => user.email === email);
  
  if (existingUser) {
    return res.status(409).json({ message: "User with this email already exists" });
  }

  // Add new user to USERS array
  USERS.push({ email, password, isAdmin: isAdmin || false });

  res.status(201).json({ message: "User registered successfully" });
});

// Route: Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Validate request body
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Find user by email
  const user = USERS.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Check if password matches
  if (user.password !== password) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Generate token and store it
  const token = generateToken();
  TOKENS[token] = email;

  res.status(200).json({ message: "Login successful", token });
});

// Route: Post a new question (Admin only)
app.post("/questions", authenticate, isAdmin, (req, res) => {
  const { title, description, testCases } = req.body;

  // Validate request body
  if (!title || !description) {
    return res.status(400).json({ message: "Title and description are required" });
  }

  if (!Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({ message: "Test cases are required and must be an array" });
  }

  for (const testCase of testCases) {
    if (!testCase.input || !testCase.output) {
      return res.status(400).json({ message: "Each test case must have input and output fields" });
    }
  }

  const newQuestion = {
    id: QUESTIONS.length + 1,
    title,
    description,
    testCases, 
    createdBy: req.userEmail,
    createdAt: new Date()
  };

  QUESTIONS.push(newQuestion);

  res.status(201).json({ message: "Question added successfully", question: newQuestion });
});

// Route: Get all questions
app.get("/questions", authenticate, (req, res) => {
  res.status(200).json({ questions: QUESTIONS });
});

// Route: Get user's submissions
app.get("/submissions", authenticate, (req, res) => {
  const userSubmissions = SUBMISSIONS.filter(sub => sub.userEmail === req.userEmail);
  res.status(200).json({ submissions: userSubmissions });
});

// Route: Submit a problem solution
app.post("/submissions", authenticate, (req, res) => {
  const { questionId, solution } = req.body;

  // Validate request body
  if (!questionId || !solution) {
    return res.status(400).json({ message: "Question ID and solution are required" });
  }

  // Check if question exists
  const question = QUESTIONS.find(q => q.id === questionId);
  
  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  // Randomly accept or reject the submission
  const isAccepted = Math.random() < 0.5;

  const submission = {
    id: SUBMISSIONS.length + 1,
    userEmail: req.userEmail,
    questionId,
    solution,
    status: isAccepted ? "Accepted" : "Rejected",
    submittedAt: new Date()
  };

  SUBMISSIONS.push(submission);

  res.status(201).json({ message: `Submission ${submission.status}`, submission });
});

// Start the server
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

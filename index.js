import express from 'express';
import chatRoutes from './api/chat.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON
app.use(express.json());

// Use the API routes
app.use('/api/chat', chatRoutes);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

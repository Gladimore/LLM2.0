import express from "express";
import cors from "cors";

import routes from "./src/routes.js";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use("/api", routes);

app.get("*", (_, res) => {
  res.sendStatus(404)
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

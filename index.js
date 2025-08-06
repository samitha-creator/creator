import express from "express";
import morgan from "morgan";
import os from "os";

const app = express();
const port = 3000;

app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.status(200).send({
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    type: os.type(),
    userInfo: os.userInfo(),
  });
});

app.listen(port, () => {
  console.log("Server is running on port http://localhost:" + port);
});

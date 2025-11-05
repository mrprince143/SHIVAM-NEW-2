const { spawn } = require("child_process");
const axios = require("axios");
const logger = require("./utils/log");
const express = require("express");
const path = require("path");

//========================================================//
//============== WEB DASHBOARD + KEEP ALIVE ==============//
//========================================================//

const app = express();
const port = process.env.PORT || 10000;

// Serve static index.html (dashboard)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/index.html"));
});

// Health check route (Render ping)
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Start the web server
app.listen(port, "0.0.0.0", () => {
  logger(`✅ Server running on port ${port}`, "[ WEB SERVICE ]");
}).on("error", (err) => {
  if (err.code === "EACCES") {
    logger(`Permission denied. Cannot bind to port ${port}.`, "[ ERROR ]");
  } else {
    logger(`Server error: ${err.message}`, "[ ERROR ]");
  }
});

//========================================================//
//============== BOT STARTER + AUTO RESTART ===============//
//========================================================//

global.countRestart = global.countRestart || 0;

function startBot(message) {
  if (message) logger(message, "[ STARTING ]");

  const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "Priyansh.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  });

  // Error Handling
  child.on("error", (error) => {
    logger(`Bot process error: ${error.stack || error.message}`, "[ ERROR ]");
  });

  // Standard output and error streams
  if (child.stdout) {
    child.stdout.on("data", (data) => {
      console.log(`[BOT STDOUT]: ${data}`);
    });
  }

  if (child.stderr) {
    child.stderr.on("data", (data) => {
      console.error(`[BOT STDERR]: ${data}`);
    });
  }

  // Restart logic
  child.on("close", (codeExit) => {
    if (codeExit !== 0) {
      logger(`Bot exited with code ${codeExit}`, "[ EXIT ]");

      if (global.countRestart < 5) {
        global.countRestart += 1;
        logger(`Restarting bot... (${global.countRestart}/5)`, "[ RESTARTING ]");
        setTimeout(() => startBot(), 2000);
      } else {
        logger(`Bot stopped after ${global.countRestart} restarts.`, "[ STOPPED ]");
        logger("To debug, run 'node Priyansh.js' manually.", "[ DEBUG ]");
      }
    } else {
      logger("Bot exited normally with code 0.", "[ EXIT ]");
    }
  });
}

//========================================================//
//============== UPDATE CHECK FROM GITHUB =================//
//========================================================//

try {
  const packageInfo = require("./package.json");
  logger(packageInfo.name, "[ NAME ]");
  logger(`Version: ${packageInfo.version}`, "[ VERSION ]");
  logger(packageInfo.description, "[ DESCRIPTION ]");

  axios
    .get("https://raw.githubusercontent.com/codedbypriyansh/Priyansh-Bot/main/package.json")
    .then((res) => {
      if (res.data && res.data.version) {
        logger(`Remote version: ${res.data.version}`, "[ UPDATE INFO ]");
      }
    })
    .catch((err) => {
      logger(`Update check failed: ${err.message}`, "[ UPDATE ERROR ]");
    });
} catch (err) {
  logger(`Failed to load package info: ${err.message}`, "[ ERROR ]");
}

//========================================================//
//==================== START BOT ==========================//
//========================================================//

startBot("🚀 Starting bot...");

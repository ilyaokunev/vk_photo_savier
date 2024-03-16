const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Worker } = require("worker_threads");
const os = require("os");

let archivePath = path.join(__dirname, "../");
let messagesDirPath = path.join(archivePath, "Archive", "messages");
let pathToSaveDir = path.join(archivePath, "VK_LOADED_PHOTOS");

const numCpuCores = os.cpus().length;

const workersArray = [];
let workerPointer = 0;

let photosInWork = 0;


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  "Укажите путь к папке с архивом ВК (если оставить незаполненным, то по умолчанию будет использоваться родительская папка для репозитория)\n",
  (path) => {
    if (path.trim()) {
      archivePath = path;
    }

    rl.close();
    init();
  }
);

function init() {
  createWorkers();
  updateSubPath();
  fs.mkdirSync(pathToSaveDir, { recursive: true });
  parseStart();
  console.log('Скачивание началось');
}

function parseStart() {
  fs.readdir(messagesDirPath, (err, chatDirNames) => {
    if (err) {
      console.log(err.message);
    }
    chatDirNames.forEach(workWithChatDir);
    startIntervalForExit();
  });
}

function workWithChatDir(dirName) {
  // в папке messages помимо папок есть html файл
  if (dirName.split(".").at(-1) === "html") return;

  fs.readdir(path.join(messagesDirPath, dirName), (err, files) => {
    if (err) {
      console.log(err.message);
    }

    files.forEach((htmlName) => {
      workWithHtmlPage(pathToSaveDir, path.join(messagesDirPath, dirName, htmlName));
    });
  });
}

function workWithHtmlPage(pathToSaveDir, htmlPath) {
  const worker = workersArray[workerPointer];
  worker.postMessage({ pathToSaveDir, htmlFilePath: htmlPath });
  updatePointer();
}

function startIntervalForExit() {
  setInterval(() => {
    if (photosInWork === 0) {
      console.log('Скачивание завершено');
      process.exit(0);
    }
  }, 2000);
}

function createWorkers()
{
  for (let i = 0; i < numCpuCores - 1; i++) {
    const worker = new Worker("./page-parser.js");
    workersArray.push(worker);
    worker.on('message', (val) => {
      if (val === 'start') photosInWork++
      if (val === 'finish') photosInWork-- 
    });
  }
}

function updateSubPath() {
  messagesDirPath = path.join(archivePath, "Archive", "messages");
  pathToSaveDir = path.join(archivePath, "VK_LOADED_PHOTOS");
}

function updatePointer() {
  workerPointer++;
  if (workerPointer === workersArray.length) {
    workerPointer = 0;
  }
}
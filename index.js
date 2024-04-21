const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Worker } = require("worker_threads");
const os = require("os");
const downloadFile = require("./download");

let archivePath = path.join(__dirname, "../");
let messagesDirPath = path.join(archivePath, "Archive", "messages");
let pathToSaveDir = path.join(archivePath, "VK_LOADED_PHOTOS");
let errorFilePath = path.join(pathToSaveDir, "errors_logs.json");

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
  createErrorLogFile();
  parseStart();
}

function createErrorLogFile() {
  fs.writeFileSync(errorFilePath, '{"firstTryErrors": [');
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
  const interval = setInterval(() => {
    console.log('Осталось', photosInWork);
    if (photosInWork <= 0) {
      clearInterval(interval);
      addToErrorFile('{}]}');
      tryToDownloadErrorPhotos();
    }
  }, 2000);
}

function createWorkers() {
  for (let i = 0; i < numCpuCores - 1; i++) {
    const worker = new Worker("./page-parser.js");
    workersArray.push(worker);
    worker.on("message", (val) => {
      if (val === "start") photosInWork++;
      if (val === "finish") photosInWork--;
    });
  }
}

function updateSubPath() {
  messagesDirPath = path.join(archivePath, "Archive", "messages");
  pathToSaveDir = path.join(archivePath, "VK_LOADED_PHOTOS");
  errorFilePath = path.join(pathToSaveDir, "errors_logs.json");
}

function updatePointer() {
  workerPointer++;
  if (workerPointer === workersArray.length) {
    workerPointer = 0;
  }
}

function tryToDownloadErrorPhotos() {
    const data = fs.readFileSync(errorFilePath, 'utf8');
    const jsonData = JSON.parse(data);
    const errorsArray = jsonData['firstTryErrors'];

    jsonData['secondTryErrors'] = [];
    let successfulDownloads = 0;

    console.log('\nПовторно пытаемся скачать', errorsArray.length - 1, 'файлов');

    setTimeout(() => {
      console.log('Возникли ошибки при повторном скачивании');
      finish();
    }, (errorsArray.length - 1) * 2 * 1000)

    if (errorsArray.length > 1) {
      errorsArray.forEach((error) => {
        const filePath = error['linkToCrushedPicture'];
        const downloadLink =  error['downloadLink'];
        if (!downloadLink || !filePath) return;

        const file = fs.createWriteStream(filePath);

        downloadFile(file, downloadLink, filePath, () => {
          const err = {
            linkToCrushedPicture: filePath,
            downloadLink,
          };
          jsonData.secondTryErrors.push(err)
        });


        file.on("finish", () => {
          successfulDownloads++;
          file.close();
          const restCount = (errorsArray.length - 1) - successfulDownloads;
          console.log('Осталось скачать: ', restCount)
          if (restCount <= 0) {
            fs.writeFileSync(errorFilePath, JSON.stringify(jsonData));
            finish();
          }
        });
      });

    } else {
      finish();
    }
}

function addToErrorFile(value) {
  fs.appendFileSync(errorFilePath, value);
}

 function deleteEmptyDirs() {
 const files = fs.readdirSync(pathToSaveDir);

    files.forEach((dirName) => {
      if(dirName !== 'errors_logs.json') {
        const dirPath = path.join(pathToSaveDir, dirName)
        const dirContent = fs.readdirSync(dirPath);
        if (!dirContent.length) {
            fs.rmSync(dirPath, {recursive: true});
        }
      }
    });
}

function finish() {
  deleteEmptyDirs();
  console.log("Скачивание завершено");
  process.exit(0);
}

const fs = require("fs");
const path = require("path");
const readline = require("readline");

let archivePath = path.join(__dirname, "../");
let messagesDirPath = path.join(archivePath, "Archive", "messages");
let pathToSaveDir = path.join(archivePath, "VK_LOADED_PHOTOS");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  "Укажите путь к папке с архивом ВК (если оставить незаполненным, то по умолчанию будет использоваться родительская папка для репозитория)\n\n",
  (path) => {
    if (path.trim()) {
      archivePath = path;
    }

    rl.close();
    updateSubPath();
    fs.mkdirSync(pathToSaveDir, { recursive: true });
    parseStart();
  }
);

function parseStart() {

  fs.readdir(messagesDirPath, (err, files) => {
    if(err) {
      console.log(err.message)
    }
    files.forEach(workWithChatDir);
  });
}

function workWithChatDir(dirName) {
  // в папке messages помимо папок есть html файл
  if(dirName.split('.').at(-1) === 'html') return;

  const htmlFilesList = fs.readdirSync(path.join(messagesDirPath, dirName));

  htmlFilesList.forEach(htmlName => {
    workWithHtmlPage(pathToSaveDir, path.join(messagesDirPath, dirName, htmlName));
  })

}

function workWithHtmlPage(pathToSaveDir, htmlPath) {
  console.log(pathToSaveDir, htmlPath);
  // const fileContent = fs.readFileSync(`${dirWithMess}/${additionalPath}`, "utf-8");
}

function updateSubPath() {
  messagesDirPath = path.join(archivePath, "Archive", "messages");
  pathToSaveDir = path.join(archivePath, "VK_LOADED_PHOTOS");
}
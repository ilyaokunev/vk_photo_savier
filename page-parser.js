const fs = require("fs");
const path = require("path");

const iconv = require("iconv-lite");
const { JSDOM } = require("jsdom");
const { v4: uuid } = require("uuid");

const { parentPort } = require("worker_threads");
const downloadFile = require("./download");
const {ERROR_FILE_NAME} = require("./constants");

let savePath;
let dirName;
let pageName;
let savePathWithCurrentChatDir;

let photosOnPage = 0;
let downloadedPhotos = 0;


parentPort.on("message", ({ pathToSaveDir, htmlFilePath }) => {
  savePath = pathToSaveDir;
  workWithHtmlPage(htmlFilePath);
});

function workWithHtmlPage(path) {
  fs.readFile(`${path}`, (err, buffer) => {
    if (err) {
      console.log(err.message, "error blyad in", path);
    }

    const document = getDocumentFromBuffer(buffer);
    createDirForNewChat(document, path);

    getPhotosArray(document).forEach((link) => {
      const filePath = getFilePath();

      const file = fs.createWriteStream(filePath);
      downloadFile(file, link, filePath,() => addErrorToLog(link, filePath), true);
      parentPort.postMessage("start");

      file.on("finish", () => {
        finishDownload(file);
      });
    });
  });
}

function createDirForNewChat(document, filePath) {

  const [newPageName, newDirName] = filePath.split("\\").reverse();

  if (dirName !== newDirName) {
    dirName = newDirName;
    const chatName = getChatName(document);
    savePathWithCurrentChatDir = path.join(savePath, chatName);
    fs.mkdirSync(savePathWithCurrentChatDir, { recursive: true });
  }
  pageName = newPageName;
}

function getDocumentFromBuffer(buffer) {
  // vk в 2024 использует кодировку window-1251, а мне бы в utf-8 читать
  const data = iconv.decode(buffer, "win1251");
  return new JSDOM(data).window.document;
}

function getAttachmentList(document) {
  return Array.from(document.querySelectorAll("div.attachment"));
}

function getChatName(document) {
  const uiCrumbs = document.querySelector('.page_block_header_inner').querySelectorAll('.ui_crumb');
  const name = uiCrumbs[uiCrumbs.length -1].innerHTML;
  return name.split(' ').join('_');
}

function getPhotosArray(document) {
  const attachmentsList = getAttachmentList(document);
  const elementToCompare = getNodeToCompareWith(document);

  const photoLinksList = attachmentsList
      .filter((attachmentDiv) => attachmentDiv.firstElementChild.isEqualNode(elementToCompare))
      .map((attachmentDiv) => attachmentDiv.getElementsByClassName("attachment__link")[0].href);

  photosOnPage = photoLinksList.length;

  return photoLinksList;
}

function getNodeToCompareWith(document) {
  const elementToFindInAttachmentDiv = document.createElement("div");
  elementToFindInAttachmentDiv.classList.add("attachment__description");
  elementToFindInAttachmentDiv.innerHTML = "Фотография";

  return elementToFindInAttachmentDiv;
}


function getFilePath() {
  const nameForPhoto = uuid();
  return path.join(savePathWithCurrentChatDir, `${nameForPhoto}.jpeg`);
}

function finishDownload(file) {
  file.close();
  downloadedPhotos++;
  parentPort.postMessage("finish");
}

function addErrorToLog(downloadLink,filelink) {
  const errorPath = path.join(savePath, ERROR_FILE_NAME);
  const error = JSON.stringify({
    directoryName: dirName,
    htmlFileName: pageName,
    linkToCrushedPicture: filelink,
    downloadLink,
  });

  fs.appendFileSync(errorPath, `\n${error},\n`);
}

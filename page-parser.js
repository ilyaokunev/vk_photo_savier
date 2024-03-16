const fs = require("fs");
const path = require("path");
const https = require("https");

const iconv = require("iconv-lite");
const { JSDOM } = require("jsdom");
const { v4: uuid } = require("uuid");

const { parentPort } = require("worker_threads");

let savePath;
let dirName;
let pageName;

let photosOnPage = 0;
let downloadedPhotos = 0;

parentPort.on("message", ({ pathToSaveDir, htmlFilePath }) => {
  savePath = pathToSaveDir;
  [pageName, dirName] = htmlFilePath.split("\\").reverse();

  workWithHtmlPage(htmlFilePath);
});

function workWithHtmlPage(path) {
  fs.readFile(`${path}`, (err, buffer) => {
    if (err) {
      console.log(err.message, "error blyad in", path);
    }
    const document = getDocumentFromBuffer(buffer);
    const attachmentsList = getAttachmentList(document);
    const elementToCompare = getNodeToCompareWith(document);

    const photoLinksList = attachmentsList
      .filter((attachmentDiv) => attachmentDiv.firstElementChild.isEqualNode(elementToCompare))
      .map((attachmentDiv) => attachmentDiv.getElementsByClassName("attachment__link")[0].href);

    photosOnPage = photoLinksList.length;

    photoLinksList.forEach((link) => {
      const filePath = getFilePath();

      downloadFile(fs.createWriteStream(filePath), link, filePath);
    });
  });
}

function getDocumentFromBuffer(buffer) {
  // vk в 2024 использует кодировку window-1251, а мне бы в utf-8 читать
  const data = iconv.decode(buffer, "win1251");
  return new JSDOM(data).window.document;
}

function getAttachmentList(document) {
  return Array.from(document.querySelectorAll("div.attachment"));
}

function getNodeToCompareWith(document) {
  const elementToFindInAttachmentDiv = document.createElement("div");
  elementToFindInAttachmentDiv.classList.add("attachment__description");
  elementToFindInAttachmentDiv.innerHTML = "Фотография";

  return elementToFindInAttachmentDiv;
}

function getFilePath() {
  const nameForPhoto = uuid();
  return path.join(savePath, `${nameForPhoto}.jpeg`);
}

function downloadFile(file, downloadLink, filelink) {
  parentPort.postMessage({text:"start" , link: filelink});
  // в случае если файл качается очень долго или не качается вовсе но сервер не разрывает соединение
  setTimeout(() => file.close(), 2 * 60 * 1000);

  https
  .get(downloadLink, (response) => response.pipe(file))
  .on("error", (err) => {
      // Удаляем файл, если возникла ошибка при скачивании
      fs.unlinkSync(filelink);
      console.error(err.message);
    });

    file.on("finish", () => {
      file.close();
      downloadedPhotos++;
      parentPort.postMessage({text:"finish", link:filelink});
      if (photosOnPage === downloadedPhotos) console.log(`Загрузка фото из файла ${pageName} из директории ${dirName} успешно завершена`);
    });
}
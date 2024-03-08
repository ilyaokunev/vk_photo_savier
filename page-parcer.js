const fs = require("fs");
const path = require("path");
const https = require("https");

const iconv = require("iconv-lite");
const { JSDOM } = require("jsdom");
const { v4: uuid } = require("uuid");

const tryPath = "C:/Users/zhora/Downloads/Archive/messages/56732918/messages50.html";
const basePath = path.join(__dirname, "../", "loaded_photos");

let photosOnPage = 0;
let downloadedPhotos = 0;

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
      const fileStream = getWriteStream();
      downloadFile(fileStream, link);
    });
  });
}

workWithHtmlPage(tryPath);

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

function getWriteStream() {
  const nameForPhoto = uuid();
  return fs.createWriteStream(path.join(basePath, `${nameForPhoto}.jpeg`));
}

function downloadFile(file, downloadLink) {
  https
    .get(downloadLink, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        downloadedPhotos++;
        console.log(`Со страницы скачано ${downloadedPhotos} из ${photosOnPage}`);
      });
    })
    .on("error", (err) => {
      // Удаляем файл, если возникла ошибка при скачивании
      fs.unlinkSync(localFilePath);
      console.error(err.message);
    });
}

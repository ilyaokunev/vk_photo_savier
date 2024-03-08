const fs = require("fs");
const path = require("path");

const dirWithMess = `C:/Users/zhora/Downloads/Archive/try-vk-loader`;
fs.mkdirSync(path.join(__dirname, '../', "loaded_photos"));

const dirContentList = fs.readdirSync(dirWithMess);
console.log(dirContentList);
workWithChatDir(dirContentList[0]);
// for(let i = 0; i < dirContentList.length; i++) {
//   workWithChatDir(dirContentList[i])
// }

function workWithChatDir(dirName) {
  const htmlList = fs.readdirSync(`${dirWithMess}/${dirName}`);
  for (let j = 0; j < htmlList.length; j++) {
    workWithHtmlPage(`${dirName}/${htmlList[j]}`);
  }
}

function workWithHtmlPage(additionalPath) {
  const fileContent = fs.readFileSync(`${dirWithMess}/${additionalPath}`, "utf-8");
  console.log(fileContent);
}

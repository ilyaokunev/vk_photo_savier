const fs = require("fs");
const https = require("https");

 function downloadFile(file, downloadLink, filelink, logFn) {
    // в случае если файл качается очень долго или не качается вовсе но сервер не разрывает соединение
    const timeout = setTimeout(() => {
        logFn();
        try {
            fs.unlinkSync(filelink);
        } catch (e) {
            console.log(e);
        }
        file.close();
    }, 2 * 60 * 1000);

    https
        .get(downloadLink, (response) => response.pipe(file))
        .on("error", (err) => {
            // Удаляем файл, если возникла ошибка при скачивании
            console.error(err.message);
            logFn();
            fs.unlinkSync(filelink);
        });

    file.on("finish", () => {
        clearTimeout(timeout);
    });
}

module.exports = downloadFile;

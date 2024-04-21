

# VK Photo Saver

One day I decided to delete my profile from VK, but before doing that, I wanted to download my data from there, especially the photos from my conversations were very valuable to me. The platform allows to download only an archive with a bunch of HTML pages, which seemed like an eternal torment to browse through in search of photos. That's why I decided to write a script to automate this process.

---
## How to use

It's all quite simple. You need to:
1. Download the repository
2. Install the dependencies (I use npm)
```
npm install
```
3. Run the script
```
node index.js
```
4. Specify the path to the folder where you unzipped the archive downloaded from VK (by default, the parent folder of the repository will be used)"
5. Press Enter :muscle:

---
## Some tips

In download.js file at 14 line you can change time-to-wait value, when you think that you Internet connection rather slow, and it takes more time to download some of your pictures.

By default, I create *"errors_logs.json"* file to log errors and try to download files again. You can change it or delete if you don't need it.

You can essentially do whatever you want with this, I don't care.



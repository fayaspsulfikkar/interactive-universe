import fs from 'fs';
import https from 'https';
import path from 'path';

const moons = {
  io: "3/30/Io_Global_Mosaic.jpg",
  europa: "c/c5/Europa_map.jpg",
  ganymede: "c/c6/Ganymede_Voyager-Galileo_mosaic_map.jpg",
  callisto: "0/05/Callisto_map.jpg",
  titan: "1/1d/Titan_Equirectangular_Map_-_Cassini.jpg",
  enceladus: "a/af/Enceladus_PIA18435_map.jpg"
};

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

Object.entries(moons).forEach(([name, urlPath]) => {
  const dest = path.join(process.cwd(), 'public', 'textures', `${name}.jpg`);
  const file = fs.createWriteStream(dest);
  
  https.get(`https://upload.wikimedia.org/wikipedia/commons/${urlPath}`, options, (res) => {
    if (res.statusCode !== 200) {
      console.error(`Failed to download ${name}. Status: ${res.statusCode}`);
      return;
    }
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Successfully downloaded ${name}.jpg`);
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${name}: `, err.message);
  });
});

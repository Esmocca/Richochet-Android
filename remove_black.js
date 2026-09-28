const Jimp = require('jimp');

async function processImage(filename) {
    const img = await Jimp.read(filename);
    const w = img.bitmap.width;
    const h = img.bitmap.height;

    // Tolerance for "black"
    const isBlack = (c) => {
        const r = (c >> 24) & 255;
        const g = (c >> 16) & 255;
        const b = (c >> 8) & 255;
        return r < 20 && g < 20 && b < 20;
    };

    // Flood fill queue
    const queue = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
    const visited = new Set();
    
    // Convert to transparent
    const transparentColor = 0x00000000;

    while (queue.length > 0) {
        const [x, y] = queue.pop();
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (x < 0 || x >= w || y < 0 || y >= h) continue;

        const color = img.getPixelColor(x, y);
        if (isBlack(color)) {
            img.setPixelColor(transparentColor, x, y);
            queue.push([x + 1, y]);
            queue.push([x - 1, y]);
            queue.push([x, y + 1]);
            queue.push([x, y - 1]);
        }
    }

    await img.writeAsync(filename);
    console.log(`Processed ${filename}`);
}

async function main() {
    try {
        await processImage('img/planet1.png'); // Saturn
        await processImage('img/planet2.png'); // Jupiter
        await processImage('img/planet3.png'); // Mars
        await processImage('img/planet4.png'); // Pluto
        await processImage('img/planet5.png'); // Moon
        console.log("All done!");
    } catch (e) {
        console.error(e);
    }
}

main();

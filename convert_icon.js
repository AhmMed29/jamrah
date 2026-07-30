const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const sizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

const svgPath = 'Jamrah-Icon.svg';
const baseResDir = path.join('android', 'app', 'src', 'main', 'res');

async function convert() {
    try {
        const svgContent = fs.readFileSync(svgPath);

        for (const [density, size] of Object.entries(sizes)) {
            console.log(`Converting ${density} -> ${size}x${size}`);
            const mipmapDir = path.join(baseResDir, `mipmap-${density}`);
            if (!fs.existsSync(mipmapDir)) {
                fs.mkdirSync(mipmapDir, { recursive: true });
            }
            const outPath = path.join(mipmapDir, 'ic_jamrah.png');

            const resvg = new Resvg(svgContent, {
                fitTo: { mode: 'width', value: size },
            });
            const pngData = resvg.render().asPng();
            fs.writeFileSync(outPath, pngData);
        }
        console.log("Done generating launcher icons.");
    } catch (e) {
        console.error("Error generating icons:", e);
    }
}

convert();

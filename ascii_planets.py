import math
from PIL import Image, ImageDraw, ImageFont

def image_to_ascii(filepath, font_path="C:\\Windows\\Fonts\\lucon.ttf", font_size=14):
    try:
        img = Image.open(filepath).convert("RGBA")
    except Exception as e:
        print(f"Error opening {filepath}: {e}")
        return

    # Load font
    try:
        font = ImageFont.truetype(font_path, font_size)
    except:
        font = ImageFont.load_default()

    # Monospace dimensions roughly
    char_w = int(font_size * 0.6)
    char_h = int(font_size * 0.8)

    w, h = img.size
    cols = int(w / char_w)
    rows = int(h / char_h)

    if cols == 0 or rows == 0:
        return

    small_img = img.resize((cols, rows), Image.Resampling.BILINEAR)
    pixels = small_img.load()

    # Characters ordered by density
    chars = [".", ":", "?", "S", "#", "%", "@"]

    out_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out_img)

    for y in range(rows):
        for x in range(cols):
            r, g, b, a = pixels[x, y]
            if a < 50:
                continue
                
            brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            char_idx = int(brightness * (len(chars) - 1))
            
            char = chars[char_idx]
            draw.text((x * char_w, y * char_h), char, font=font, fill=(r, g, b, 255))

    out_img.save(filepath)
    print(f"ASCII-fied {filepath}")

for i in range(1, 6):
    image_to_ascii(f"img/planet{i}.png")
    image_to_ascii(f"dist/img/planet{i}.png")

print("Done")

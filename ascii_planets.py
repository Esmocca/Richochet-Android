import math
from PIL import Image, ImageDraw, ImageFont

def image_to_ascii(filepath, font_path="C:\\Windows\\Fonts\\lucon.ttf", font_size=14, is_bg=False):
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

    scale_factor = 3
    out_w = w * scale_factor
    out_h = h * scale_factor
    out_char_w = char_w * scale_factor
    out_char_h = char_h * scale_factor
    
    try:
        out_font = ImageFont.truetype(font_path, font_size * scale_factor)
    except:
        out_font = ImageFont.load_default()

    out_img = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out_img)

    for y in range(rows):
        for x in range(cols):
            r, g, b, a = pixels[x, y]
            if a < 50:
                continue
                
            brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            
            if is_bg and brightness < 0.1:
                continue # Skip very dark pixels so background is transparent!
                
            char_idx = int(brightness * (len(chars) - 1))
            
            char = chars[char_idx]
            draw.text((x * out_char_w, y * out_char_h), char, font=out_font, fill=(r, g, b, 255))

    out_img.save(filepath)
    print(f"ASCII-fied {filepath}")

# Convert gameplay bg
image_to_ascii("img/gameplay_bg.png", is_bg=True)

# Copy to dist
import shutil
shutil.copy("img/gameplay_bg.png", "dist/img/gameplay_bg.png")

# Convert planets
for i in range(1, 6):
    image_to_ascii(f"img/planet{i}.png")
    shutil.copy(f"img/planet{i}.png", f"dist/img/planet{i}.png")

print("Done")

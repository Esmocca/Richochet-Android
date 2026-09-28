import sys
from PIL import Image

def process_image(input_path, output_path, bg_color="white", recolor_black_to=None):
    try:
        img = Image.open(input_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening {input_path}: {e}")
        return
    
    # Use load() for better compatibility with newer Pillow versions
    pixels = img.load()
    w, h = img.size
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if bg_color == "white":
                # If pixel is bright (white-ish), make transparent
                if r > 200 and g > 200 and b > 200:
                    pixels[x, y] = (255, 255, 255, 0)
                elif recolor_black_to and r < 100 and g < 100 and b < 100:
                    pixels[x, y] = recolor_black_to
            elif bg_color == "black":
                # If pixel is dark (black-ish), make transparent
                if r < 50 and g < 50 and b < 50:
                    pixels[x, y] = (0, 0, 0, 0)

    img.save(output_path, "PNG")
    print(f"Saved {output_path}")

base = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\12e00e43-cfb3-4c1c-98aa-23c85f0f3ba9\.user_uploaded"

# New Burst (red halftone, white bg)
process_image(f"{base}\\media_1790580008200.png", "img/burst.png", "white")

# PTS icon (white bg), recolor black to yellow
process_image(f"{base}\\media_1790578743241.png", "img/pts_icon.png", "white", recolor_black_to=(255, 210, 0, 255))

# BOOM (black bg)
process_image(f"{base}\\media_1790578777092.png", "img/boom.png", "black")

# Hourglass (white bg), recolor black to white
process_image(f"{base}\\media_1790583199414.png", "img/hourglass.png", "white", recolor_black_to=(255, 255, 255, 255))


import sys
from PIL import Image

def remove_background(input_path, output_path, bg_color="white"):
    try:
        img = Image.open(input_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening {input_path}: {e}")
        return
    
    data = img.getdata()
    new_data = []
    
    for item in data:
        r, g, b, a = item
        if bg_color == "white":
            # If pixel is bright (white-ish), make transparent
            if r > 200 and g > 200 and b > 200:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        elif bg_color == "black":
            # If pixel is dark (black-ish), make transparent
            if r < 50 and g < 50 and b < 50:
                new_data.append((0, 0, 0, 0))
            else:
                new_data.append(item)
                
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Saved {output_path}")

base = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\12e00e43-cfb3-4c1c-98aa-23c85f0f3ba9\.user_uploaded"
# Burst (white bg)
remove_background(f"{base}\\media_1790578686160.png", "img/burst.png", "white")

# PTS icon (white bg)
remove_background(f"{base}\\media_1790578743241.png", "img/pts_icon.png", "white")

# BOOM (black bg)
remove_background(f"{base}\\media_1790578777092.png", "img/boom.png", "black")

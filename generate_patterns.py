import json
from PIL import Image

def img_to_pattern(img_path, target_width=38, max_height=None, thresh=30):
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Error loading {img_path}: {e}")
        return []

    w, h = img.size
    if max_height:
        # Calculate dimensions so height doesn't exceed max_height
        target_height = int(h * (target_width / w))
        if target_height > max_height:
            target_height = max_height
            target_width = int(w * (max_height / h))
    else:
        target_height = int(h * (target_width / w))
    
    # Resize
    img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    # Optional: Enhance contrast or colors here if needed
    
    data = []
    pixels = img.load()
    
    for y in range(target_height):
        row = []
        for x in range(target_width):
            r, g, b, a = pixels[x, y]
            # Ignore transparent or very dark pixels (background)
            brightness = (r + g + b) / 3
            if a < 50 or brightness < 40:
                row.append(0)
            else:
                hex_color = f"#{r:02x}{g:02x}{b:02x}"
                row.append(hex_color)
        
        # Only add row if it has blocks, to trim top/bottom empty space
        if any(cell != 0 for cell in row) or data:
            data.append(row)
            
    # Trim trailing empty rows
    while data and not any(cell != 0 for cell in data[-1]):
        data.pop()
        
    return data

patterns = []

# Stage 1: Lily
lily_path = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\12e00e43-cfb3-4c1c-98aa-23c85f0f3ba9\.user_uploaded\media_1790573726237.png"
patterns.append(img_to_pattern(lily_path, target_width=20))

# Stage 2: Butterfly
butterfly_path = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\12e00e43-cfb3-4c1c-98aa-23c85f0f3ba9\.user_uploaded\media_1790575365584.png"
patterns.append(img_to_pattern(butterfly_path, target_width=22))

# Stage 3: Bat
bat_path = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\12e00e43-cfb3-4c1c-98aa-23c85f0f3ba9\.user_uploaded\media_1790577452817.png"
patterns.append(img_to_pattern(bat_path, target_width=24))

# Stage 4: Shark
shark_path = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\12e00e43-cfb3-4c1c-98aa-23c85f0f3ba9\.user_uploaded\media_1790577713177.png"
patterns.append(img_to_pattern(shark_path, target_width=24))

# Stage 5: Jellyfish
jellyfish_path = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\12e00e43-cfb3-4c1c-98aa-23c85f0f3ba9\.user_uploaded\media_1790577865963.png"
patterns.append(img_to_pattern(jellyfish_path, target_width=24, max_height=20))

with open("patterns.json", "w") as f:
    json.dump(patterns, f)

print("Generated patterns.json")

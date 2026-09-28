from PIL import Image, ImageDraw

def circular_crop(filepath, radius_ratio=0.48):
    try:
        img = Image.open(filepath).convert("RGBA")
    except:
        return
    
    w, h = img.size
    cx, cy = w / 2, h / 2
    r = min(w, h) * radius_ratio
    
    # Create a mask
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    
    # Apply mask
    result = img.copy()
    result.putalpha(mask)
    
    # Save
    result.save(filepath)
    print(f"Circular cropped {filepath}")

def flood_fill_transparent(filepath, tolerance=40):
    try:
        img = Image.open(filepath).convert("RGBA")
    except:
        return
        
    pixels = img.load()
    w, h = img.size
    
    visited = set()
    queue = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    
    while queue:
        x, y = queue.pop(0)
        if (x, y) in visited:
            continue
        visited.add((x, y))
        
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
            
        r, g, b, a = pixels[x, y]
        if r < tolerance and g < tolerance and b < tolerance:
            pixels[x, y] = (0, 0, 0, 0)
            queue.append((x + 1, y))
            queue.append((x - 1, y))
            queue.append((x, y + 1))
            queue.append((x, y - 1))
            
    img.save(filepath)
    print(f"Flood filled {filepath}")

# Saturn (has rings, use flood fill)
flood_fill_transparent("img/planet1.png", tolerance=45)

# Other planets (perfect circles, use circular crop)
circular_crop("img/planet2.png", 0.49) # Jupiter
circular_crop("img/planet3.png", 0.49) # Mars (tighter to avoid UI buttons)
circular_crop("img/planet4.png", 0.49) # Pluto
circular_crop("img/planet5.png", 0.49) # Moon

print("Done")

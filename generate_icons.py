#!/usr/bin/env python3
"""
Generate PWA icons for AutoShkolla Platform
Creates square icons with blue background and white text
Also creates maskable variants for modern PWA support
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Configuration — output dir is relative to this script (frontend repo root)
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "icons")
PRIMARY_COLOR = "#2563EB"  # Blue
TEXT_COLOR = "#FFFFFF"    # White
BACKGROUND_COLOR = "#0f172a"  # Dark slate

# RGB values
BLUE_RGB = (37, 99, 235)  # #2563EB
WHITE_RGB = (255, 255, 255)
DARK_BG_RGB = (15, 23, 42)  # #0f172a

# Icon sizes to generate
REGULAR_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
APPLE_SIZE = 180
FAVICON_SIZES = [16, 32, 48]

def create_regular_icon(size: int) -> Image.Image:
    """Create a regular icon with rounded rectangle background."""
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))  # Transparent background
    draw = ImageDraw.Draw(img)

    # Draw rounded rectangle (blue background)
    margin = int(size * 0.08)
    bbox = [(margin, margin), (size - margin, size - margin)]
    radius = int(size * 0.15)
    draw.rounded_rectangle(bbox, radius=radius, fill=BLUE_RGB)

    # Draw text "ASK"
    try:
        # Try to use a nice font if available
        font_size = int(size * 0.4)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()

    text = "ASK"
    bbox_text = draw.textbbox((0, 0), text, font=font)
    text_width = bbox_text[2] - bbox_text[0]
    text_height = bbox_text[3] - bbox_text[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2

    draw.text((x, y), text, fill=WHITE_RGB, font=font)

    return img

def create_maskable_icon(size: int) -> Image.Image:
    """Create a maskable icon (full bleed, text in safe zone)."""
    img = Image.new('RGBA', (size, size), BLUE_RGB + (255,))
    draw = ImageDraw.Draw(img)

    # Safe zone for maskable icons (inner 80%)
    safe_margin = int(size * 0.1)

    # Draw text "ASK" in safe zone
    try:
        font_size = int(size * 0.35)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()

    text = "ASK"
    bbox_text = draw.textbbox((0, 0), text, font=font)
    text_width = bbox_text[2] - bbox_text[0]
    text_height = bbox_text[3] - bbox_text[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2

    draw.text((x, y), text, fill=WHITE_RGB, font=font)

    return img

def create_apple_touch_icon(size: int) -> Image.Image:
    """Create an Apple touch icon (no transparency, solid background)."""
    img = Image.new('RGB', (size, size), BLUE_RGB)
    draw = ImageDraw.Draw(img)

    # Draw text "ASK"
    try:
        font_size = int(size * 0.4)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()

    text = "ASK"
    bbox_text = draw.textbbox((0, 0), text, font=font)
    text_width = bbox_text[2] - bbox_text[0]
    text_height = bbox_text[3] - bbox_text[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2

    draw.text((x, y), text, fill=WHITE_RGB, font=font)

    return img

def create_favicon(size: int) -> Image.Image:
    """Create a favicon (small icon)."""
    img = Image.new('RGB', (size, size), BLUE_RGB)
    draw = ImageDraw.Draw(img)

    # For small sizes, just use a simple design
    try:
        font_size = max(4, int(size * 0.5))
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()

    text = "A"
    bbox_text = draw.textbbox((0, 0), text, font=font)
    text_width = bbox_text[2] - bbox_text[0]
    text_height = bbox_text[3] - bbox_text[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2

    draw.text((x, y), text, fill=WHITE_RGB, font=font)

    return img

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Generating icons in {OUTPUT_DIR}...")

    # Generate regular icons
    for size in REGULAR_SIZES:
        img = create_regular_icon(size)
        filename = f"{OUTPUT_DIR}/icon-{size}x{size}.png"
        img.save(filename, 'PNG')
        print(f"✓ Created {filename}")

    # Generate maskable icons
    for size in [192, 512]:
        img = create_maskable_icon(size)
        filename = f"{OUTPUT_DIR}/icon-{size}x{size}-maskable.png"
        img.save(filename, 'PNG')
        print(f"✓ Created {filename}")

    # Generate Apple touch icon
    img = create_apple_touch_icon(APPLE_SIZE)
    filename = f"{OUTPUT_DIR}/apple-touch-icon-{APPLE_SIZE}x{APPLE_SIZE}.png"
    img.save(filename, 'PNG')
    print(f"✓ Created {filename}")

    # Generate favicons
    for size in FAVICON_SIZES:
        img = create_favicon(size)
        if size == 16:
            # Save as ico format for favicon.ico
            favicon_path = f"{OUTPUT_DIR}/favicon-{size}x{size}.png"
            img.save(favicon_path, 'PNG')
            print(f"✓ Created {favicon_path}")
        else:
            filename = f"{OUTPUT_DIR}/favicon-{size}x{size}.png"
            img.save(filename, 'PNG')
            print(f"✓ Created {filename}")

    print("\n✓ All icons generated successfully!")
    print(f"Icons are located in: {OUTPUT_DIR}/")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Generate a monstera leaf app icon for Plantly.
Creates PNG files at all required Android mipmap densities.
"""

from PIL import Image, ImageDraw
import math
import os

def draw_monstera(draw, cx, cy, size, leaf_color, vein_color, hole_color):
    """
    Draw a stylized monstera leaf.
    cx, cy = center of the leaf
    size = overall bounding size
    """
    s = size / 2.0  # half-size scale factor

    # --- Main leaf shape (large rounded heart/teardrop pointing top-left) ---
    # We'll define the leaf as a polygon with bezier-like approximation
    # Monstera: broad rounded shape with characteristic splits/holes

    # Build leaf outline as a list of points (normalized -1..1, then scaled)
    # This is a stylized monstera leaf viewed straight-on
    def pt(nx, ny):
        return (cx + nx * s * 0.85, cy + ny * s * 0.85)

    # Main leaf outline - a broad kidney/heart shape
    # Top center going clockwise
    leaf_points = [
        pt(0.0,  -1.0),   # tip top
        pt(0.35, -0.85),
        pt(0.75, -0.55),
        pt(1.0,  -0.1),   # right side
        pt(0.95,  0.35),
        pt(0.7,   0.75),
        pt(0.35,  0.95),
        pt(0.0,   1.0),   # bottom center
        pt(-0.35, 0.95),
        pt(-0.7,  0.75),
        pt(-0.95, 0.35),
        pt(-1.0, -0.1),   # left side
        pt(-0.75,-0.55),
        pt(-0.35,-0.85),
    ]

    # Draw main leaf
    draw.polygon(leaf_points, fill=leaf_color)

    # --- Stem ---
    stem_w = s * 0.07
    draw.line(
        [pt(0.0, 1.0), (cx, cy + s * 1.35)],
        fill=vein_color, width=max(2, int(stem_w))
    )

    # --- Central vein ---
    vein_w = max(2, int(s * 0.045))
    draw.line(
        [pt(0.0, -0.95), pt(0.0, 0.95)],
        fill=vein_color, width=vein_w
    )

    # --- Side veins (monstera style, spreading out) ---
    vein_w2 = max(1, int(s * 0.025))
    side_veins = [
        # (start_nx, start_ny, end_nx, end_ny)
        (0.0, -0.5,  0.65, -0.65),
        (0.0, -0.5, -0.65, -0.65),
        (0.0,  0.0,  0.85,  0.05),
        (0.0,  0.0, -0.85,  0.05),
        (0.0,  0.45, 0.75,  0.6),
        (0.0,  0.45,-0.75,  0.6),
    ]
    for sx, sy, ex, ey in side_veins:
        draw.line([pt(sx, sy), pt(ex, ey)], fill=vein_color, width=vein_w2)

    # --- Monstera holes (fenestrations) ---
    # Characteristic oval slits/holes on either side
    # We'll draw ellipses with the background/hole color

    hole_w = int(s * 0.18)
    hole_h = int(s * 0.28)

    # Right holes
    hx1, hy1 = pt(0.52, -0.3)
    draw.ellipse(
        [hx1 - hole_w, hy1 - hole_h, hx1 + hole_w, hy1 + hole_h],
        fill=hole_color
    )
    hx2, hy2 = pt(0.55, 0.25)
    draw.ellipse(
        [hx2 - hole_w, hy2 - hole_h, hx2 + hole_w, hy2 + hole_h],
        fill=hole_color
    )

    # Left holes
    hx3, hy3 = pt(-0.52, -0.3)
    draw.ellipse(
        [hx3 - hole_w, hy3 - hole_h, hx3 + hole_w, hy3 + hole_h],
        fill=hole_color
    )
    hx4, hy4 = pt(-0.55, 0.25)
    draw.ellipse(
        [hx4 - hole_w, hy4 - hole_h, hx4 + hole_w, hy4 + hole_h],
        fill=hole_color
    )

    # Edge slits (open cuts from edge inward - characteristic monstera splits)
    # Right edge slit
    slit_points_r = [
        pt(0.88,  0.55),
        pt(0.62,  0.48),
        pt(0.60,  0.62),
        pt(0.85,  0.70),
    ]
    draw.polygon(slit_points_r, fill=hole_color)

    slit_points_r2 = [
        pt(0.98,  0.0),
        pt(0.72, -0.05),
        pt(0.70,  0.1),
        pt(0.95,  0.15),
    ]
    draw.polygon(slit_points_r2, fill=hole_color)

    # Left edge slit
    slit_points_l = [
        pt(-0.88,  0.55),
        pt(-0.62,  0.48),
        pt(-0.60,  0.62),
        pt(-0.85,  0.70),
    ]
    draw.polygon(slit_points_l, fill=hole_color)

    slit_points_l2 = [
        pt(-0.98,  0.0),
        pt(-0.72, -0.05),
        pt(-0.70,  0.1),
        pt(-0.95,  0.15),
    ]
    draw.polygon(slit_points_l2, fill=hole_color)


def create_icon(size):
    """Create a single icon image at given size (square)."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background: rounded rect with warm off-white / light cream
    bg_color = (240, 248, 235, 255)   # very light green-tinted white
    corner_r = int(size * 0.22)

    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=corner_r,
        fill=bg_color
    )

    # Leaf colors
    leaf_color  = (46, 125, 50, 255)    # rich green  #2E7D32
    vein_color  = (27, 94, 32, 255)     # dark green   #1B5E20
    hole_color  = bg_color              # same as background = "holes"

    # Draw the monstera leaf centered, leaf occupies ~78% of icon
    leaf_size = size * 0.72
    cx = size * 0.5
    cy = size * 0.46   # slightly above center to leave room for stem

    draw_monstera(draw, cx, cy, leaf_size, leaf_color, vein_color, hole_color)

    return img


def main():
    base = "/Users/zorandamjanac/Documents/PlatformIO/Projects/zwart-app-ai/android/app/src/main/res"

    densities = {
        "mipmap-mdpi":    48,
        "mipmap-hdpi":    72,
        "mipmap-xhdpi":   96,
        "mipmap-xxhdpi":  144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, size in densities.items():
        img = create_icon(size)
        # Save standard and round (same design, Android will clip round)
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            out_path = os.path.join(base, folder, name)
            img.save(out_path, "PNG")
            print(f"  Saved {out_path}  ({size}x{size})")

    print("\nAll icons generated successfully.")


if __name__ == "__main__":
    main()

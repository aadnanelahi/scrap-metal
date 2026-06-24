#!/usr/bin/env python3
"""
ScrapOS Marketing Content Generator

Reads calendar.json, picks today's post based on day of week,
generates image + text files in marketing/output/.

Usage:
    python content_generator.py              # Generate for today
    python content_generator.py --date 2026-06-25  # Specific date
    python content_generator.py --list       # Show upcoming posts
"""

import json, os, sys, argparse
from datetime import datetime, date
from pathlib import Path

from image_templates import generate

BASE_DIR = Path(__file__).parent
CALENDAR_PATH = BASE_DIR / "calendar.json"
OUTPUT_DIR = BASE_DIR / "output"

DAY_MAP = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2,
    "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6
}

def load_calendar():
    with open(CALENDAR_PATH, encoding="utf-8") as f:
        posts = json.load(f)
    return posts

def get_posts_for_dow(posts, dow_name):
    """Get all posts matching a given day of week."""
    return [p for p in posts if p.get("day_of_week", "").lower() == dow_name.lower()]

def get_next_post(posts, day_name, used_indices):
    """Get the first unused post for a given day."""
    day_posts = get_posts_for_dow(posts, day_name)
    for i, p in enumerate(day_posts):
        key = f"{day_name}_{i}"
        if key not in used_indices:
            return p, key
    return None, None

def load_used_index():
    """Load the tracking file of which posts have been used."""
    path = BASE_DIR / ".used_posts.json"
    if path.exists():
        with open(path) as f:
            return set(json.load(f))
    return set()

def save_used_index(used):
    path = BASE_DIR / ".used_posts.json"
    with open(path, "w") as f:
        json.dump(list(used), f)

def generate_post(post, output_dir):
    """Generate image and text files for a single post."""
    template = post["template"]
    params = post["params"]

    os.makedirs(output_dir, exist_ok=True)

    # Generate image
    img = generate(template, params)
    img_path = output_dir / "image.png"
    img.save(img_path, "PNG")
    print(f"  Image saved: {img_path}")

    # Generate text files
    en_text = f"""{params.get("headline_en", "")}

{params.get("body_en", params.get("description_en", params.get("context_en", params.get("features_en", params.get("quote_en", "")))))}

{params.get("stat", "")}

{params.get("role_en", "")}

scrapos.online
"""
    ar_text = f"""{params.get("headline_ar", "")}

{params.get("body_ar", params.get("description_ar", params.get("context_ar", params.get("features_ar", params.get("quote_ar", "")))))}

{params.get("stat", "")}

{params.get("role_ar", "")}

سكراب أوس
scrapos.online
"""
    en_path = output_dir / "post_en.txt"
    ar_path = output_dir / "post_ar.txt"
    en_path.write_text(en_text.strip(), encoding="utf-8")
    ar_path.write_text(ar_text.strip(), encoding="utf-8")
    print(f"  English text: {en_path}")
    print(f"  Arabic text: {ar_path}")

    # Generate social captions
    caption_en = f"""{params.get("headline_en", "")}

{params.get("body_en", params.get("description_en", params.get("context_en", params.get("quote_en", ""))))}

#ScrapOS #ScrapMetal #ERP #UAE #Weighbridge #Recycling #ScrapTrading

\u279c Sign up free: scrapos.online"""
    caption_ar = f"""{params.get("headline_ar", "")}

{params.get("body_ar", params.get("description_ar", params.get("context_ar", params.get("quote_ar", ""))))}

#سكراب_أوس #خردة #ERP #الإمارات #إعادة_تدوير #تجارة_الخردة

\u279c سجل مجاناً: scrapos.online"""
    cap_en_path = output_dir / "caption_en.txt"
    cap_ar_path = output_dir / "caption_ar.txt"
    cap_en_path.write_text(caption_en.strip(), encoding="utf-8")
    cap_ar_path.write_text(caption_ar.strip(), encoding="utf-8")
    print(f"  Caption EN: {cap_en_path}")
    print(f"  Caption AR: {cap_ar_path}")

    print(f"  Post generated successfully!")

def list_upcoming(posts):
    """Show the post calendar."""
    print(f"\n===== ScrapOS Content Calendar ({len(posts)} posts) =====\n")
    for day_name in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]:
        day_posts = get_posts_for_dow(posts, day_name)
        print(f"\n  {day_name} ({len(day_posts)} posts):")
        for i, p in enumerate(day_posts):
            params = p["params"]
            t = p["template"]
            en = params.get("headline_en", params.get("feature_name_en", params.get("stat_label_en", params.get("quote_en", ""))))
            ar = params.get("headline_ar", params.get("feature_name_ar", params.get("stat_label_ar", params.get("quote_ar", ""))))
            print(f"    {i+1}. [{t}] {en}")
    print("\n")

def main():
    parser = argparse.ArgumentParser(description="ScrapOS Marketing Content Generator")
    parser.add_argument("--date", help="Generate for a specific date (YYYY-MM-DD)")
    parser.add_argument("--list", action="store_true", help="Show upcoming posts")
    args = parser.parse_args()

    posts = load_calendar()
    if not posts:
        print("Error: No posts found in calendar.json")
        return

    if args.list:
        list_upcoming(posts)
        return

    # Determine target date
    if args.date:
        target = datetime.strptime(args.date, "%Y-%m-%d").date()
    else:
        target = date.today()

    day_name = target.strftime("%A")
    print(f"\n  ScrapOS Content Generator")
    print(f"  Date: {target} ({day_name})")
    print(f"  {'='*40}\n")

    if day_name in ("Saturday", "Sunday"):
        print("  Weekend — no posts scheduled. Use --date to force a date.\n")
        return

    used = load_used_index()
    post, key = get_next_post(posts, day_name, used)

    if not post:
        print(f"  All {day_name} posts have been used!")
        print("  Archive old posts or add new ones to calendar.json.\n")
        return

    slug = post["params"].get("headline_en", post["template"]).lower().replace(" ", "-")[:40]
    slug = "".join(c for c in slug if c.isalnum() or c in "-_")
    output_dir = OUTPUT_DIR / f"{target.isoformat()}_{slug}"
    
    generate_post(post, output_dir)

    used.add(key)
    save_used_index(used)
    
    print(f"\n  [OK] Post for {day_name} generated successfully!")

if __name__ == "__main__":
    main()

# ScrapOS Marketing Content Generator

Generates bilingual (English + Arabic) social media posts with branded images.

## Usage

```powershell
# Generate for today
python content_generator.py

# Generate for a specific date
python content_generator.py --date 2026-07-01

# Show upcoming posts
python content_generator.py --list
```

## Output

Each run creates a folder in `output/YYYY-MM-DD_topic/` containing:
- `image.png` — 1080×1080 branded image
- `post_en.txt` / `post_ar.txt` — Text versions of the post
- `caption_en.txt` / `caption_ar.txt` — Social media captions with hashtags

## Schedule

Posts are organized by day of week:
- **Monday** — Tips (template: `tip`)
- **Tuesday** — Features (template: `feature`)
- **Wednesday** — Industry Insights (template: `insight`)
- **Thursday** — Testimonials (template: `testimonial`)
- **Friday** — Product Updates (template: `update`)
- **Saturday/Sunday** — No posts

## Auto-Schedule (Windows Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task → Trigger: Daily at 8:00 AM
3. Action: Start a program → Program: `python`
4. Arguments: `C:\path\to\marketing\content_generator.py`
5. Start in: `C:\path\to\marketing`

## Adding Posts

Edit `calendar.json` and add new entries following the existing format.

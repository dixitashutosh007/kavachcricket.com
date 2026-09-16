# KAvach Cricket Club - Official Static Website

Modern, high-performance, single-page responsive website for **KAvach Cricket Club** ("Go Get Them ! KAvach"), ready for deployment to **AWS S3 Static Website Hosting** (with optional CloudFront CDN / Route 53 custom domain).

---

## 🏏 Club Identity & Brand System

- **Club Name**: KAvach Cricket Club
- **Tagline**: *"Cricket for All"*
- **What We Do (Core SEO/GEO Keyword)**: *"Cricket for Working Professionals in Bangalore"*
- **Slogan**: *"Go Get Them ! KAvach"*
- **Jersey Color**: **Scarlet Red** (`#D90429` / `#EF233C`)
- **Logo Color**: **Golden Yellow** (`#FFC107`) and **Black** (`#0A0B0E`)
- **Location**: Inside Play Arena, Kasavanahalli, Off Sarjapur Road, Bangalore South – 560035
- **Practice Hours**: Tuesday – Friday, 7:00 AM – 9:00 AM
- **WhatsApp**: `+91-8296211687`
- **Email**: `kavachcricketclub@gmail.com`

---

## 📁 Repository Structure

```
.
├── index.html                   # Master single-page website
├── kpl.html                     # Dedicated KPL tournament page
├── timeout.html                 # KAvach Timeout annual family sports evening page
├── policies.html                # Club policies, liability waiver & terms page
├── 404.html                     # Custom S3 404 error document
├── sitemap.xml                  # XML sitemap for search engines
├── robots.txt                   # Crawler directives
├── deploy.sh                    # One-command Git push & AWS S3 sync script
├── README.md                    # Project documentation & AWS deployment guide
└── assets/
    ├── css/
    │   ├── style.css            # Athletic design system, brand colors, typography, responsive grids
    │   └── animations.css       # Keyframe animations, scroll reveals, pulse effects, lightbox
    ├── js/
    │   └── main.js              # Mobile menu, scroll spy, animated counters, FAQ accordion, lightbox
    └── images/
        ├── logo.png             # Official crest logo (transparent PNG)
        ├── logo-crest.jpg       # Embroidered gold crest
        ├── hero-team-scarlet.jpg# First XI squad in Scarlet Red jerseys
        ├── practice-nets.jpg    # Morning practice session at Play Arena
        ├── match-day-wickets.jpg# Match day pitch & stumps
        ├── kpl-hunkaar-winner.jpg # KPL 3 Champions (KAvach Hunkaar) with trophy
        ├── timeout-tug-of-war.jpg # KAvach Timeout Tug of War showdown
        ├── timeout-family-fun.jpg # KAvach Timeout family & kids sports
        ├── timeout-awards-dinner.jpg # KAvach Timeout family dinner & awards
        ├── community-play-arena.jpg # Annual community gathering
        ├── cricket-whites-team.jpg  # Leather ball squad in cricket whites
        ├── kpl-franchise-team.jpg   # KPL franchise team (Hunkaar KAvach)
        ├── fielding-drills.jpg  # Ground fielding drills
        ├── trophy-celebration-night.jpg # Night celebration
        ├── fitness-agility.jpg  # Agility & conditioning drills
        └── README.md            # Image replacement guide
```

---

## 🚀 How to Deploy to AWS S3 Static Website Hosting

### Step 1: Create an S3 Bucket
1. Open the [AWS S3 Console](https://s3.console.aws.amazon.com/).
2. Click **Create bucket**.
3. Choose a bucket name (e.g. `kavachcricket.com` or `kavach-website`).
4. Select your preferred AWS Region (e.g. `ap-south-1` Mumbai).
5. Under **Object Ownership**, leave ACLs disabled.
6. Under **Block Public Access settings for this bucket**, uncheck "Block *all* public access" (and acknowledge the warning).
7. Click **Create bucket**.

### Step 2: Enable Static Website Hosting
1. Click your newly created bucket and go to the **Properties** tab.
2. Scroll to the bottom to **Static website hosting** and click **Edit**.
3. Select **Enable**.
4. Set:
   - **Index document**: `index.html`
   - **Error document**: `404.html`
5. Save changes. Note down the **Bucket website endpoint** URL.

### Step 3: Add Bucket Policy for Public Read Access
1. Go to the **Permissions** tab of the bucket.
2. Under **Bucket policy**, click **Edit** and paste:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```
*(Replace `YOUR-BUCKET-NAME` with your bucket name).*

### Step 4: Upload the Website Files
Upload the contents of this repository to the root of the S3 bucket:
```bash
aws s3 sync . s3://YOUR-BUCKET-NAME/ --exclude ".git/*"
```
Or simply drag-and-drop the files (`index.html`, `404.html`, `sitemap.xml`, `robots.txt`, and the `assets/` folder) directly in the AWS S3 web console.

---

## 📋 Jotform Integration Guide

In `index.html`, locate `<div class="jotform-container" id="jotformWrapper">`.

To embed your custom Jotform:
1. Go to your [Jotform](https://www.jotform.com/) dashboard -> **Publish** -> **Embed**.
2. Copy the iframe code, e.g.:
```html
<iframe
  id="JotFormIFrame-XXXXXXXXX"
  title="KAvach Cricket Club Registration Form"
  onload="window.parent.scrollTo(0,0)"
  allowtransparency="true"
  allowfullscreen="true"
  allow="geolocation; microphone; camera"
  src="https://form.jotform.com/YOUR_FORM_ID"
  frameborder="0"
  style="min-width:100%;max-width:100%;height:539px;border:none;"
  scrolling="no">
</iframe>
```
3. Paste it inside `#jotformWrapper` in `index.html` (replacing the native fallback form).

---

## 💬 WhatsApp Integration

The site includes:
- A **Floating WhatsApp Widget** fixed at the bottom-right of the screen with pulse animation.
- A **Header Quick Chat** button.
- A **Direct WhatsApp submission fallback** from the contact form.

All WhatsApp links point to `https://wa.me/918296211687` with contextual pre-filled messages (e.g., booking a trial session or subscribing to KAvach Studio plans).

---

## 🔍 SEO & AI Search Engine (GEO) Optimization

- **Semantic HTML5**: Native elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`).
- **Rich JSON-LD Schema**:
  - `SportsClub` entity with coordinates, schedule, slogan, and phone.
  - `FAQPage` entity with common questions to trigger rich search snippets on Google, Perplexity, Gemini, and ChatGPT.
- **Social Tags**: Open Graph (Facebook / LinkedIn) and Twitter Card tags.
- **Crawler Assets**: `sitemap.xml` and `robots.txt` included.

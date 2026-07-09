"""
Cold email sender - reads mails.csv (id, Company, HR Emails), merges into a
template, sends via Gmail SMTP.

SETUP (do this first):
1. pip install pandas --break-system-packages
2. Gmail App Password (NOT your regular password):
   - Enable 2FA on your Google account if not already
   - Go to https://myaccount.google.com/apppasswords
   - Generate a password for "Mail" -> copy the 16-char code
3. Edit GMAIL_USER / GMAIL_PASS below directly (hardcoded, local use only,
   never commit this file to a public GitHub repo)

CSV COLUMNS: Company, HR Emails required. Role/Hook optional -- add them to
the CSV yourself for real personalization, or edit the defaults below.
  - Hook = your 1-liner personalization for that company. Blank = flagged, not sent
        (unless you set SKIP_MISSING_HOOK = False)

USAGE:
  python send_cold_emails.py --dry-run     # preview only, sends nothing
  python send_cold_emails.py               # actually sends
"""

import pandas as pd
import smtplib
import time
import os
import sys
import argparse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ---------------- CONFIG ----------------
DATA_PATH = "./mails_fixed.csv"             # your file (csv now, not xlsx)
SENT_LOG = "sent_log.csv"             # tracks who's already been emailed
DELAY_SECONDS = 120                    # gap between sends, don't go lower
SKIP_MISSING_HOOK = True              # skip rows with no personalization hook

# just for you, hardcoded is fine locally -- but NEVER commit this file to a public repo
GMAIL_USER = "avbormalviya2006@gmail.com"
GMAIL_PASS = "xlniywdxoadilbjx"

SUBJECT_TEMPLATE = "Application for {role} — {your_name}"

BODY_TEMPLATE = """Hi team at {company},

{hook}

I'm looking for {role} opportunities and think there's a strong fit with what you're building. I've attached my resume — happy to share more context on any of my projects (ML pipelines, agentic AI systems) if useful.

Would appreciate the chance to talk.

Best,
{your_name}
{your_email}
{your_github}
"""

YOUR_NAME = "Vimal Borana"
YOUR_EMAIL = GMAIL_USER
YOUR_GITHUB = "github.com/avbormalviya"
# -----------------------------------------


def load_sent_log():
    if os.path.exists(SENT_LOG):
        return set(pd.read_csv(SENT_LOG)["HR Email"].str.lower())
    return set()


def append_sent_log(email, company, status):
    row = pd.DataFrame([{"HR Email": email, "Company": company, "status": status,
                          "timestamp": pd.Timestamp.now()}])
    header = not os.path.exists(SENT_LOG)
    row.to_csv(SENT_LOG, mode="a", header=header, index=False)


def send_email(to_email, subject, body, dry_run):
    if dry_run:
        print(f"    [DRY RUN] would send to {to_email}")
        return True
    try:
        msg = MIMEMultipart()
        msg["From"] = GMAIL_USER
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(GMAIL_USER, GMAIL_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"    FAILED: {e}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not os.path.exists(DATA_PATH):
        print(f"ERROR: {DATA_PATH} not found. Put it next to this script or edit DATA_PATH.")
        sys.exit(1)

    # auto-detect delimiter (tab, comma, whatever) instead of guessing
    df = pd.read_csv(DATA_PATH, sep=None, engine="python", on_bad_lines="skip")
    df.columns = [c.strip() for c in df.columns]

    rename_map = {}
    for col in df.columns:
        low = col.lower().strip()
        if low in ("hr emails", "hr email", "email"):
            rename_map[col] = "HR Email"
        elif low == "company":
            rename_map[col] = "Company"
        elif low == "role":
            rename_map[col] = "Role"
        elif low == "hook":
            rename_map[col] = "Hook"
    df = df.rename(columns=rename_map)

    required = {"Company", "HR Email"}
    missing = required - set(df.columns)
    if missing:
        print(f"ERROR: file missing columns: {missing}. Found columns: {list(df.columns)}")
        sys.exit(1)
    if "Role" not in df.columns:
        df["Role"] = "Data Science & Analytics"   # EDIT this default or add a Role column
    if "Hook" not in df.columns:
        df["Hook"] = ""

    sent_already = load_sent_log()
    sent_count, skipped_count, failed_count = 0, 0, 0

    for i, row in df.iterrows():
        company = str(row["Company"]).strip()
        email = str(row["HR Email"]).strip()
        role = str(row["Role"]).strip()
        hook = str(row.get("Hook", "")).strip()

        if not email or email.lower() == "nan":
            print(f"[{i}] {company}: no email, skipping")
            skipped_count += 1
            continue

        if email.lower() in sent_already:
            print(f"[{i}] {company} ({email}): already sent, skipping")
            skipped_count += 1
            continue

        if SKIP_MISSING_HOOK and (not hook or hook.lower() == "nan"):
            print(f"[{i}] {company} ({email}): NO HOOK SET, skipping (fill 'Hook' column)")
            skipped_count += 1
            continue

        subject = SUBJECT_TEMPLATE.format(role=role, your_name=YOUR_NAME)
        body = BODY_TEMPLATE.format(
            company=company, hook=hook, role=role,
            your_name=YOUR_NAME, your_email=YOUR_EMAIL, your_github=YOUR_GITHUB
        )

        print(f"[{i}] {company} ({email}) ...")
        ok = send_email(email, subject, body, args.dry_run)

        if ok:
            append_sent_log(email, company, "sent" if not args.dry_run else "dry_run")
            sent_count += 1
        else:
            append_sent_log(email, company, "failed")
            failed_count += 1

        if not args.dry_run:
            time.sleep(DELAY_SECONDS)

    print(f"\nDone. sent={sent_count} skipped={skipped_count} failed={failed_count}")
    if args.dry_run:
        print("This was a DRY RUN — nothing was actually sent. Remove --dry-run to send for real.")


if __name__ == "__main__":
    main()

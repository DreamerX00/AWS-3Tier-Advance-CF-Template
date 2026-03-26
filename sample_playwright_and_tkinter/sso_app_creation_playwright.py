import argparse
import hashlib
import os
import shutil
import sqlite3
import tempfile

import secretstorage
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from playwright.sync_api import sync_playwright

from stopwatch import StopwatchWindow


# Domains whose cookies are needed for AWS SSO + Console session
AWS_COOKIE_DOMAINS = [
    "aws",           # catches .aws.amazon.com, .signin.aws, .console.aws.amazon.com, etc.
    "app.aws",       # catches .portal.us-east-1.app.aws (the SSO portal)
    "awsapps.com",   # catches view.awsapps.com
    "amazonaws.com", # catches console subdomains
]


def get_chrome_encryption_key():
    """Retrieve Chrome's encryption password from GNOME Keyring."""
    bus = secretstorage.dbus_init()
    collection = secretstorage.get_default_collection(bus)
    if collection.is_locked():
        collection.unlock()
    for item in collection.get_all_items():
        attrs = item.get_attributes()
        if (attrs.get("xdg:schema") == "chrome_libsecret_os_crypt_password_v2"
                and attrs.get("application") == "chrome"):
            return item.get_secret()
    # Fallback for --password-store=basic
    return b"peanuts"


def decrypt_cookie_value(encrypted_value, aes_key, meta_version):
    """Decrypt a single Chrome cookie value."""
    if not encrypted_value or encrypted_value[:3] not in (b"v10", b"v11"):
        return encrypted_value.decode("utf-8", errors="replace") if encrypted_value else ""

    data = encrypted_value[3:]
    iv = b" " * 16
    cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    decrypted = decryptor.update(data) + decryptor.finalize()

    # Remove PKCS7 padding
    pad = decrypted[-1]
    if isinstance(pad, int) and 1 <= pad <= 16:
        decrypted = decrypted[:-pad]

    # Strip 32-byte SHA-256 hash prefix for meta_version >= 24
    if meta_version >= 24 and len(decrypted) > 32:
        decrypted = decrypted[32:]

    return decrypted.decode("utf-8", errors="replace")


def extract_chrome_cookies():
    """
    Extract and decrypt all AWS-related cookies from the running Chrome profile.
    Returns a list of cookie dicts in Playwright's add_cookies() format.
    """
    password = get_chrome_encryption_key()
    aes_key = hashlib.pbkdf2_hmac("sha1", password, b"saltysalt", 1, dklen=16)

    cookie_db = os.path.expanduser("~/.config/google-chrome/Default/Cookies")
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    shutil.copy2(cookie_db, tmp.name)

    try:
        conn = sqlite3.connect(tmp.name)
        cur = conn.cursor()

        cur.execute("SELECT value FROM meta WHERE key='version'")
        meta_version = int(cur.fetchone()[0])

        # Build query to match all AWS-related domains
        conditions = " OR ".join(["host_key LIKE ?"] * len(AWS_COOKIE_DOMAINS))
        params = [f"%{d}%" for d in AWS_COOKIE_DOMAINS]

        cur.execute(
            f"SELECT host_key, name, encrypted_value, path, is_secure, "
            f"expires_utc, is_httponly, samesite "
            f"FROM cookies WHERE {conditions}",
            params,
        )

        pw_cookies = []
        skipped = 0
        for host_key, name, enc_val, path, is_secure, expires_utc, is_httponly, samesite in cur.fetchall():
            value = decrypt_cookie_value(enc_val, aes_key, meta_version)
            if not value:
                continue

            # Skip cookies with empty or invalid name/domain
            if not name or not host_key:
                skipped += 1
                continue

            # Playwright requires sameSite=None cookies to be secure
            samesite_map = {-1: "None", 0: "None", 1: "Lax", 2: "Strict"}
            ss = samesite_map.get(samesite, "None")
            secure = bool(is_secure)
            if ss == "None":
                secure = True

            cookie = {
                "name": name,
                "value": value,
                "domain": host_key,
                "path": path or "/",
                "secure": secure,
                "httpOnly": bool(is_httponly),
                "sameSite": ss,
            }

            if expires_utc and expires_utc != 0:
                unix_epoch = (expires_utc / 1_000_000) - 11644473600
                # Skip expired cookies
                if unix_epoch <= 0:
                    skipped += 1
                    continue
                cookie["expires"] = unix_epoch

            pw_cookies.append(cookie)

        if skipped:
            print(f"Skipped {skipped} invalid/expired cookies.")

        conn.close()
        return pw_cookies
    finally:
        os.unlink(tmp.name)


def create_sso_app(sso_start_url, sso_region, application_name, username, password):
    """
    Automates the creation of an 'External AWS Account' application
    in AWS IAM Identity Center using Playwright.

    Extracts and decrypts cookies from your running Chrome profile,
    injects them into a fresh Playwright browser so your existing
    AWS SSO session is reused — no MFA needed.
    """
    stopwatch = StopwatchWindow()

    stopwatch.start_step("Extracting cookies")
    print("Extracting cookies from Chrome profile...")
    cookies = extract_chrome_cookies()
    print(f"Extracted {len(cookies)} AWS-related cookies.")
    stopwatch.end_step()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()

        # Inject Chrome's decrypted cookies into the Playwright context
        stopwatch.start_step("Injecting cookies")
        context.add_cookies(cookies)
        print("Injected cookies into Playwright browser context.")
        stopwatch.end_step()

        def try_dismiss_cookie_banner(target_page):
            """Dismiss AWS cookie consent banner if visible."""
            try:
                # Use JS to click the specific AWS cookie consent accept button
                dismissed = target_page.evaluate("""
                    () => {
                        const btn = document.getElementById('awsccc-cb-btn-accept');
                        if (btn) { btn.click(); return true; }
                        // Fallback: look for Accept inside a cookie consent container
                        const container = document.getElementById('awsccc-cb-content')
                            || document.querySelector('[class*="awsccc"]');
                        if (container) {
                            const b = container.querySelector('button');
                            if (b) { b.click(); return true; }
                        }
                        return false;
                    }
                """)
                if dismissed:
                    print("Dismissed cookie consent banner.")
                    target_page.wait_for_timeout(500)
                    return
            except Exception:
                pass
            # Playwright fallback if JS didn't work
            try:
                banner = target_page.locator('#awsccc-cb-btn-accept, [class*="awsccc"] button').first
                if banner.is_visible(timeout=2000):
                    banner.click()
                    print("Dismissed cookie consent banner (locator fallback).")
                    target_page.wait_for_timeout(500)
            except Exception:
                pass

        page = context.new_page()

        stopwatch.start_step("Loading SSO portal")
        print(f"Navigating to AWS SSO Start URL: {sso_start_url}")
        page.goto(sso_start_url, wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        try_dismiss_cookie_banner(page)
        stopwatch.end_step()

        try:
            # Check if injected cookies gave us an active session
            stopwatch.start_step("Login / Session reuse")
            try:
                page.wait_for_selector('text="DreamerX0"', timeout=15000)
                print("Session reused from Chrome cookies — no login needed!")
            except:
                print("Session cookies didn't work. Falling back to login flow...")
                page.wait_for_selector(
                    'input[type="text"], input[type="email"], input[name="username"]',
                    timeout=30000,
                )
                page.fill(
                    'input[type="text"]:visible, input[type="email"]:visible, input[name="username"]:visible',
                    username,
                )

                next_button = page.locator('button:has-text("Next"), button:has-text("Continue")')
                if next_button.is_visible():
                    next_button.click()

                page.wait_for_selector('input[type="password"]', timeout=30000)
                page.fill('input[type="password"]', password)
                page.click('button:has-text("Sign in"), button[type="submit"]')

                try:
                    page.wait_for_selector('text="DreamerX0"', timeout=10000)
                    print("Login successful — no MFA needed.")
                except:
                    print("=" * 60)
                    print("MFA REQUIRED — complete it in the browser window.")
                    print("Then click 'Resume' in the Playwright Inspector.")
                    print("=" * 60)
                    page.pause()
                    page.wait_for_selector('text="DreamerX0"', timeout=60000)
            stopwatch.end_step()

            # Click account "DreamerX0" and "AdministratorAccess"
            stopwatch.start_step("Selecting account")
            print("Selecting 'DreamerX0' account...")
            page.click('text="DreamerX0"')

            print("Clicking 'AdministratorAccess'...")
            with context.expect_page() as new_page_info:
                page.click('text="AdministratorAccess"')

            console_page = new_page_info.value
            console_page.set_default_navigation_timeout(60000)
            console_page.set_default_timeout(60000)
            stopwatch.end_step()

            stopwatch.start_step("Loading AWS Console")
            print("Waiting for initial console load...")
            try_dismiss_cookie_banner(console_page)
            # Wait for any common console element that indicates the session is ready
            try:
                console_page.wait_for_selector('#awsc-nav-header, #awsc-concierge-input, .awsc-swms-button', timeout=50000)
                print("AWS Console header detected.")
            except Exception:
                print("Console header not found within 60s, attempting navigation anyway.")

            try_dismiss_cookie_banner(console_page)
            stopwatch.end_step()

            stopwatch.start_step("Navigating to IAM Identity Center")
            print("Navigating to IAM Identity Center applications page...")
            console_url = f"https://{sso_region}.console.aws.amazon.com/singlesignon/home?region={sso_region}#/applications"
            # Using domcontentloaded as AWS console can take a long time to finish all network requests
            console_page.goto(console_url, wait_until="domcontentloaded", timeout=60000)
            # Short sleep to let the page settle
            console_page.wait_for_timeout(2000)
            try_dismiss_cookie_banner(console_page)

            # Wait for "Add application" — could be <a>, <button>, or any clickable element
            print("Looking for 'Add application' button...")
            app_button = console_page.get_by_text("Add application", exact=True).first
            app_button.wait_for(timeout=30000)
            stopwatch.end_step()

            stopwatch.start_step("Adding application")
            # Take a screenshot before clicking for debugging
            console_page.screenshot(path="before_add_app.png")
            app_button.click()

            # Step 1: Select application type — pick "from the catalog"
            stopwatch.start_step("Selecting catalog application")
            print("Selecting 'I want to select an application from the catalog'...")
            catalog_radio = console_page.get_by_text("I want to select an application from the catalog")
            catalog_radio.wait_for(timeout=15000)
            catalog_radio.click()
            console_page.wait_for_timeout(500)

            # Click Next to proceed to the catalog
            print("Clicking 'Next'...")
            console_page.locator('button:has-text("Next")').first.click()
            console_page.wait_for_timeout(2000)
            stopwatch.end_step()

            # Step 2: Search for "External AWS Account" in the catalog
            stopwatch.start_step("Searching External AWS Account")
            print("Searching for 'External AWS Account' in catalog...")
            search_box = console_page.get_by_placeholder("Type an application name").first
            try:
                search_box.wait_for(timeout=10000)
            except Exception:
                # Fallback: any search-like input on the page
                search_box = console_page.locator(
                    'input[type="search"], input[placeholder*="application"], input[placeholder*="earch"]'
                ).first
                search_box.wait_for(timeout=10000)
            search_box.fill("External AWS Account")
            console_page.wait_for_timeout(1500)

            # Wait for the "External AWS Account" card to appear, then click its radio
            print("Selecting 'External AWS Account' from results...")
            ext_text = console_page.get_by_text("External AWS Account", exact=True).first
            ext_text.wait_for(state="visible", timeout=10000)

            # Use JS to find the radio in the same card container as the text
            selected = console_page.evaluate("""
                () => {
                    // Find the element containing "External AWS Account"
                    const els = [...document.querySelectorAll('*')].filter(
                        el => el.textContent.trim() === 'External AWS Account' && el.children.length === 0
                    );
                    for (const el of els) {
                        // Walk up to find a parent card that contains a radio
                        let parent = el.parentElement;
                        for (let i = 0; i < 10 && parent; i++) {
                            const radio = parent.querySelector('input[type="radio"]');
                            if (radio) {
                                radio.click();
                                return true;
                            }
                            parent = parent.parentElement;
                        }
                    }
                    return false;
                }
            """)
            if selected:
                print("Selected 'External AWS Account' radio button.")
            else:
                # Fallback: just click the card text directly
                ext_text.click()
                print("Clicked 'External AWS Account' text as fallback.")

            console_page.wait_for_timeout(500)
            stopwatch.end_step()

            # Click Next to proceed to configuration
            stopwatch.start_step("Configuring application")
            print("Clicking 'Next' to configure application...")
            console_page.locator('button:has-text("Next")').first.click()
            console_page.wait_for_timeout(2000)

            # Step 3: Configure application — fill display name
            print(f"Setting application display name to: {application_name}")
            # Try multiple possible selectors for the display name input
            display_name_input = console_page.locator(
                'input[name="displayName"], '
                'input[placeholder*="Display name"], '
                'input[placeholder*="display name"], '
                'input[aria-label*="Display name"]'
            ).first
            try:
                display_name_input.wait_for(timeout=10000)
            except Exception:
                # Fallback: take screenshot and look for any text input
                console_page.screenshot(path="debug_configure_step.png")
                print("Could not find display name input by name/placeholder. Trying first visible text input...")
                display_name_input = console_page.locator('input[type="text"]').first
                display_name_input.wait_for(timeout=10000)
            display_name_input.clear()
            display_name_input.fill(application_name)
            console_page.wait_for_timeout(500)
            stopwatch.end_step()

            # Download SAML metadata if a download button/link exists
            stopwatch.start_step("Downloading SAML metadata")
            print("Looking for SAML metadata download...")
            download_btn = console_page.locator(
                'button:has-text("Download"), a:has-text("Download")'
            ).first
            try:
                download_btn.wait_for(timeout=8000)
                with console_page.expect_download() as download_info:
                    download_btn.click()
                download = download_info.value
                metadata_path = f"/tmp/{application_name}_metadata.xml"
                download.save_as(metadata_path)
                print(f"Downloaded SAML Metadata to: {metadata_path}")
            except Exception:
                print("No download button found — skipping metadata download.")
            stopwatch.end_step()

            # Submit application creation
            stopwatch.start_step("Submitting application")
            console_page.screenshot(path="before_submit.png")
            print("Submitting application creation...")
            submit_btn = console_page.locator('button:has-text("Submit")').first
            submit_btn.wait_for(timeout=10000)
            submit_btn.click()

            # Wait for success — check for success banner or redirect back to Applications list
            console_page.wait_for_timeout(2000)
            console_page.screenshot(path="after_submit.png")
            try:
                console_page.get_by_text("successfully").first.wait_for(timeout=30000)
                print(f"Successfully created SSO Application: {application_name}")
            except Exception:
                # May have redirected to the app detail page
                print(f"Submit completed. Check the console to confirm '{application_name}' was created.")
            stopwatch.end_step()

        except Exception as e:
            print(f"Error during App creation: {e}")
            page.screenshot(path="error_screenshot_portal.png")
            if "console_page" in locals():
                console_page.screenshot(path="error_screenshot_console.png")
            raise
        finally:
            stopwatch.finish()
            stopwatch.save_report(app_name=application_name)
            context.close()
            browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create AWS SSO Application")
    parser.add_argument("--sso-url", required=True, help="AWS SSO Start URL")
    parser.add_argument("--region", required=True, help="AWS Region (e.g., us-east-1)")
    parser.add_argument("--app-name", required=True, help="Name of the SSO Application")
    parser.add_argument("--username", required=True, help="Username for SSO Login")
    parser.add_argument("--password", required=True, help="Password for SSO Login")

    args = parser.parse_args()
    create_sso_app(args.sso_url, args.region, args.app_name, args.username, args.password)

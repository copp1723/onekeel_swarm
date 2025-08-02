import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Starting automated campaign creation...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  try {
    console.log('📱 Navigating to OneKeel dashboard...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // Wait a moment for the page to fully load
    await page.waitForTimeout(3000);

    console.log('🎯 Looking for Campaign Wizard...');

    // Check page title and content
    const title = await page.title();
    console.log('Page title:', title);

    // Look for campaign-related buttons
    const buttons = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll('button, a, [role="button"]')
      );
      return elements
        .map(el => ({
          text: el.textContent?.trim(),
          tag: el.tagName,
          className: el.className,
          id: el.id,
        }))
        .filter(el => el.text && el.text.length > 0);
    });

    console.log('Available buttons:', buttons.slice(0, 15));

    // Try to find campaign wizard
    const campaignButton = buttons.find(
      btn =>
        btn.text.toLowerCase().includes('campaign') ||
        btn.text.toLowerCase().includes('wizard') ||
        btn.text.toLowerCase().includes('create')
    );

    if (campaignButton) {
      console.log('✅ Found campaign button:', campaignButton);

      // Click the button
      await page.evaluate(buttonText => {
        const button = Array.from(
          document.querySelectorAll('button, a, [role="button"]')
        ).find(el => el.textContent?.trim() === buttonText);
        if (button) button.click();
      }, campaignButton.text);

      console.log('🎯 Clicked campaign button, waiting for wizard...');
      await page.waitForTimeout(2000);
    } else {
      console.log('❌ No campaign button found. Available options:');
      buttons.forEach((btn, i) => {
        if (i < 10) console.log(`  ${i + 1}. "${btn.text}" (${btn.tag})`);
      });
    }

    // Keep browser open for 30 seconds so you can see what's happening
    console.log('🎬 Keeping browser open for inspection...');
    await page.waitForTimeout(30000);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.waitForTimeout(10000);
  } finally {
    await browser.close();
    console.log('🏁 Demo completed');
  }
})();

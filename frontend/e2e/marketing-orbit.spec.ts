import { test, expect } from '@playwright/test';

test('orbit stays softly blurred below the hero and clears only at the top', async ({page,isMobile})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  const orbit=page.locator('.mk-persistent-orbit');
  await expect(orbit).toHaveCSS('position','fixed');
  if(isMobile){
    await expect(orbit).toHaveCSS('opacity','0.22');
    await expect(page.locator('.mk-solution-dim')).toBeHidden();
    return;
  }
  await expect(orbit).toHaveCSS('filter','blur(0px)');
  const steps=page.locator('.mk-step-journey');
  await steps.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
  const bounds=await steps.evaluate(el=>({top:el.getBoundingClientRect().top+scrollY,height:el.getBoundingClientRect().height}));
  await page.evaluate(y=>scrollTo(0,y),bounds.top+bounds.height*.4);
  await expect(page.locator('.mk-page')).toHaveAttribute('data-backdrop','steps');
  await expect(orbit).toHaveCSS('filter','blur(3px)');
  await expect(orbit).toHaveCSS('opacity','0.8');
  await expect(page.locator('.mk-solution-dim')).toHaveCSS('opacity','1');
  await expect(page.locator('.mk-solution-dim')).toHaveCSS('backdrop-filter','none');
  await expect(page.locator('#how-it-works-title')).toBeInViewport();
  await page.screenshot({path:test.info().outputPath('orbit-focus.png')});
  for(const selector of ['#features','#roles','#security','footer']) {
    await page.locator(selector).evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
    await expect(page.locator('.mk-page')).toHaveAttribute('data-orbit','soft');
    await expect(orbit).toHaveCSS('filter','blur(3px)');
    await expect(orbit).toHaveCSS('opacity','0.8');
    if(selector==='#roles') await page.screenshot({path:test.info().outputPath('roles-soft-background.png')});
  }
  await page.evaluate(()=>scrollTo(0,0));
  await expect(page.locator('.mk-page')).toHaveAttribute('data-orbit','clear');
  await expect(orbit).toHaveCSS('filter','blur(0px)');
  await expect(orbit).toHaveCSS('opacity','1');
});

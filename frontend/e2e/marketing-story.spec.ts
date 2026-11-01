import { test, expect } from "@playwright/test";

test('scroll stages demo columns and highlights both solution panels', async ({page,isMobile})=>{
  test.skip(isMobile, 'Mobile uses a static comparison');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  const board=page.locator('[data-story-board]');
  await board.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
  let bounds=await board.evaluate(el=>({top:el.getBoundingClientRect().top+scrollY,height:el.getBoundingClientRect().height}));
  const vh=await page.evaluate(()=>innerHeight);
  for(const [fraction,expected] of [[0, '1'],[.4,'2'],[.8,'3']] as const){
    await page.evaluate(y=>scrollTo(0,y),bounds.top-vh*.5+(bounds.height-vh*.6)*fraction+5);
    await expect(page.locator('.mk-page')).toHaveAttribute('data-board',expected);
  }
  await page.screenshot({path:test.info().outputPath('demo-complete.png')});
  const story=page.locator('.mk-solution-journey');
  await story.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
  bounds=await story.evaluate(el=>({top:el.getBoundingClientRect().top+scrollY,height:el.getBoundingClientRect().height}));
  for(const [fraction,expected] of [[.2,'before'],[.65,'after']] as const){
    await page.evaluate(y=>scrollTo(0,y),bounds.top-vh*.35+(bounds.height-vh*.35)*fraction);
    await expect(page.locator('.mk-page')).toHaveAttribute('data-solution',expected);
    await expect(page.locator('.mk-story-backdrop, .mk-person-silhouette')).toHaveCount(0);
    await expect(page.locator(`[data-side="${expected}"]`)).toHaveCSS('opacity','1');
    await expect(page.locator('#solutions-title')).toBeInViewport();
    await expect(page.locator('.mk-orbit-center')).toBeInViewport();
    const phrase = page.locator(expected === 'before' ? '.mk-off-orbit' : '.mk-orbit-center');
    await expect(phrase).toHaveCSS('color', expected === 'before' ? 'rgb(220, 38, 38)' : 'rgb(67, 56, 202)');
    await page.screenshot({path:test.info().outputPath(`solution-${expected}.png`)});
  }
});

function isMobileViewport(page: import("@playwright/test").Page) { return (page.viewportSize()?.width ?? 1280) < 1024; }


test('mobile reads naturally without feature groups, dimming or pinned comparisons', async ({page,isMobile})=>{
  test.skip(!isMobile);
  await page.goto('/#solutions');
  await expect(page.locator('.mk-solution-panel')).toHaveCount(2);
  await expect(page.locator('.mk-solution-dim')).toBeHidden();
  await expect(page.locator('.mk-solution-pin')).toHaveCSS('position','relative');
  await expect(page.locator('.mk-page')).toHaveAttribute('data-solution','none');
  await page.locator('#solutions').screenshot({path:test.info().outputPath('mobile-simple-solutions.png')});
  await page.goto('/#features');
  await expect(page.locator('.mk-feature-stacks')).toBeHidden();
  await expect(page.locator('.mk-mobile-features > li')).toHaveCount(13);
  await expect(page.locator('.mk-mobile-features')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('mobile-simple-features.png')});
});


test('feature decks flip in place without a dim overlay',async({page,isMobile})=>{
 test.skip(isMobile,'Mobile retains a flat list');
 await page.goto('/#features');
 const group=page.locator('.mk-flashcard').first();
 const cover=group.getByRole('button').first();
 await cover.hover();
 await expect(group.getByRole('region')).toHaveCount(0);
 const before=await group.boundingBox();
 await cover.press('Enter');
 const detail=group.getByRole('region');
 await expect(detail.getByRole('heading')).toHaveText('Giao việc và theo dõi');
 await expect(page.locator('.mk-feature-dim')).toHaveCount(0);
 expect(await group.boundingBox()).toEqual(before);
 await expect(detail.getByRole('button',{name:'Thẻ trước'})).toBeDisabled();
 for(let i=0;i<3;i++) await detail.getByRole('button',{name:'Thẻ tiếp'}).click();
 await expect(detail.getByRole('heading')).toHaveText('Khách hàng và bảng trắng');
 await expect(detail.getByRole('button',{name:'Thẻ tiếp'})).toBeDisabled();
 await detail.getByRole('button',{name:'Thẻ trước'}).click();
 await expect(detail.getByRole('heading')).toHaveText('Dự án liên phòng ban');
 await page.screenshot({path:test.info().outputPath('flashcard.png')});
 await page.keyboard.press('Escape');
 await expect(group.getByRole('region')).toHaveCount(0);
 await expect(cover).toBeFocused();
});

// api/manga.js
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://mangalik.net';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': `${BASE_URL}/`,
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action, slug, chapter, query, page } = req.query;

    try {
        // 1. البحث في المانهوا / المانجا
        if (action === 'search') {
            const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query || '')}&post_type=wp-manga`;
            const { data } = await axios.get(searchUrl, { headers });
            const $ = cheerio.load(data);
            const results = [];

            $('.c-tabs-item__content').each((_, el) => {
                const titleEl = $(el).find('.post-title h3 a, .post-title h4 a');
                const title = titleEl.text().trim();
                const link = titleEl.attr('href');
                const img = $(el).find('img').attr('data-src') \vert{}\vert{}$(el).find('img').attr('src');
                
                if (link && title) {
                    const mSlug = link.replace(`${BASE_URL}/manga/`, '').replace(/\//g, '');
                    results.push({ title, slug: mSlug, cover: img });
                }
            });

            return res.status(200).json({ success: true, results });
        }

        // 2. جلب أحدث المانهوات المضافة (الرئيسية)
        if (action === 'latest') {
            const pageNum = page || 1;
            const latestUrl = `${BASE_URL}/page/${pageNum}/`;
            const { data } = await axios.get(latestUrl, { headers });
            const $ = cheerio.load(data);
            const results = [];

            $('.page-item-detail, .manga-item').each((_, el) => {
                const titleEl = $(el).find('.post-title a, .item-summary h3 a');
                const title = titleEl.text().trim();
                const link = titleEl.attr('href');
                const img = $(el).find('img').attr('data-src') \vert{}\vert{}$(el).find('img').attr('src');
                const latestCh = $(el).find('.chapter-item .chapter, .list-chapter .chapter').first().text().trim();

                if (link && title) {
                    const mSlug = link.replace(`${BASE_URL}/manga/`, '').replace(/\//g, '');
                    results.push({ title, slug: mSlug, cover: img, latestChapter: latestCh });
                }
            });

            return res.status(200).json({ success: true, results });
        }

        // 3. جلب تفاصيل المانهوا وقائمة الفصول
        if (action === 'details' && slug) {
            const mangaUrl = `${BASE_URL}/manga/${slug}/`;
            const { data } = await axios.get(mangaUrl, { headers });
            const $ = cheerio.load(data);

            const title = $('.post-title h1').text().trim();
            const cover = $('.summary_image img').attr('data-src') \vert{}\vert{}$('.summary_image img').attr('src');
            const summary = $('.manga-excerpt, .summary__content').text().trim();

            const chapters = [];
            $('.wp-manga-chapter').each((_, el) => {
                const aTag = $(el).find('a');
                const chTitle = aTag.text().trim();
                const link = aTag.attr('href');
                const date = $(el).find('.chapter-release-date').text().trim();

                if (link) {
                    const chSlug = link.replace(`${BASE_URL}/manga/${slug}/`, '').replace(/\//g, '');
                    chapters.push({ title: chTitle, slug: chSlug, date });
                }
            });

            return res.status(200).json({
                success: true,
                details: { title, cover, summary, slug, chaptersCount: chapters.length, chapters }
            });
        }

        // 4. جلب صور الفصل للقراءة
        if (action === 'pages' && slug && chapter) {
            const chapterUrl = `${BASE_URL}/manga/${slug}/${chapter}/`;
            const { data } = await axios.get(chapterUrl, { headers });
            const $ = cheerio.load(data);
            const pages = [];

            $('.reading-content .page-break img').each((_, el) => {
                const src = $(el).attr('data-src') \vert{}\vert{}$(el).attr('src');
                if (src) {
                    pages.push(src.trim());
                }
            });

            return res.status(200).json({ success: true, chapter, count: pages.length, pages });
        }

        return res.status(400).json({ success: false, message: 'معلمات الطلب غير صالحة' });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

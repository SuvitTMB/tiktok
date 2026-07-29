/* =====================================================================
 * Service Worker — Branch TIKTOK, The IDOL
 *
 * มีไว้เพื่อ 2 อย่าง:
 *   1) ทำให้ Chrome/Android มองว่าเว็บนี้เป็น PWA เต็มรูปแบบ (ติดตั้งได้จริง
 *      เป็น WebAPK) เมื่อผู้ใช้กด "เพิ่มลงในหน้าจอหลัก" จะเปิดแบบไม่มี
 *      แถบ Address bar — เงื่อนไขของ Chrome คือต้องมี fetch handler
 *   2) แคชเฉพาะไฟล์ static ที่ไม่ค่อยเปลี่ยน (รูปภาพ / CSS) ให้เปิดเร็วขึ้น
 *
 * ตั้งใจ "ไม่แคช" HTML และไฟล์ JS ของแอป เพราะแอปดึงข้อมูลสด ๆ จาก Firebase
 * และไฟล์ js/apikey.js ถูกสร้างใหม่ตอน deploy — ถ้าแคชไว้จะได้ของเก่าค้าง
 *
 * หมายเหตุ: ถ้าแก้ไฟล์นี้ ให้เปลี่ยนเลข CACHE_VERSION ด้วย
 * ===================================================================== */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `branch-tiktok-static-${CACHE_VERSION}`;

// ติดตั้งทันทีโดยไม่ต้องรอให้แท็บเก่าปิด
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// ลบแคชเวอร์ชันเก่าทิ้งเมื่อ activate
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// แคชแบบ stale-while-revalidate เฉพาะรูปภาพและ CSS ใน origin เดียวกัน
// request อื่น ๆ ปล่อยผ่านไปที่ network ตามปกติ (ไม่เรียก respondWith)
self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') return;

    let url;
    try {
        url = new URL(request.url);
    } catch (e) {
        return;
    }

    if (url.origin !== self.location.origin) return;

    const isStaticAsset = /\.(png|jpe?g|gif|svg|webp|ico|css)$/i.test(url.pathname);
    if (!isStaticAsset) return;

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) =>
            cache.match(request).then((cached) => {
                const network = fetch(request)
                    .then((response) => {
                        if (response && response.status === 200 && response.type === 'basic') {
                            cache.put(request, response.clone());
                        }
                        return response;
                    })
                    .catch(() => cached);

                return cached || network;
            })
        )
    );
});

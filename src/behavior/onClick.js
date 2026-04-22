import { lazyReportBatch } from '../report';
// export default function onClick() {
//     ['mousedown', 'touchstart'].forEach((eventType) => {
//         window.addEventListener(eventType, (e) => {
//             const target = e.target;
//             console.log('click', target);
//             if (target.tagName) {
//                 const reportData = {
//                     // scrollTop: document.documentElement.scrollTop,
//                     type: 'behavior',
//                     subType: 'click',
//                     target: target.tagName,
//                     startTime: e.timeStamp,
//                     innerHtml: target.innerHTML,
//                     outerHtml: target.outerHTML,
//                     with: target.offsetWidth,
//                     height: target.offsetHeight,
//                     eventType,
//                     path: e.path,
//                 };
//                 lazyReportBatch(reportData);
//             }
//         });
//     });
// }

// 优化版
export default function onClick() {
    // 记录最后一次上报的信息，用于去重
    let lastReportedElement = null;
    let lastReportTime = 0;
    const DEBOUNCE_TIME = 300; // 去重时间窗口（毫秒）

    // 记录 touchstart 的位置，用于判断是否为滑动
    let touchStartPosition = null;

    /**
     * 检查是否应该上报此次点击事件
     * @param {Element} target - 点击目标元素
     * @param {number} timeStamp - 事件时间戳
     * @returns {boolean} - 是否应该上报
     */
    function shouldReport(target, timeStamp) {
        // 如果没有上次记录，允许上报
        if (!lastReportedElement) {
            return true;
        }

        // 判断是否为同一元素
        const isSameElement = lastReportedElement === target;

        // 判断是否在去重时间窗口内
        const isWithinDebounceWindow = timeStamp - lastReportTime < DEBOUNCE_TIME;

        // 如果是同一元素且在去重窗口内，不上报（避免 touchstart 和 mousedown 重复上报）
        if (isSameElement && isWithinDebounceWindow) {
            return false;
        }

        return true;
    }

    /**
     * 上报点击行为数据
     * @param {Element} target - 点击目标元素
     * @param {string} eventType - 事件类型
     * @param {number} timeStamp - 事件时间戳
     */
    function reportClick(target, eventType, timeStamp) {
        if (!target.tagName) {
            return;
        }

        // 去重检查
        if (!shouldReport(target, timeStamp)) {
            return;
        }

        // 更新最后上报记录
        lastReportedElement = target;
        lastReportTime = timeStamp;

        const reportData = {
            type: 'behavior',
            subType: 'click',
            target: target.tagName.toLowerCase(),
            startTime: timeStamp,
            // 限制 innerHTML 大小，避免数据过大
            innerHtml: target.innerHTML.slice(0, 500),
            // 限制 outerHTML 大小
            outerHtml: target.outerHTML.slice(0, 500),
            width: target.offsetWidth,
            height: target.offsetHeight,
            eventType,
            // 获取元素选择器路径，便于定位问题
            selector: getSelectorPath(target),
            // 获取页面滚动位置
            scrollTop: window.pageYOffset || document.documentElement.scrollTop,
            // 页面信息
            pageUrl: window.location.href,
        };

        lazyReportBatch(reportData);
    }

    /**
     * 获取元素的选择器路径
     * @param {Element} element - DOM 元素
     * @returns {string} - 选择器路径
     */
    function getSelectorPath(element) {
        const path = [];
        let current = element;

        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            // 添加 id 选择器
            if (current.id) {
                selector += `#${current.id}`;
                path.unshift(selector);
                break; // 有 id 就可以唯一定位，停止向上查找
            }

            // 添加 class 选择器（只取第一个有意义的 class）
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\s+/).filter(Boolean);
                if (classes.length > 0) {
                    selector += `.${classes[0]}`;
                }
            }

            // 添加索引（如果有同名兄弟元素）
            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(
                    (child) => child.tagName === current.tagName
                );
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-of-type(${index})`;
                }
            }

            path.unshift(selector);
            current = current.parentElement;

            // 限制路径深度，避免过长
            if (path.length >= 5) {
                break;
            }
        }

        return path.join(' > ');
    }

    // 监听 mousedown 事件（主要针对桌面端）
    window.addEventListener('mousedown', (e) => {
        reportClick(e.target, 'mousedown', e.timeStamp);
    });

    // 监听 touchstart 事件（主要针对移动端）
    window.addEventListener('touchstart', (e) => {
        // 记录触摸起始位置
        const touch = e.touches[0];
        touchStartPosition = {
            x: touch.clientX,
            y: touch.clientY,
            timeStamp: e.timeStamp,
        };
    });

    // 监听 touchend 事件，判断是否为有效点击（非滑动）
    window.addEventListener('touchend', (e) => {
        // 如果没有 touchstart 记录，忽略
        if (!touchStartPosition) {
            return;
        }

        // 获取触摸结束位置
        const touch = e.changedTouches[0];
        const endX = touch.clientX;
        const endY = touch.clientY;

        // 计算移动距离
        const moveDistance = Math.sqrt(
            Math.pow(endX - touchStartPosition.x, 2) +
                Math.pow(endY - touchStartPosition.y, 2)
        );

        // 如果移动距离小于 10px，认为是点击而非滑动
        const CLICK_THRESHOLD = 10;
        if (moveDistance < CLICK_THRESHOLD) {
            reportClick(e.target, 'touchstart', touchStartPosition.timeStamp);
        }

        // 清除记录
        touchStartPosition = null;
    });
}
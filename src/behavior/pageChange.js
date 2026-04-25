import { lazyReportBatch } from '../report';
import {generateUniqueId} from '../utils';
export default function pageChange() {
    // hash histroy
    let oldUrl = '';
    window.addEventListener(
        'hashchange',
        function (event) {
            const newUrl = event.newURL;
            const reportData = {
                form: oldUrl,
                to: newUrl,
                type: 'behavior',
                subType: 'hashchange',
                startTime: performance.now(),
                uuid: generateUniqueId(),
            };
            lazyReportBatch(reportData);
            oldUrl = newUrl;
        },
        true
    );

    let from = '';
    window.addEventListener(
        'popstate',
        function (event) {
            const to = window.location.href;
            const reportData = {
                form: from,
                to: to,
                type: 'behavior',
                subType: 'popstate',
                startTime: performance.now(),
                uuid: generateUniqueId(),
            };
            lazyReportBatch(reportData);
            from = to;
        },
        true
    );

}
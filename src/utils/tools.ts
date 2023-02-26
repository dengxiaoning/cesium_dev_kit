// 判断浏览器及终端
const os = (u: string = window?.navigator.userAgent): Record<string, boolean> => {
    return {
        isMobile: !!u.match(/AppleWebKit.*Mobile/i) || !!u.match(/MIDP|SymbianOS|NOKIA|SAMSUNG|LG|NEC|TCL|Alcatel|BIRD|DBTEL|Dopod|PHILIPS|HAIER|LENOVO|MOT-|Nokia|SonyEricsson|SIE-|Amoi|ZTE/),
        isWechat: !!u.match(/MicroMessenger/i),
        isQQ: !!u.match(/QQ/i) && !u.match(/MQQBrowser/i),
        isIos: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/),
        isAndroid: !!u.match(/(Android);?[\s/]+([\d.]+)?/),
        isiPhone: !!u.match(/(iPhone\sOS)\s([\d_]+)/),
        isSafari: !!u.match(/Safari/),
        isFirefox: !!u.match(/Firefox/),
        isOpera: !!u.match(/Opera/),
        isChrome: u.match(/Chrome/i) !== null && u.match(/Version\/\d+\.\d+(\.\d+)?\sChrome\//i) === null,
        isDeskTop: ((): boolean => {
            const AgentList: Array<string> = ['Android', 'iPhone', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod'];
            return !AgentList.some(item => u.includes(item));
        })()
    };
};

// 时间补零
const fillZero = (n: number): string => n < 10 ? '0' + n : '' + n;

// 加
const add = (arg1: number, arg2: number): number => {
    let r1: number, r2: number;

    try {
        r1 = arg1.toString().split('.')[1].length;
    } catch (e) {
        r1 = 0;
    }

    try {
        r2 = arg2.toString().split('.')[1].length;
    } catch (e) {
        r2 = 0;
    }

    const c: number = Math.abs(r1 - r2);
    const m: number = Math.pow(10, Math.max(r1, r2));

    if (c > 0) {
        const cm: number = Math.pow(10, c);
        if (r1 > r2) {
            arg1 = Number(arg1.toString().replace('.', ''));
            arg2 = Number(arg2.toString().replace('.', '')) * cm;
        } else {
            arg1 = Number(arg1.toString().replace('.', '')) * cm;
            arg2 = Number(arg2.toString().replace('.', ''));
        }
    } else {
        arg1 = Number(arg1.toString().replace('.', ''));
        arg2 = Number(arg2.toString().replace('.', ''));
    }

    return (arg1 + arg2) / m;
};
// 减
const subtract = (arg1: number, arg2: number): number => {
    let r1: number, r2: number;

    try {
        r1 = arg1.toString().split('.')[1].length;
    } catch (e) {
        r1 = 0;
    }

    try {
        r2 = arg2.toString().split('.')[1].length;
    } catch (e) {
        r2 = 0;
    }

    const m: number = Math.pow(10, Math.max(r1, r2));
    const n: number = (r1 >= r2) ? r1 : r2;

    return Number((((arg1 * m) - (arg2 * m)) / m).toFixed(n));
};
// 乘
const multiply = (arg1: number, arg2: number): number => {
    let m = 0;
    const s1: string = arg1.toString();
    const s2: string = arg2.toString();

    try {
        m += s1.split('.')[1].length;
    } catch (e) {
    }

    try {
        m += s2.split('.')[1].length;
    } catch (e) {
    }

    return Number(s1.replace('.', '')) * Number(s2.replace('.', '')) / Math.pow(10, m);
};
// 除
const divide = (arg1: number, arg2: number): number => {
    let t1: number, t2: number;

    try {
        t1 = arg1.toString().split('.')[1].length;
    } catch (e) {
        t1 = 0;
    }

    try {
        t2 = arg2.toString().split('.')[1].length;
    } catch (e) {
        t2 = 0;
    }

    const r1 = Number(arg1.toString().replace('.', ''));
    const r2 = Number(arg2.toString().replace('.', ''));

    return +(r1 / r2) * Math.pow(10, t2 - t1);
};

/**
 * 生成uuid
 * @param {number} len 长度
 * @param {number} radix 进制
 */
const uuid = (len: number, radix: number): string => {
    const chars: Array<string> = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    const uuid: Array<string> = [];
    radix = radix || chars.length;

    if (len) {
        // Compact form
        for (let i = 0; i < len; i++) {
            uuid[i] = chars[0 | Math.random() * radix];
        }
    } else {
        // rfc4122, version 4 form
        let r: number;

        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';

        /*
         * Fill in random data.  At i===19 set the high bits of clock sequence as
         * per rfc4122, sec. 4.1.5
         */
        for (let i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random() * 16;
                uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }

    return uuid.join('').toLowerCase();
};

// 价格格式化(分到元)
const priceFilter = (num: number | string): number => {
    if (!num) return 0;
    // 转类型
    num = +num;
    return +divide(num, 100).toFixed(2);
};

/*
 * 价格格式化
 * @number 原始数据
 * @decimals 保留几位小数，默认2
 * @decPoint 小数点号，默认'.'
 * @thousands 千分点号，默认','
 */
const decimalFormat = (number: (number | string), decimals?: number, decPoint?: string, thousandsSep?: string): string => {
    number = (number + '').replace(/[^0-9+-Ee.]/g, '');
    decimals = decimals === undefined ? 2 : decimals; // 默认保留2位
    decPoint = decPoint || '.'; // 默认是'.';
    thousandsSep = thousandsSep || ','; // 默认是',';
    const n = !isFinite(+number) ? 0 : +number;
    const prec = !isFinite(+decimals) ? 0 : Math.abs(decimals);
    const sep = (typeof thousandsSep === 'undefined') ? ',' : thousandsSep;

    const dec = (typeof decPoint === 'undefined') ? '.' : decPoint;
    let s = [];
    const toFixedFix = (n: number, prec: number): string => {
        const k = Math.pow(10, prec);

        return '' + (parseFloat(Math.round(parseFloat((n * k).toFixed(prec * 2))).toFixed(prec * 2)) / k);
    };
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    const re = /(-?\d+)(\d{3})/;
    while (re.test(s[0])) {
        s[0] = s[0].replace(re, '$1' + sep + '$2');
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
};

// 手机号隐藏
const phoneFilter = (phone: number | string): string => {
    if (!phone) return '';
    // 转类型
    phone = phone + '';
    return phone.substr(0, 3) + '****' + phone.substr(7);
};

// 查看更多
const readMore = (text: string, length: number, suffix = ''): string => {
    if (!text) return text;
    return text.substring(0, length) + suffix;
};

// 解析url
const queryParse = (href: string): Record<string, string> => {
    if (!href) return {};
    const response: Record<string, string> = {};
    href = decodeURIComponent(href);
    const strs: string = href.split('?')[1];
    if (!strs) return response;
    const strArr = strs.split('&');
    for (let i = 0, LEN = strArr.length; i < LEN; i++) {
        response[strArr[i].split('=')[0]] = strArr[i].split('=')[1];
    }
    return response;
};

// url拼接
const queryConcat = (query: Record<string, string>): string => {
    let url = '';
    for (const k in query) {
        const value = query[k] !== undefined ? query[k] : '';
        url += '&' + k + '=' + encodeURIComponent(value);
    }
    return url ? url.substring(1) : '';
};

// 校准时区
const adjustTime = (time: (number | string) = Date.now(), targetTimezone = -8): number => {
    // 常量表示几个常数
    const HOUR_MS = 60 * 60 * 1000;
    const MINUTE_MS = 60 * 1000;

    // 当前时区与中时区时差,以min为维度
    const diff = new Date().getTimezoneOffset();
    // 目标时区 = 本地时区时间 + 本地时区时差 - 目标时区时差
    const targetTime = new Date(time).getTime() + (diff * MINUTE_MS) - (targetTimezone * HOUR_MS);

    return targetTime;
};

// 倒计时
interface CountDownParams {
    time: number | string;
    type: string;
    readonly remain?: boolean;
}
const countDown = ({ time, type, remain }: CountDownParams): Record<string, (string | boolean)> => {
    let delta = 0;
    // 是否为剩余时间戳
    if (remain) {
        delta = +time;
    } else {
        // 时间戳转number
        if (!isNaN(+time)) time = +time;
        // 兼容safari
        time = (time as string).split('-').join('/');
        time = (time as string).split('.').join('/');

        delta = new Date(adjustTime(time)).getTime() - new Date(adjustTime()).getTime();
    }
    if (delta <= 0) {
        return {
            over: true
        };
    }

    // 常量表示几个常数
    const DAY_MS = 24 * 60 * 60 * 1000;
    const HOUR_MS = 60 * 60 * 1000;
    const MINUTE_MS = 60 * 1000;
    const SECOND_MS = 1000;

    let [days, hours, mins, secs] = [0, 0, 0, 0];
    switch (type) {
        case 'DD:HH:MM:SS':
            // 计算天数
            days = Math.floor(delta / DAY_MS);
            // 计算小时数
            hours = Math.floor((delta - (days * DAY_MS)) / HOUR_MS);
            // 计算分钟数
            mins = Math.floor((delta - (days * DAY_MS) - (hours * HOUR_MS)) / MINUTE_MS);
            // 计算秒数
            secs = Math.floor((delta - (days * DAY_MS) - (hours * HOUR_MS) - (mins * MINUTE_MS)) / SECOND_MS);
            break;
        case 'HH:MM:SS':
            hours = Math.floor(delta / HOUR_MS);
            mins = Math.floor((delta - (hours * HOUR_MS)) / MINUTE_MS);
            secs = Math.floor((delta - (hours * HOUR_MS) - (mins * MINUTE_MS)) / SECOND_MS);
            break;
        case 'MM:SS':
            mins = Math.floor(delta / MINUTE_MS);
            secs = Math.floor((delta - (mins * MINUTE_MS)) / SECOND_MS);
            break;
        case 'SS':
            secs = Math.floor(delta / SECOND_MS);
            break;
        default:
            hours = Math.floor(delta / HOUR_MS);
            mins = Math.floor((delta - (hours * HOUR_MS)) / MINUTE_MS);
            secs = Math.floor((delta - (hours * HOUR_MS) - (mins * MINUTE_MS)) / SECOND_MS);
            break;
    }

    return {
        days: fillZero(days), hours: fillZero(hours), mins: fillZero(mins), secs: fillZero(secs)
    };
};

class FunctionType extends Function {
}

// 过滤空格
const trimEmpty = (value: string): string => value.replace(/\s+/g, '');

// 富文本转换
const textTohtml = (text: string): string => {
    const link = /(http|https):\/\/([\w.]+\/?)\S*/;
    const email = /([A-Za-z0-9_\-.])+@([A-Za-z0-9_\-.])+\.([A-Za-z]{2,4})/;
    // 匹配http｜https链接
    let html: string = text.replace(link, ($1): string => {
        return `<a class="link" href="${$1}" target="_blank">${$1}</a>`;
    });
    // 匹配邮箱
    html = html.replace(email, ($1): string => {
        return `<a class="email" href="mailto:${$1}" target="_blank">${$1}</a>`;
    });
    // 匹配换行
    html = html.replace(/\r|\n/g, '<br>');
    return `<p>${html}</p>`;
};

export {
    os, fillZero, add, subtract, multiply, divide, uuid, phoneFilter, readMore, priceFilter,
    adjustTime, countDown, queryParse, queryConcat, trimEmpty, textTohtml,
    decimalFormat
};

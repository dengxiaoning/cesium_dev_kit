var util = {};

/**
 * 获取插件的基本路径
 */
(function () {
    var cesiumScriptRegex = /((?:.*\/)|^)cesiumGeometry[\w-]*\.js(?:\W|$)/i;

    function getBaseUrlFromCesiumScript() {
        var scripts = document.getElementsByTagName('script');
        for (var i = 0, len = scripts.length; i < len; ++i) {
            var src = scripts[i].getAttribute('src');
            var result = cesiumScriptRegex.exec(src);
            if (result !== null) {
                return result[1];
            }
        }
        return undefined;
    }

    var baseUrl = undefined;
    util.getBaseUrl = function () {
        if (baseUrl === undefined) {
            baseUrl = getBaseUrlFromCesiumScript();
        }
        return baseUrl;
    };
})();

export {util};
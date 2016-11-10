;(function() {
    /**
     *  This is in no way a proper shim, but it'll work fine here.
     */
    var filter = function(data, fn) {
        var results = [], val, l = data.length, i = 0;
        for(; i < l; i++) {
            val = data[i];
            if(fn.call(val, i)) results.push(val);
        }

        return results;
    };

    /**
     *  Same as filter, good enough.
     */
    var map = function(data, fn) {
        var results = [], l = data.length, i = 0;
        for(; i < l; i++) {
            results.push(fn.call(data[i], i));
        }
        return results;
    };

    /**
     *  An incredibly basic extend method. Suitable for this library but you really shouldn't repeat this
     *  verbatim. Doesn't do deep copying because screw it.
     */
    var extend = function(defaults, options) {
        var extended = {};

        for(var prop in defaults) {
            if(Object.prototype.hasOwnProperty.call(defaults, prop)) {
                extended[prop] = defaults[prop];
            }
        }

        for(var prop in options) {
            if(Object.prototype.hasOwnProperty.call(options, prop)) {
                extended[prop] = options[prop];
            }
        }

        return extended;
    };

    /**
     *  Incredibly generic event handlers
     */
    var on = function(node, evt, fn) {
        if(node['addEventListener']) node.addEventListener(evt, fn, false);
        else node.attachEvent('on'+evt, fn);
    };

    var off = function(node, evt, fn) {
        if(node['removeEventListener']) node.removeEventListener(evt, fn, false);
        else node.detachEvent('on'+evt, fn);
    };

    /**
     *  Commonly used, ish
     */
    var vexOpen = function() {
        var regexp = new RegExp('/' + vex.baseClassNames.open + '/');
        if(!regexp.test(document.body.className))
            document.body.className += ' ' + vex.baseClassNames.open;
    };

    var vexClose = function() {
        if(!vex.getAllVexes().length)
            return document.body.className = document.body.className.replace(vex.baseClassNames.open, '');
    };

    on(window, 'keyup', function(e) {
        e = e || window.event;
        if(e.keyCode === 27)
            return vex.closeByEscape();
    });

    /**
     *  Checking the style property is a decent indicator for animationend support, but in practice some of the browsers get... weird
     *  when it comes to which event names they actually use. This extends what Vex was originally doing.
     */
    var s = (document.body || document.documentElement).style,
        animationEndSupport  = s.animation !== void 0 || s.WebkitAnimation !== void 0 || s.MozAnimation !== void 0 || s.MsAnimation !== void 0 || s.OAnimation !== void 0,
        animationEndNames = ['animationend', 'webkitAnimationEnd', 'MozAnimationEnd', 'oAnimationEnd'],
        animationend = function(elem, callback) {
            var handler = function(e) {
                if(animationEndNames) {
                    var animationendName = e.type;
                    animationend = function(elem, callback) {
                        var fn = function() {
                            callback();
                            off(elem, animationendName, fn);
                        };
                        on(elem, animationendName, fn);
                    };

                    // Go through and remove the alternative ones right quick
                    for(var i = 0, len = animationEndNames.length; i < len; i++) {
                        off(elem, animationEndNames[i], handler);
                    }
                    animationEndNames = null;
                }

                return callback.call(elem, e);
            };

            for(var i = 0, len = animationEndNames.length;  i < len; i++) {
                on(elem, animationEndNames[i], handler);
            }
        };

    /**
     *  The meat and potatoes.
     */
    var vexFactory = function() {
        return {
            globalID: 1,

            /**
             *  Default options. If you want to apply custom CSS, do it with special class names. ;P
             */
            defaultOptions: {
                content: '',
                showCloseButton: true,
                escapeButtonCloses: true,
                overlayClosesOnClick: true,
                appendLocation: document.body,
                className: 'vex-theme-default',
                overlayClassName: '',
                contentClassName: '',
                closeClassName: ''
            },

            /**
             *  This should be self-explanatory.
             */
            baseClassNames: {
                vex: 'vex',
                content: 'vex-content',
                overlay: 'vex-overlay',
                close: 'vex-close',
                closing: 'vex-closing',
                open: 'vex-open'
            },

            open: function(options) {
                options = extend(vex.defaultOptions, options);
                options.id = vex.globalID;
                vex.globalID += 1;

                options.overlay = document.createElement('div');
                options.overlay.className = [vex.baseClassNames.overlay, options.overlayClassName].join(' ');
                options.overlay.data = options;

                options.contentNode = document.createElement('div');
                options.contentNode.className = [vex.baseClassNames.content, options.contentClassName].join(' ');
                options.contentNode.data = options;
                options.contentNode.innerHTML = options.content;

                if(options.showCloseButton) {
                    options.closeButton = document.createElement('div');
                    options.closeButton.className = [vex.baseClassNames.close, options.closeClassName].join(' ');
                    options.closeButton.data = options;
                    on(options.closeButton, 'click', function(e) {
                        return vex.close(this.data.vex.id);
                    });

                    options.contentNode.appendChild(options.closeButton);
                }

                options.vex = document.createElement('div');
                options.vex.className = [vex.baseClassNames.vex, options.className].join(' ');
                options.vex.data = options;
                options.vex.appendChild(options.overlay);
                options.vex.appendChild(options.contentNode);
                options.appendLocation.appendChild(options.vex);

                if(options.afterOpen) {
                    options.afterOpen(options.contentNode, options);
                }

                setTimeout((function() {
                    return vexOpen(options.contentNode, options);
                }), 0);

                return options.contentNode;
            },

            getAllVexes: function() {
                return Array.prototype.slice.call(document.querySelectorAll('.' + vex.baseClassNames.vex + ':not(.' + vex.baseClassNames.closing + ') .' + vex.baseClassNames.content), 0);
            },

            getVexByID: function(id) {
                return filter(vex.getAllVexes(), function(i) {
                    return this.data.vex.id === id;
                });
            },

            close: function(id) {
                var $lastVex;
                if(!id) {
                    $lastVex = vex.getAllVexes().slice(-1)[0];
                    if(!$lastVex)
                        return false;

                    id = $lastVex.data.vex.id;
                }

                return vex.closeByID(id);
            },

            closeAll: function() {
                var ids = map(vex.getAllVexes(), function() {
                    return $(this).data().vex.id;
                });

                if(!(ids != null ? ids.length : void 0))
                    return false;

                var reversed = ids.reverse(), l = reversed.length, i = 0;
                for(; i < l; i++) {
                    vex.closeByID(reversed[i]);
                }

                return true;
            },

            closeByID: function(id) {
                var content = vex.getVexByID(id);
                if(!content.length) return;
                content = content[0];

                var el = content.data.vex;
                    options = extend({}, content.data.vex),
                    beforeClose = function() {
                        if(options.beforeClose)
                            return options.beforeClose(content, options);
                    },
                    close = function() {
                        vexClose(content, options);
                        el.parentNode.removeChild(el);
                        if(options.afterClose)
                            return options.afterClose(content, options);
                    };

                if(animationEndSupport) {
                    beforeClose();
                    animationend(el, close);
                    el.className += ' ' + vex.baseClassNames.closing;
                } else {
                    beforeClose();
                    close();
                }

                return true;
            },

            closeByEscape: function() {
                var ids = map(vex.getAllVexes(), function() {
                        return $(this).data().vex.id;
                    });

                if(!(ids != null ? ids.length : void 0))
                    return false;

                var id = Math.max.apply(Math, ids);
                var lastVex = vex.getVexByID(id);
                if(lastVex.data.vex.escapeButtonCloses !== true)
                    return false;

                return vex.closeByID(id);
            }
        };
    };

    if(typeof define === 'function' && define.amd) {
        define(['vex'], vexFactory);
    } else if(typeof exports === 'object') {
        module.exports = vexFactory();
    } else {
        window.vex = vexFactory();
    }
}).call(this);

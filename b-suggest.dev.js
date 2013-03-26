;Suggest = (function() {


    /**
     * Simple suggest module
     *
     * @author      Shushik <silkleopard@yandex.ru>
     * @version     1.0
     *
     * @constructor
     *
     * @this   {Suggest}
     * @param  {DOMNode}
     * @param  {DOMNode}
     * @param  {object}
     * @param  {object}
     * @return {DOMNode}
     */
    function
        Suggest(block, field, params, handlers) {
            handlers = handlers || {};

            if (arguments && arguments.length > 2) {
                this.init(block, field, params, handlers);
            }

            return this;
        };

    Suggest.prototype = {
        /**
         * Init the suggest module
         *
         * @this   {Suggest}
         * @param  {DOMNode}
         * @param  {DOMNode}
         * @param  {object}
         * @param  {object}
         * @return {DOMNode}
         */
        init : function(target, field, params, handlers) {
            params   = params   || {};
            handlers = handlers || {};

            var
                alias = '';

            /**
             * Visibility indicator
             *
             * @value {boolean}
             */
            this.shown = false;

            /**
             * Groups layout indicator
             *
             * @value {boolean}
             */
            this.grouped = false;

            /**
             * Abort indicator
             *
             * @private
             *
             * @value {boolean}
             */
            this._aborted = false;

            /**
             * Number of items
             *
             * @value {number}
             */
             this.items = 0;

            /**
             * Origin of searching text
             *
             * @private
             *
             * @value {string}
             */
            this._saved = '';

            /**
             * Timer for typing
             *
             * @private
             *
             * @value {number}
             */
            this._timer = null;

            /**
             * Nodes list
             *
             * @private
             *
             * @value {object}
             */
            this._nodes = {
                block  : null,
                items  : {
                    loop   : 0,
                    total  : 0,
                    list   : []
                },
                groups : [],
                field  : field,
                target : target
            };

            // Clone groups if exist
            if (params.groups && !this._groups) {
                /**
                 * Groups list
                 *
                 * @private
                 *
                 * @value {Array}
                 */
                this._groups = [].concat(params.groups);

                // Set the layout indicator to true
                this.grouped = true;
            }

            /**
             * Links to the events handlers
             *
             * @private
             *
             * @value {Array}
             */
            this._events = [];

            /**
             * Saved user`s config
             *
             * @private
             *
             * @value {object}
             */
            this._params = {};

            for (alias in params) {
                this._params[alias] = params[alias];
            }

            /**
             * User given handlers
             *
             * @private
             *
             * @value {object}
             */
            this._handlers = handlers;

            this._install();

            return this;
        },
        /**
         * Show the suggest block
         *
         * @this   {Suggest}
         * @param  {Boolean|Array}
         * @param  {string}
         * @return {DOMNode}
         */
        show : function(data, tmpl) {
            data = data || false;
            tmpl = tmpl || '{{name}}';
            pos  = pos  || {};

            var
                loop   = 0,
                alias  = '',
                ignore = this._params.offset_ignore,
                block  = this._nodes.block,
                pos    = this._offsetize(this._nodes.field, this._nodes.target),
                target = this._nodes.target;

            this._saved = this._nodes.field.value;

            if (this._aborted) {
                this._aborted = false;

                return this._nodes.block;
            }

            // Redraw the DOM
            if (typeof data == 'object') {
                this._draw(data, tmpl);
            }

            if (this._nodes.items.list.length > 0) {
                // Make dropdown visible
                block.className += ' b-suggest_is_visible';

                // Turn on visibility indicator
                this.shown = true;

                // Move block scroll to the first child
                this.hover(0, true);

                // Apply offset properties
                if (ignore !== true && ignore != 'all') {
                    if (ignore != 'top') {
                        block.style.top = (pos.top + pos.height) + 'px';
                    }

                    if (ignore != 'left') {
                        block.style.left = pos.left + 'px';
                    }

                    block.style.width = pos.width + 'px';
                }
            }

            return this._nodes.block;
        },
        /**
         * Go to the previous item
         *
         * @this   {Suggest}
         * @return {DOMNode}
         */
        prev : function() {
            var
                items = this._nodes.items,
                loop  = items.loop,
                end   = items.total - 1;

            if (loop == 0) {
                loop = end;
            } else {
                loop--;
            }

            this.hover(loop, true);

            return items[loop];
        },
        /**
         * Go to the next item
         *
         * @this   {Suggest}
         * @return {DOMNode}
         */
        next : function() {
            var
                items = this._nodes.items,
                loop  = items.loop,
                end   = items.total - 1;

            if (loop == end) {
                loop = 0;
            } else {
                loop++;
            }

            this.hover(loop, true);

            return items[loop];
        },
        /**
         * Hide the suggest block
         *
         * @this   {Suggest}
         * @param  {boolean}
         * @return {Undefined}
         */
        hide : function(save) {
            // Make dropdown invisible
            this._nodes.block.className = this._nodes.block.className
                                          .replace(' b-suggest_is_visible', '');

            // Turn off visibility indicator
            this.shown = false;

            if (this._aborted) {
                this._aborted = false;
            }

            // Clean saved word
            if (!save) {
                this._saved = '';
            }

            return this;
        },
        /**
         * Select hovered or choosed by keyboard element
         *
         * @this   {Suggest}
         * @param  {number}
         * @param  {boolean}
         * @return {DOMNode}
         */
        hover : function(loop, scroll) {
            loop = loop >= 0 ? loop : this._nodes.items.loop;

            var
                list = this._nodes.items.list,
                curr = list[this._nodes.items.loop] ? list[this._nodes.items.loop] : list[0],
                node = list[loop] ? list[loop] : list[0],
                top  = this._offsetize(node, this._nodes.block).top;

            // Unhover currently hovered node
            curr.className = 'b-suggest__item';

            // Hover the chosen node
            node.className = 'b-suggest__item ' +
                             'b-suggest__item_is_hovered';

            // Scroll block to the hovered node
            if (scroll) {
                if (this.grouped) {
                    if (loop == 0) {
                        node.parentNode.parentNode.scrollTop = node.parentNode.offsetTop;
                    } else {
                        node.parentNode.parentNode.scrollTop = node.offsetTop;
                    }
                } else {
                    node.parentNode.scrollTop = node.offsetTop;
                }
            }

            // Save the set position
            this._nodes.items.loop = loop;

            return this._nodes.block;
        },
        /**
         * Remove
         *
         * @this   {Suggest}
         * @return {undefined}
         */
        uninstall : function() {
            var
                events = this._events.length,
                event  = null,
                child  = this._nodes.block,
                parent = this._nodes.target;

            // Remove all attached events
            for (pos = 0; pos < events; pos++) {
                event = this._events[pos];

                this._unbind(event.target, event.alias, event.handler);
            }

            // Remove properties
            delete this.shown;
            delete this._timer;
            delete this._saved;
            delete this._nodes;
            delete this._events;
            delete this._params;
            delete this._aborted;
            delete this._handlers;

            //
            parent.removeChild(child);
        },
        /**
         * Create DOM for suggest dropdown
         *
         * @private
         *
         * @this   {Suggest}
         * @return {undefined}
         */
        _install : function() {
            var
                alias = '',
                value = '',
                nodes = this._nodes;

            // Turn off browser`s autocomplete
            this._saved = nodes.field.value;
            nodes.field.setAttribute('autocomplete', 'off');
            nodes.field.className += ' b-suggest__field';

            // Create and append main div
            nodes.block = document.createElement('div');
            nodes.block.className = 'b-suggest';
            nodes.target.appendChild(nodes.block);

            // Set user defined id
            if (this._params.id) {
                nodes.block.className += ' b-suggest_id_' + this._params.id
            }

            //
            this._events.push(this._bind(
                document,
                'click',
                this._proxy(this._click4document, this)
            ));

            //
            this._events.push(this._bind(
                document,
                'touchstart',
                this._proxy(this._click4document, this)
            ));

            //
            this._events.push(this._bind(
                nodes.field,
                'blur',
                this._proxy(this._blur4field, this)
            ));

            //
            this._events.push(this._bind(
                nodes.field,
                'focus',
                this._proxy(this._focus4field, this)
            ));

            //
            this._events.push(this._bind(
                nodes.field,
                'keydown',
                this._proxy(this._keydown4field, this)
            ));

            //
            this._events.push(this._bind(
                nodes.field,
                'keyup',
                this._proxy(this._keyup4field, this)
            ));

            // On mouseover select the hovered item
            this._events.push(this._bind(
                this._nodes.block,
                'mouseover',
                this._proxy(this._mouseover4block, this)
            ));

            // On mouseout select the first item
            this._events.push(this._bind(
                this._nodes.block,
                'mouseout',
                this._proxy(this._mouseout4block, this)
            ));

            // Mouseclick on list item
            this._events.push(this._bind(
                this._nodes.block,
                'click',
                this._proxy(this._click4block, this)
            ));

            // Mouseclick on list item
            this._events.push(this._bind(
                this._nodes.block,
                'touchstart',
                this._proxy(this._click4block, this)
            ));
        },
        /**
         * Read and set suggest dropdown content
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {Array}
         * @param  {string}
         * @return {undefined}
         */
        _draw : function(data, tmpl) {
            tmpl = tmpl || '{{name}}';

            var
                arr   = data instanceof Array,
                obj   = typeof data == 'object' ? true : false,
                type  = 'simple',
                nodes = this._nodes;

            // Reset the group layout indicator
            this.grouped = false;

            // Clean previous values from properties
            nodes.groups = [];
            this._nodes.items.total = 0
            nodes.items.loop        = 0;
            nodes.items.list        = [];

            // Clean previous nodes from HTML
            nodes.block.innerHTML = '';

            if (obj) {
                if (!arr) {
                    // Grouped layout
                    type = 'grouped';

                    // Set the group layout indicator
                    this.grouped = true;
                }
            } else {
                // Data must be array anyway
                data = [];
            }

            this['_draw4' + type](data, tmpl);
        },
        /**
         * Create the simple dropdown
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {Array}
         * @param  {string}
         * @return {undefined}
         */
        _draw4simple : function(data, tmpl) {
            var
                pos   = 0,
                end   = 0,
                node  = null,
                nodes = this._nodes;

            //
            end = data.length;

            // Create and append DOM for dropdown item
            for (pos = 0; pos < end; pos++) {
                node = this._item2node(data[pos], this._tmpl(tmpl, data[pos]));

                // Put items into list
                nodes.block.appendChild(node);
            }
        },
        /**
         * Create the dropdown with the groups
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {object}
         * @param  {string}
         * @return {undefined}
         */
        _draw4grouped : function(data, tmpl) {
            var
                pos    = 0,
                end    = 0,
                groups = this._groups ? this._groups : [],
                node   = null,
                group  = null,
                nodes  = this._nodes;

            //
            end = this._groups.length;

            // Create and append DOM for dropdown group
            for (pos = 0; pos < end; pos++) {
                group = groups[pos];

                if (data[group.alias] && data[group.alias].length) {
                    node = this._group2node(
                        group.alias,
                        group.name ? group.name : '',
                        group.tmpl ? group.tmpl : tmpl,
                        data[group.alias]
                    );

                    // Put group into list
                    nodes.block.appendChild(node);
                }
            }
        },
        /**
         * Create the group DOM
         *
         * @this   {Suggest}
         * @param  {string}
         * @param  {string}
         * @param  {string}
         * @param  {Array}
         * @return {DOMNode}
         */
        _group2node : function(alias, name, tmpl, items) {
            var
                pos   = 0,
                end   = items.length,
                item  = null,
                group = document.createElement('div'),
                title = null;

            // Set the group node
            group.className = 'b-suggest__group ' +
                              'b-suggest__group_id_' + alias;

            // Set the group title
            if (name) {
                title = document.createElement('div');
                title.className = 'b-suggest__title';
                title.innerHTML = name;
                group.appendChild(title);
            }

            // Get the group items nodes
            for (pos = 0; pos < end; pos++) {
                item = this._item2node(items[pos], this._tmpl(tmpl, items[pos]));

                group.appendChild(item);
            }

            // Save the link to the group node
            this._nodes.groups.push(group);

            return group;
        },
        /**
         * Create the item DOM
         *
         * @this   {Suggest}
         * @param  {object}
         * @param  {string}
         * @return {DOMNode}
         */
        _item2node : function(data, name) {
            var
                pos   = this._nodes.items.total,
                alias = '',
                keys  = [],
                node  = this._nodes.items.list[pos] = document.createElement('div');

            //
            node.className = (pos == 0) ?
                             'b-suggest__item b-suggest__item_is_hovered' :
                             'b-suggest__item';
            node.innerHTML = name;

            // Replace placeholders in template and save given object
            // into data-attributes for further usage
            for (alias in data) {
                keys.push(alias);
                node.setAttribute('data-' + alias, data[alias]);
            }

            node.setAttribute('data-loop', pos);
            node.setAttribute('data-keys', keys.join(','));

            this._nodes.items.total++;

            return node;
        },
        /**
         * Hide the dropdown by click on the document
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {Event}
         * @return {undefined}
         */
        _click4document : function(event) {
            var
                wrong = false,
                cname = event.target.className;

            //
            if (cname.match(/b\-suggest/ig)) {
                wrong = true;
            }

            //
            if (this.shown && !wrong) {
                this.hide()
            }
        },
        /**
         * Show the previous results on focus
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {Event}
         * @return {undefined}
         */
        _focus4field : function() {
            var
                value = this._nodes.field.value;

            if (this._nodes.field.value != '') {
                this.show(true);
            }

            this._aborted = false;
        },
        /**
         * Hide the dropdown on blur
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {Event}
         * @return {undefined}
         */
        _blur4field : function(event) {
            this.hide();
        },
        /**
         * Enter the results by enter the press
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {Event}
         * @return {undefined}
         */
        _keydown4field : function(event) {
            var
                code = event.keyCode;

            if (code == 13) {
                event.preventDefault();

                if (
                    this.shown &&
                    this._nodes.items.list[this._nodes.items.loop]
                ) {
                    this._nodes.items.list[this._nodes.items.loop].click();
                }
            }
        },
        /**
         * Run the user defined load mechanism
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {Event}
         * @return {undefined}
         */
        _keyup4field : function(event) {
            var
                code  = event.keyCode,
                value = this._nodes.field.value,
                self  = this;

            switch (code) {

                // Filtered keys
                case 9:
                case 13:
                case 16:
                case 17:
                case 18:
                case 20:
                case 37:
                case 39:
                case 224:
                    return true;
                break;

                // Hide suggest block on Esc
                case 27:
                    if (this.shown) {
                        this.hide();
                    }
                break;

                // Move upper
                case 38:
                    if (this.shown) {
                        this.prev();
                    }
                break;

                // Move down or show the block
                case 40:
                    if (this.shown) {
                        this.next();
                    } else if (value != '') {
                        this.show();
                    }
                break;

                default:
                    if (this._timer) {
                        clearTimeout(this._timer);
                    }

                    // Hide previous results
                    this.hide(true);

                    // Try to load new array
                    if (value != '' && value != this._saved) {
                        this._timer = setTimeout(function() {
                            self._handlers.load.call(
                                self._nodes.field,
                                event,
                                {
                                    done : self._proxy(self.show, self),
                                    hide : self._proxy(self.hide, self)
                                }
                            );
                        }, 300);
                    } else if (value == '') {
                        this._aborted = true;
                    }
                break;

            }
        },
        /**
         * Hover the hovered item on mouseover
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {Event}
         * @return {undefined}
         */
        _mouseover4block : function(event) {
            this.hover(event.target.getAttribute('data-loop'));
        },
        /**
         * Hover the first item on mouseout
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {Event}
         * @return {undefined}
         */
        _mouseout4block : function(event) {
            this.hover(0);
        },
        /**
         * Run the user defined handler for click
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {Event}
         * @return {undefined}
         */
        _click4block : function(event) {
            if (event.target.className.match('b-suggest__item')) {
                if (this._timer) {
                    clearTimeout(this._timer);
                }

                this._handlers.click.call(
                    this._nodes.items.list[this._nodes.items.loop],
                    event,
                    {
                        done : this._proxy(this.hover, this),
                        hide : this._proxy(this.hide, this)
                    }
                );
            }
        },
        /**
         * Templates engine
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {string}
         * @param  {object}
         * @return {string}
         */
        _tmpl : function(tmpl, data) {
            data = data || {};

            tmpl = tmpl
                   .replace(/\{\{ ?/g,                "';out+=")
                   .replace(/ ?\}\}/g,                ";out+='")
                   .replace(/\{% if ?([^%]*) ?%\}/ig, "';if($1){out+='")
                   .replace(/\{% else ?%\}/ig,        "';}else{out+='")
                   .replace(/\{% ?endif ?%\}/ig,      "';}out+='");

            var
                vars  = '',
                alias = '';

            for (alias in data) {
                vars += alias + '=data["' + alias + '"],';
            }

            tmpl = ";(function(){var " + vars + "out = '" + tmpl + "';return out;})();";

            return eval(tmpl);
        },
        /**
         * Bind an event
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {DOMNode}
         * @param  {string}
         * @param  {function(Event)}
         * @return {object}
         */
        _bind : function(target, alias, handler) {
            var
                prefix  = '',
                wrapper = '',
                self    = this,
                event   = null,
                out     = {
                    alias   : alias,
                    target  : target,
                    handler : function(event) {
                        event = self._eventize(event);

                        handler(event);
                    }
                };

            if (target.addEventListener) {
                wrapper = 'addEventListener';
            } else if (target.attachEvent) {
                prefix  = 'on';
                wrapper = 'attachEvent';
            }

            //
            target[wrapper](
                prefix + alias,
                out.handler
            );

            return out;
        },
        /**
         * Unbind an event
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {DOMNode}
         * @param  {string}
         * @param  {function(Event)}
         * @return {object}
         */
        _unbind : function(target, alias, handler) {
            var
                prefix  = '',
                wrapper = '';

            if (target.removeEventListener) {
                wrapper = 'removeEventListener';
            } else if (target.detachEvent) {
                prefix  = 'on';
                wrapper = 'detachEvent';
            }

            target[wrapper](
                prefix + alias,
                handler
            );
        },
        /**
         * Get an offset for chosen elements
         * (damned magic I copypasted from jQuery)
         *
         * @private
         *
         * @this   {Suggest}
         * @param  {DOMNode}
         * @param  {DOMNode}
         * @return {object}
         */
        _offsetize : function(from, till) {
            till = till || document.body;

            var
                quirks  = false,
                table   = /^t(?:able|d|h)$/i,
                doc     = document,
                body    = doc.body,
                view    = doc.defaultView ? doc.defaultView.getComputedStyle : null,
                node    = from,
                prev    = view ? view(node, null) : node.currentStyle,
                curr    = null,
                offset  = {
                    top    : node.offsetTop,
                    left   : node.offsetLeft,
                    width  : node.offsetWidth,
                    height : node.offsetHeight
                },
                cparent = node.offsetParent,
                pparent = from;

            if (navigator.userAgent.match(/MSIE [67]/) && doc.compatMode != 'CSS1Compat') {
                quirks = true;
            }

            while ((node = node.parentNode) && node != till) {
                if (prev.position === 'fixed') {
                    break;
                }

                curr = view ? view(node, null) : node.currentStyle;

                offset.top  -= node.scrollTop;
                offset.left -= node.scrollLeft;

                if (node === cparent) {
                    offset.top  += node.offsetTop;
                    offset.left += node.offsetLeft;

                    if (quirks && table.test(node.tagName)) {
                        offset.top  += parseFloat(curr.borderTopWidth)  || 0;
                        offset.left += parseFloat(curr.borderLeftWidth) || 0;
                    }

                    pparent = cparent;
                    cparent = node.offsetParent;
                }

                if (curr.overflow !== 'visible') {
                    offset.top  += parseFloat(curr.borderTopWidth)  || 0;
                    offset.left += parseFloat(curr.borderLeftWidth) || 0;
                }

                prev = curr;
            }

            if (node === body) {
                if (prev.position === 'relative' || prev.position === 'static') {
                    offset.top  += body.offsetTop;
                    offset.left += body.offsetLeft;
                } else if (prev.position === 'fixed') {
                    offset.top  += Math.max(doc.scrollTop,  body.scrollTop);
                    offset.left += Math.max(doc.scrollLeft, body.scrollLeft)
                }
            }

            return offset;
        },
        /**
         * Normalize an event object
         *
         * @this   {Suggest}
         * @param  {Event}
         * @return {Event}
         */
        _eventize : function(event) {
            event = event || window.event;

            var
                // I do really hate this browser
                opera = navigator.userAgent.match(/opera/ig) ?
                        true :
                        false,
                type  = event.type;

            // Events hacks for older browsers
            if (!opera && event.srcElement) {
                event.target = event.srcElement;
            }

            if (!opera && event.target.nodeType == 3) {
                event.target = event.target.parentNode;
            }

            // Keycode
            if (
                type == 'keypress' ||
                type == 'keydown' ||
                type == 'keyup'
            ) {
                if (!event.keyCode && event.which) {
                    event.keyCode = event.which;
                }
            }

            if (!opera) {
                // Related target for IE
                if (!event.relatedTarget) {
                    event.relatedTarget = event.fromElement;
                }

                // Stop bubbling
                if (!event.stopPropagation) {
                    event.stopPropagation = function() {
                        this.cancelBubble = true;
                    };
                }

                // Prevent default action
                if (!event.preventDefault) {
                    event.preventDefault = function() {
                        this.returnValue = false;
                    };
                }
            }

            return event;
        },
        /**
         * Save a needed context for further function execution
         *
         * @this   {Suggest}
         * @param  {function}
         * @param  {object}
         * @param  {Array}
         * @return {function}
         */
        _proxy : function(fn, ctx) {
            return function() {
                var
                    args = arguments;

                return fn.apply(ctx, args);
            }
        }
    };


    // Go to global scope
    return Suggest;


})();
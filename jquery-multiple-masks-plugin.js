/*
 * jQuery Plugin Pattern inspired by http://markdalgleish.com/2011/05/creating-highly-configurable-jquery-plugins/
 * Author: m.mikolajczyk
 * Free to use under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 */

;(function( $, window, document ){

    'use strict';

    //plugin constructor
    var MultipleMaskPlugin = function( input, options ){
        this.input = input;
        this.$input = $(input);
        this.options = options || {};

        this.options.metadata = $.extend({}, this.metadata, this.options.metadata, this.$input.data('maskplugin'))
        this.maskHistory = [];

    };

    //plugin prototype
    MultipleMaskPlugin.prototype = {

        //settings
        settings : {
            showError : false,
            clearOnFocus : false,
            autocomplete : false,
            rules : {
                '#': /[0-9]/,
                'a': /[a-zA-Z]/,
                '*': /[0-9a-zA-Z]/,
                'staticChar': /[\s|\.|,|\-|\(|\)]/
            },
            types : {
                'numeric': /[0-9]/,
                'alpha': /[a-zA-Z]/,
                'alphanumeric': /[0-9a-zA-Z]/,
                'regular': /[0-9a-zA-Z]/
            }
        },

        //default input metadata
        metadata : {
            'type' : 'numeric',
            'masks' : '',
            'description' : 'Allowed type: __TYPE__'
        },

        //keysCodes
        keysCodes : {
            ignoredKeys: {
                9    : 'tab',
                13   : 'enter',
                16   : 'shift',
                17   : 'control',
                18   : 'alt',
                27   : 'esc',
                33   : 'page up',
                34   : 'page down',
                35   : 'end',
                36   : 'home',
                38   : 'up',
                40   : 'down',
                45   : 'insert',
                116  : 'f5',
                123  : 'f12',
                224  : 'command'
            },
            specialCharKeys: {
                189  : '-',
                173  : '-', //firefox key code
                109  : '-',
                32   : ' ',
                188  : ',',
                190  : '.'
            },
            allowedKeys: {
                8    : 'backspace',
                46   : 'delete',
                37   : 'left',
                39   : 'right'

            }
        },

        init: function() {

            // to avoid scope issues, to reference this class from internal events and functions.
            var base = this;

            // defaults that can be extended
            this.config = $.extend({}, this.settings, this.keysCodes, this.options);

            this.config.metadata.description = this.config.metadata.description.replace('__TYPE__', this.config.metadata.type);

            //initialize mask history
            this.maskHistory[0] = this.config.metadata.masks;

            //add input description
            if (this.config.showError){
                this.$input.after('<span class="input-description"> '+ this.config.metadata.description +'</span>')
                this.span = this.$input.next('.input-description');
            } else {
                this.span = {}
            }

            //check key after keydown, and block if key doesn't match
            this.$input.keydown(function(event){
                base.caretPos = base.getCaretPosition(),
                base.keyValue = base.getKeyValue(event),
                base.maskIsArray = $.isArray(base.maskHistory[base.caretPos]) && base.keyValue !== true;

                if(!base.checkMatch(base)){
                    base.showOrHideError(event, true)
                }else{
                    base.showOrHideError(event, false)
                }

            });

            //clear defaults input value
            if(this.config.clearOnFocus){
                this.config.metadata.value = this.$input.val();

                this.$input.focusin(function(){
                    if(base.$input.val() === base.config.metadata.value){
                        base.$input.val('');
                    }
                });

                this.$input.focusout(function(){
                    if(base.$input.val() === ''){
                        base.$input.val(base.config.metadata.value);
                    }
                });
            }

            this.$input.on('invalid-input', function(){
                if (base.span.length > 0) {
                    base.span.addClass('error');
                }
                base.$input.addClass('error');
            });

            this.$input.on('valid-input', function(){
                if (base.span.length > 0) {
                    base.span.removeClass('error');
                }
                base.$input.removeClass('error')
            });

            return this;
        },

        checkMatch : function(base){

            var result = true,
                isPermit = this.keyValue['permission'],
                isAllowedKey = this.keyValue['type'] === 'allowedKeys',
                isRegular = this.config.metadata.type === 'regular';

            if(this.maskIsArray && isPermit && !isAllowedKey){

                var arrWithMatchingMasks = [],
                    staticCharAutocomplete,
                    inputVal = this.$input.val();

                //clear history if user change numbers
                if(this.maskHistory.length !==  this.caretPos + 1) {
                    this.maskHistory.splice(this.caretPos + 1, this.maskHistory.length - (this.caretPos + 1));
                    this.$input.val(inputVal.substr(0, this.caretPos));
                }

                $.each(this.maskHistory[this.caretPos], function(key, value){

                    if(value.length > inputVal.length){

                        var currentMaskValue = value[base.caretPos],
                            isRules = currentMaskValue in base.config.rules &&  base.config.rules[currentMaskValue].test(base.keyValue['value']),
                            isValueValid = false;


                        //set autocomplete to false;
                        staticCharAutocomplete = false;

                        if (isRules || currentMaskValue === base.keyValue['value']){
                            isValueValid = true;

                        } else if (base.config.rules['staticChar'].test(value[base.caretPos]) && !isRegular) {
                            var isSamePosition = false;

                            //checking the position of the character in other masks
                            $.each(base.maskHistory[base.caretPos], function(key, value){
                                isSamePosition = base.config.rules['staticChar'].test(value[base.caretPos]);
                            });

                            //autocomplete for static char
                            if(isSamePosition && base.config.autocomplete){
                                base.$input.val(base.insertAt(base.$input.val(), base.caretPos, value[base.caretPos]));

                                isValueValid = true;
                                staticCharAutocomplete = true;
                            }

                        } else if (isRegular){
                            var pattern = new RegExp(value),
                                string = base.insertAt(inputVal, base.caretPos, base.keyValue['value']);

                            if(pattern.test(string)) {
                                isValueValid = true;
                            }
                        }

                        if(isValueValid){
                            arrWithMatchingMasks.push(value);
                        }
                    }
                });

                if(arrWithMatchingMasks.length !== 0) {

                    //add matched masks to mask history
                    base.maskHistory[base.caretPos + 1] = arrWithMatchingMasks;
                }

                //return match status
                result =  arrWithMatchingMasks.length !== 0 && !staticCharAutocomplete;

            } else if (!isPermit){
                 result = false;
            }

            return result
        },

        getKeyValue : function (event){
            var charSymbol = String.fromCharCode(event.keyCode) || '',
                type = this.config.metadata.type,
                defaultResultType = 'notAllowedKeys',
                defaultResultValue = charSymbol,
                defaultPermission = false;

            if(!(event.keyCode in this.config.ignoredKeys)){

                if (this.config.types[type].test(charSymbol)){
                    defaultResultType = type;
                    defaultPermission = true;

                } else if(event.keyCode in this.config.specialCharKeys){
                    defaultResultType = 'specialCharKeys';
                    defaultResultValue = this.config.specialCharKeys[event.keyCode];
                    defaultPermission = true;

                } else if (event.keyCode in this.config.allowedKeys){
                    defaultResultType = 'allowedKeys';
                    defaultResultValue = this.config.allowedKeys[event.keyCode];
                    defaultPermission = true;
                }

            } else {
                defaultResultType = 'ignoredKeys';
                defaultResultValue = this.config.ignoredKeys[event.keyCode];
            }

            return {
                'type' : defaultResultType,
                'value': defaultResultValue,
                'permission' : defaultPermission
            }
        },


        getCaretPosition : function  () {
            var iCaretPos = 0;

            if (this.input.selectionStart || this.input.selectionStart === 0) {
                iCaretPos = this.input.selectionStart;
            } else if (document.selection) {
                this.input.focus();
                var sel = document.selection.createRange(),
                    selLen = document.selection.createRange().text.length;

                sel.moveStart('character', -this.input.value.length);
                iCaretPos = sel.text.length - selLen;
            }
            return iCaretPos
        },

        showOrHideError : function (event, activity){
            if(activity){
                event.preventDefault();
                this.$input.trigger('invalid-input')
            }else{
                this.$input.trigger('valid-input')
            }
        },

        insertAt : function(string, index, char) {
            return string.substr(0, index) + char + string.substr(index);
        }
    }

    MultipleMaskPlugin.settings = MultipleMaskPlugin.prototype.settings;
    MultipleMaskPlugin.metadata = MultipleMaskPlugin.prototype.metadata;

    $.fn.multipleMaskPlugin = function( options ) {
        return this.each(function() {
            // preventing against multiple instantiations
            if (!$.data(this, 'plugin_' + 'multipleMaskPlugin')) {
                $.data(this, 'plugin_' + 'multipleMaskPlugin',
                    new MultipleMaskPlugin( this, options ).init());
            }
        });
    };

    window.MultipleMaskPlugin = MultipleMaskPlugin;

})( jQuery, window , document );

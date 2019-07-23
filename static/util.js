function get_client_seed() {
    var seed = null;
    try {
        var arr = new Uint32Array(2);
        window.crypto.getRandomValues(arr); 
        seed = "" + arr[0] + arr[1];
    }
    catch(e) {
        seed = Math.floor(Math.random() * 0x7FFFFFFF);
    }
    return seed;
}

// Slow...
function intfrombytes(x, little) {
    var val = 0;
    var off = 0;
    for (var i = 0; i < x.length; ++i) {        
        if (little) {
            var p = x[i];
            for (var j = 0; j < off; j += 8) {
                p = p * 256;
            }
            val += p;
            off += 8;
        } else {
            val += x[i];        
            if (i < x.length-1) {
                val = val << 8;
            }
        }
    }
    return val;
}

// We imitate Python's random.getrandbits() here
var getrandbits = function(mt, k) {
    var ba = new Array();
    var nbytes = (Math.floor((k - 1) / 32) + 1) * 4;
    for( var ki = 0; ki < nbytes; ki += 4, k -= 32 ) {
        var r = mt.genrand_int32();
        if( k < 32 ) {
            r = r >>> (32 - k);
        }
        ba.push(r & 0xFF);
        ba.push((r >>> 8) & 0xFF);
        ba.push((r >>> 16) & 0xFF);
        ba.push((r >>> 24) & 0xFF);
    }

    return intfrombytes(ba, true);
};

// Should use log?
var bit_length = function(n) {
    if(n == 0) return 0;
    var c = 1;
    var i = 1;
    while( i <= n ) {
        c += 1;
        i = i << 1;
    }
    return c - 1;
};

// We imitate Python's random.randbelow() algorithm here
var randbelow = function(mt, n) {
    var k = bit_length(n);
    var r = getrandbits(mt, k);
    while( r >= n ) {
        r = getrandbits(mt, k);
    }
    return r;
};

// We imitate Python's random.shuffle() algorithm here
var shuffle = function(mt, a) {
    for( var i = a.length - 1; i >= 1; i-- ) {
        // Pick an element in a[:i+1] with which to exchange a[i]
        var j = randbelow(mt, i + 1);
        var old_card = a[i];
        a[i] = a[j];
        a[j] = old_card;
    }
}

// We imitate Python's random.randrange(min,max) here
var randrange = function(mt, min, max) {
    var width = max - min;
    return min + randbelow(mt, width);
}

// We imitate Python's random.sample(population, k) here
var sample = function(mt, population, count) {
    var result = new Array();
    var n = population.length;
    population = population.slice(0);

    var setsize = 21;
    if( count > 5 ) {
        setsize += Math.pow(4, Math.ceil(Math.log(count * 3) / Math.log(4)));
    }

    if( n < setsize ) {
        for( var i = 0; i < count; i++ ) {
            var j = randbelow(mt, n-i);
            result.push(population[j]);
            population[j] = population[n-i-1];
        }
    } else {
        alert("not implemented");
    }

    return result;
}

// Convert a byte array into a list of 32bit integers
var byte_array_to_words = function(ba) {
    var word_array = new Array();
    for( var i = ba.length - 1; i >= 0; ) {
        var n = 0;
        for( var j = 0; j < 4 && i >= 0; j++, i-- ) {
            n += ( ba[i] * 16777216 );
            if(j != 3 && i != 0) {
                n = n / 256;
            } else if(j != 3 && i == 0) {
                n = n / (1 << (8*(3-j)));
            }
        }
        word_array.push(n);
    }
    return word_array;
}

count_elem = function(a, c) {
    var i = 0;
    for( var v in a ) {
        if( a[v] == c ) i++;
    }
    return i;
}

reset_class = function(selector, new_classes) {
    return $(selector).removeClass().addClass(new_classes);
}

switch_class = function(selector, class_off, class_on) {
    return $(selector).removeClass(class_off).addClass(class_on);
}

$.fn.child = function(s) {
    return $(this).children(s)[0];
}

reduce = function(a, f, s) {
    if( s == undefined ) s = 0;
    if( a.reduce == undefined ) {
        var t = s;
        for( var i = 0; i < a.length; i++ ) {
            var b = a[i];
            t = f(t, b);
        }
        return t;
    } else {
        return a.reduce(f, s);
    }
}

indexOf = function(a, v) {
    if( a.indexOf == undefined ) {
        for( var i = 0; i < a.length; i++ ) {
            if( a[i] == v ) return i;
        }
        return -1;
    } else {
        return a.indexOf(v);
    }
}

clone = function(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

var dateFormat = function () {
	var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc) {
		var dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
	return dateFormat(this, mask, utc);
};

// http://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
function padleft(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

////////////////////////////////////////////////////////////////////////////////
// Bitcoin translation functions
////////////////////////////////////////////////////////////////////////////////
var Bitcoin = Bitcoin || {};

// convert an integer to a string representation in the form XXXXXXXXXX.YYYYYYYY
Bitcoin.int_amount_to_string = function (intamount) {
    if( typeof intamount != "number" ) return "NaN";

    var neg = '';
    if( intamount < 0 ) {
        neg = "-";
        intamount *= 1;
    } 

    var res = '' + Math.floor(intamount/100000000);

    var dec = intamount % 100000000;
    if( dec != 0 ) {
        dec = padleft(dec, 8).replace(/0+$/g, '');
        if( dec.length == 0 ) dec = '0';
        res = res + "." + dec;
    }

    return neg + res;
}

// convert an amount (as a string) in the form of XXXXXXXXX.YYYYYYYY to an int
Bitcoin.string_amount_to_int = function (amount) {
    if( typeof amount != "string" ) return undefined;

    // Replace commas
    amount = amount.replace(/\s+/g,'').replace(/\s+$/g,'').replace(',','')

    // If the number starts with a '-' we need to remember that
    var neg = 1;
    if( amount.length > 0 && amount[0] == '-' ) {
        neg = -1;
        amount = amount.substr(1);
    }

    // The rest of the number can only be 0..9 and a period
    var amountcheck = amount.replace(/[0-9]/g, '').replace(/\./,'');
    if( amountcheck.length != 0 ) {
        return undefined;
    }
    
    // Handle case when zero or empty string is passed in
    amount = amount.replace(/^0+/, '');
    if( amount.length == 0 ) return 0;
    
    var scale = 100000000;

    // Find the first '.' (if more sneak by the above check, then parseInt will error)
    var i = amount.indexOf('.');
    if( i == amount.length - 1 ) {
        amount = amount.substr(0, amount.length - 1);
        if( amount.length == 0 ) {
            return 0;
        }
        i = -1;
    }

    var v = 0;
    if( i < 0 ) {
        // No '.' found, use it as a whole number
        v = parseInt(amount) * scale;
    } else { 
        var dec = amount.substr(i+1).replace(/0+$/,'');
        if( dec.indexOf('.') != -1 ) return undefined;

        scale = Math.floor(scale / Math.pow(10, dec.length));

        amount = amount.substr(0,i) + dec;
        
        //  - Trim leading zeroes so that "025" becomes "25" so that retarded opera doesn't evaluate the string in octal...
        amount = amount.replace(/^0+/g,''); 
        if( amount.length == 0 ) return 0;

        v = parseInt(amount) * scale;
    }
    return neg * v
}

/*
alert(Bitcoin.int_amount_to_string(0) == "0");
alert(Bitcoin.int_amount_to_string(1) == "0.00000001");
alert(Bitcoin.int_amount_to_string(100) == "0.000001");
alert(Bitcoin.int_amount_to_string(10000000) == "0.1");
alert(Bitcoin.int_amount_to_string(200000000) == "2");
alert(Bitcoin.int_amount_to_string(2300001009) == "23.00001009");
alert(Bitcoin.int_amount_to_string('foo') == "NaN");

alert(Bitcoin.string_amount_to_int("-0") == 0);
alert(Bitcoin.string_amount_to_int("0") == 0);
alert(Bitcoin.string_amount_to_int("-0.") == 0);
alert(Bitcoin.string_amount_to_int("0.") == 0);
alert(Bitcoin.string_amount_to_int("0.000") == 0);
alert(Bitcoin.string_amount_to_int("    -0.3     ") == -30000000);
alert(Bitcoin.string_amount_to_int("    -0.3.     ") == undefined);
alert(Bitcoin.string_amount_to_int("1234.1234") == 123412340000);
alert(Bitcoin.string_amount_to_int("1234.00000009") == 123400000009);
alert(Bitcoin.string_amount_to_int("0.025") == 2500000);
*/


var gauth_enabled;
var password_enabled;
var fixed_withdrawal_address;

var set_password_enabled = function(e) {
    password_enabled = e;
    $("body").data("password-enabled", '' + password_enabled);

    if( password_enabled ) {
        $("#account_password_not_enabled").hide();
        $("#account_password_enabled").show();
        $("#dialog_account_password_not_set").hide();
        $("#dialog_account_password_old_password").show();
    } else {
        $("#account_password_not_enabled").show();
        $("#account_password_enabled").hide();
        $("#dialog_account_password_not_set").show();
        $("#dialog_account_password_old_password").hide();
    }

    if( typeof account_system != 'undefined' && account_system != undefined ) {
        account_system.update_password_reminder();
    }

};

var set_gauth_enabled = function(e) {
    gauth_enabled = e;
    $("body").data("gauth-enabled", '' + gauth_enabled);

    if( gauth_enabled ) {
        $("#withdrawal_gauth_enabled_container").show();
        $("#configure_2fa_already_configured").show();
        $("#configure_2fa_container").hide();
        $("#confirm_configure_2fa").val("OK");
        $("#account_2fa_enabled").show();
        $("#account_2fa_not_enabled").hide();
        $("#confirm_configure_2fa").val("OK");
    }
    else {
        $("#withdrawal_gauth_enabled_container").hide();
        $("#configure_2fa_already_configured").hide();
        $("#account_2fa_enabled").hide();
        $("#account_2fa_not_enabled").show();
    }

    if( typeof account_system != 'undefined' && account_system != undefined ) {
        account_system.update_password_reminder();
    }
};

var set_fixed_withdrawal_address = function(e) {
    fixed_withdrawal_address = e;

    if( fixed_withdrawal_address != null ) {
        $("#account_fixed_withdrawal_address_not_set").hide();
        $("#your_fixed_withdrawal_address").html(fixed_withdrawal_address);
        $("#your_fixed_withdrawal_address2").html(fixed_withdrawal_address);
        $("#set_fixed_withdrawal_address_container").hide();
        $("#set_fixed_withdrawal_address_container_already_set").show();
        $("#account_fixed_withdrawal_address_set").show();
        $("#confirm_set_fixed_withdrawal_address").val("OK");
        $("body").data("fixed-withdrawal-address", fixed_withdrawal_address);
    } else {
        $("#account_fixed_withdrawal_address_not_set").show();
        $("#set_fixed_withdrawal_address_container").show();
        $("#set_fixed_withdrawal_address_container_already_set").hide();
        $("#account_fixed_withdrawal_address_set").hide();
        $("body").data("fixed-withdrawal-address", "0");
    }
}

var update_auth_flags = function() {
    set_gauth_enabled(parseInt($("body").data("gauth-enabled")));
    set_password_enabled(parseInt($("body").data("password-enabled")));
    var f = $("body").data("fixed-withdrawal-address");
    set_fixed_withdrawal_address(f == "0" ? null : f);
}

$(document).ready(update_auth_flags);

function addLightBox(element) {
    let container = document.createElement("div");
    container.setAttribute("id", "lb_container")
    let bg = document.createElement("div");

	[bg, container].map((el) => {
		el.style.position = "fixed";
		el.style.top = "0";
		el.style.left = "0";
		el.style.right = "0";
		el.style.bottom = "0";
	})

	container.style.display = "flex";
	container.style.justifyContent = "center";
	container.style.alignItems = "center";
	container.style.zIndex = 1002;
	container.style.setProperty('background', 'none', 'important');

    bg.style.background = "black";
    bg.style.opacity = "0.5";
	bg.style.zIndex = 1001;

	element.addEventListener("click", e => e.stopPropagation());
    container.addEventListener("click", e => {
        if(e.target === bg){
            container.remove();
        }
    });

	let elementChildren;
	//Make sure element is not DocumentFragment
	if(element.nodeType == 1) {
		element.style.display = "block";
		element.style.zIndex = 1003;
	}else if(element.nodeType == 11) {
		elementChildren = [...(element.children)];
		if (elementChildren && elementChildren.length > 0){
			elementChildren[0].style.display = "block";
			elementChildren[0].style.zIndex = 1002;
		}
	}

    container.appendChild(bg);
    container.appendChild(element);

    document.body.appendChild(container);

	let closeBtn = document.getElementById("close-btn");
	closeBtn && closeBtn.addEventListener("click", () => {
		container.remove();
	});

	return container;
}

function removeEventListeners(element) {
    let new_element = element.cloneNode(true);
    element.parentNode.replaceChild(new_element, element);
}

function get_cookie(name) {
    return document.cookie.split(';').reduce(function(prev, c) {
        var arr = c.split('=');
        return (arr[0].trim() === name) ? arr[1] : prev;
    }, undefined);
}

function copyOnClick(el, fn) {

	el.addEventListener("click", () => {
        let cp = fn();
        let temp = $('<input>').val(cp).appendTo('body').select();
        document.execCommand('copy');
	});
}

function mobileLightboxOptions(element) {
	return {
		onLoad: ()=>{
			let xPos = (window.innerWidth - element.clientWidth)/2 
				- element.getBoundingClientRect().left;
			let yPos = (window.innerHeight - element.clientHeight)/2 
				- element.getBoundingClientRect().top;
			element.style.transform = "translate(" + xPos + "px, " + yPos + "px)";
		},
		onClose: ()=>{
			element.style.transform = "unset";
		}
	}
}

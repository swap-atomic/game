// What to do about this: dialog_system.dialog_with_input_is_open 
// This is accessing chat_system
// Maybe it's OK that other classes are accessing global instances like this.



function AccountSystem( key, my_player_ident, my_public_id ) {

    //  - Set these in account_system
    this.account_key = key;
    this.player_ident = my_player_ident;
    this.public_id = my_public_id;
    this.shutting_down_time = null;
    this.contactus_captcha_id = null;
    this.countryCode = null;

    this.btc_address = null;
    this.btc_balance = "";
    this.btc_sender_address = null;
    this.btc_int_balance = 0;
    this.balance_is_unconfirmed = false; 

    this.fake_btc_balance = "";
    this.fake_btc_int_balance = 0;
    this.use_fake_credits = true;

    this.include_account_key = false;

	if (window.location.href.match(/[?|&]deposit/)) {
		this.show_iframe_deposit_popup();
	}
	if (window.location.href.match(/iframe/)) {
		this.include_account_key = true;
	}

    // Remove any get params in the url
    if (window.location.href.indexOf('?cm') !== -1) {
        window.location.href =  window.location.href.split("?")[0];
    }
    this.init_handlers();
    this.get_bitcoin_address();
    this.checkLocation();
    //this.init_qr_popup();
    this.update_balance();
}

AccountSystem.prototype.checkLocation = function() {
    var that = this;
    $.ajax({url: "https://games.bitcoin.com/extra/public/countrycheck"}).done(function (data) {
        that.countryCode = data.countrycode;
    });

}

AccountSystem.prototype.get_active_btc_int_balance = function() {
    // Real or fake credits
    if( this.use_fake_credits ) {
        return this.fake_btc_int_balance;
    }
    else {
        return this.btc_int_balance;
    }
}

AccountSystem.prototype.get_bitcoin_address = function() {
    var that = this;
    $.ajax({
        url: "/account/bitcoinaddress" + that.use_account_key(true)
    }).done(function(address_result) { 

        $.ajax({url: "https://games.bitcoin.com/extra/public/countrycheck"}).done(function (data) {
            that.countryCode = data.countrycode;

            //  - Check for bad account_key
            if( address_result['status'] == "error" && address_result['message'] == "invalid" ) {
                //  - A more helpful page perhaps?
                alert("Account key " + that.account_key + " is not valid. Please click OK and a new account_key will be generated for you.");
                window.location.href = "/";
                return;
            }

            if(that.countryCode == "US" || that.countryCode == "JP") {
                fetch("/account/whitelistmatch").then(response => response.json()).then(wl_data => {
                    if(!wl_data || !wl_data.allowed) {
                        that.country_block();
                    }else {
                        that.country_pass(address_result);
                    }
                });
            }
            else {
                that.country_pass(address_result);
            }

            $("#bitcoin_address_help").css('display', '');

            $("#bitcoin_address_help").click( function() {
                that.show_no_credits_dialog(); 
            });
            $("#play_for_real_bitcoins_address").html(that.btc_address);
            $("#account_password_reminder").click( function() {
                $("#tab5").trigger("click"); 
            });
            $("#account_play_for_real_bitcoins").click( function() {
                that.show_no_credits_dialog(); 
            });

        });
    });
}

AccountSystem.prototype.country_pass = function(address_result) {
    this.btc_address = address_result['address'];

    qrCodes = [
        { name: "address-qr-js" },
        { name: "address-qr-pre-deposit",
            options: { width: 100, height: 100 }
        },
        { name: "address-qr-iframe",
            options: { width: 155, height: 155 }
        },
        {
            name: "bitcoin_address_qr_title_image",
            options : {
                width: 195,
                height: 195
            }
        }
    ];

    for (let qrcode of qrCodes) {
        new QRCode(qrcode.name, {
            text: "bitcoin:" + this.btc_address,
            width: 200, height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H,
            ...(qrcode.options)
        });
    }

    window.__SIDESHIFT__["settleAddress"] = this.btc_address;

    const sideshift = window.sideshift;

    sideshift_resize = function() {
        let style = "height:" +window.innerHeight + 'px !important;' + 'width:' +window.innerWidth + "px !important;";
        let sideshift_base = $("#__sideshift__ > div");
        let sideshift_select = $("#__sideshift__selection");

        $("#__sideshift__").attr("style", "position: fixed !important; z-index: 2001 !important; top: 0px !important; left: 0px !important;");

        if (sideshift_base)
            sideshift_base.attr("style", style + "position: absolute !important; z-index: 2001 !important; top: 0px !important; left: 0px !important;");
        if (sideshift_select)
            sideshift_select.attr("style", style);
    }

    $(".sideshift-btn").click(function(e) {
        sideshift.show();

        console.log(sideshift)

        sideshift_resize()

        document.querySelector("#hamburger-menu").classList.remove("active");
        document.querySelector("#header-hamburger").classList.remove("active");
    })

    $(document).on('DOMNodeInserted', function(e) {
        node_id = $(e.target).attr("id");
        if (node_id != null && node_id == "__sideshift__selection")
            sideshift_resize()
    })

    $(window).resize(sideshift_resize)

    //Make copy button copy cash address into clipboard
    let copyButton = document.querySelector("#iframe-copy-address");
    if(copyButton) copyOnClick(copyButton, () => this.btc_address);
    copyButton = document.querySelector("#deposit-copy-address");
    if(copyButton) copyOnClick(copyButton, () => this.btc_address);
    //Link the "open in wallet" button
    let walletButton = document.querySelector("#iframe-open-wallet");
    if(walletButton) walletButton.addEventListener('click', () => window.location.href = "bitcoin:"+this.btc_address);

    walletButton = document.querySelector("#deposit-open-wallet");
    if(walletButton) walletButton.addEventListener('click', () => window.location.href = "bitcoin:"+this.btc_address);

    $("#mobile_pre_deposit").show();

    let sa = this.btc_address.slice(12);
    $("#deposit-bitcoin-address").html( '<span class="green">' + sa.slice(0,6) + '</span>' + sa.slice(6,10) + '...' + sa.slice(sa.length-9, sa.length-5) + '<span class="green">' + sa.slice(sa.length-5) + '</span>'  );
}

AccountSystem.prototype.country_block = function() {
    $("#credit_btc_address").html("Blocked in this country");

    $("#bitcoin_address_qr_image").remove();
    $("#depo-btn").remove();
    $("#account_play_for_real_bitcoins").html("YOU CAN ONLY PLAY WITH TEST CREDITS IF YOU ARE IN THE UNITED STATES. CLICK TO READ WHY.");
    $('div.pull-right').remove();
    $('#play_for_real_bitcoins_address').remove();
    $('#no_credits_dialog .modal-header h2').html("Sorry!");
    $('#no_credits_dialog div.okcountry').remove();
    $('#no_credits_dialog div.badcountry').show();
    let deposit_button = $("#header-control-deposit").addClass("disabled")[0];
    removeEventListeners(deposit_button);
    $("#header-controls a").removeAttr('href').addClass("disabled");
    $("#hamburger-menu>h2")[2].remove();
    (async ()=> {
        let response = await fetch("/ajax_block?cc=" + this.countryCode.toLowerCase());
        let html = await response.text();
        let template = document.createElement("template");
        html = html.trim();
        template.innerHTML = html;
        let container = addLightBox(template.content.firstChild);
        let child = container.lastChild;
        child.classList.add("country_block");
        let no_c_dialog = document.querySelector("#no_credits_dialog");
        if(no_c_dialog) no_c_dialog.innerHTML = child.innerHTML;
        let closeBtn = container.querySelector(".close-btn");
        closeBtn && closeBtn.addEventListener("click", () => {
            container.remove();
        });
    })()
}

AccountSystem.prototype.init_handlers = function() {
    let that = this;
    $(".topbar_contactus").click( function() {
        $("#contactus_email").val("");
        $("#contactus_message").val(""); 
        $("#contactus_captcha_answer").val(""); 
        $("#contactus_dialog .error").hide();

        $('.dialog').trigger('close');
        $('#contactus_dialog').lightbox_me({
            centered: true,
            onLoad: function() { 
            }
        });
        dialog_system.dialog_with_input_is_open = true;

        $("#contactus_captcha_question").html("Getting captcha question...");
        $.ajax({
            url: "/account/captcha"
        }).done(function(result) { 
            if( result['result'] && result['status'] != "error"  ) {
                that.contactus_captcha_id = result['captcha_id']; 
                $("#contactus_captcha_question").html("Are you human? " + result['captcha_question']);
            } else {
                reason = result['reason'];
                $("#contactus_dialog .error").html("Error:" + reason); 
                $("#contactus_dialog .error").show();
            }
        });

    });

    $("#contactus_send_button").click( function() {
        //  - Do this!
        //  - Maybe need to POST this???
        var email = $("#contactus_email").val();
        var message = $("#contactus_message").val(); 
        var captcha_answer = $("#contactus_captcha_answer").val(); 
        $("#contactus_dialog .error").hide();
        $.ajax({
            url: "/account/contactus?email=" + email + "&captcha_id=" + that.contactus_captcha_id + "&captcha_answer=" + captcha_answer + "&message=" + message
        }).done(function(result) { 
            if( result['result'] && result['status'] != "error"  ) {
                alert("Your message has been sent. We will get back to you soon.");
                $('.dialog').trigger('close');
            } else {
                reason = result['reason'];
                if( reason == "bad_captcha_id" ) {
                    $("#contactus_dialog .error").html("Bad captcha ID. Please refresh the page and try again.");
                }
                else if( reason == "email" ) {
                    $("#contactus_dialog .error").html("Invalid email address.");
                }
                else if( reason == "message" ) {
                    $("#contactus_dialog .error").html("Your message is too short.");
                }
                else if( reason == "incorrect_captcha_answer" ) {
                    $("#contactus_dialog .error").html("Incorrect captcha answer. Are you a robot?");
                }
                else {
                    $("#contactus_dialog .error").html("Error:" + reason); 
                }
                $("#contactus_dialog .error").show();
            }
        });
    });

    if($("#withdraw_everything_checkbox").prop("checked")) {
        $("#withdrawal_amount").val(that.btc_balance);
        $("#withdrawal_amount").prop("disabled", true);
    } else {
        $("#withdrawal_amount").val("");
        $("#withdrawal_amount").prop("disabled", false);
    }

    $("#withdrawal_dialog .wait").hide();
    $("#withdrawal_dialog .error").hide();

    $("#return_to_sender_container").click(function() {
        if($("#return_to_sender_checkbox").prop("checked")) {
            $("#withdrawal_address").val(that.btc_sender_address);
            $("#withdrawal_address").prop("disabled", true);
            $("#return_to_sender_warning_container").addClass("visible");
        } else {
            $("#withdrawal_address").val("");
            $("#withdrawal_address").prop("disabled", false);
            $("#return_to_sender_warning_container").removeClass("visible");
        }
    });

    $("#withdrawal_button").click( function() {
        $("#withdrawal_error").hide();
        $("#withdrawal_wait").show();
        $("#withdrawal_button").attr("disabled", "disabled"); 
        var amount = Bitcoin.string_amount_to_int($("#withdrawal_amount").val());
        var address = $("#withdrawal_address").val();
        if(!amount || amount <= 0) {
            $("#withdrawal_amount").focus()
            $("#withdrawal_error").show();
            $("#withdrawal_wait").hide();
            $("#withdrawal_error").html("Please enter a correct amount.")
            $("#withdrawal_button").removeAttr("disabled", "disabled");
            return
        } else if (address == "") {
            $("#withdrawal_address").focus()
            $("#withdrawal_error").show();
            $("#withdrawal_wait").hide();
            $("#withdrawal_error").html("Please enter your Destination address.")
            $("#withdrawal_button").removeAttr("disabled", "disabled");
            return
        }
        var code = $("#withdrawal_gauth_code").val();

        if (gauth_enabled == "1" && code == "") {
            $("#withdrawal_auth_code").focus();
            $("#withdrawal_error").show();
            $("#withdrawal_wait").hide();
            $("#withdrawal_error").html("Please enter your Google Authentication Code")
            $("#withdrawal_button").removeAttr("disabled", "disabled");
        }

        $.ajax({
            url: "/account/withdraw?address=" + address + "&intamount=" + amount + "&code=" + code
        }).done(function(withdrawal_result) { 
            $("#withdrawal_button").removeAttr("disabled", "disabled"); 
            var result = withdrawal_result['result'];
            var intamount = withdrawal_result['intamount'];
            var address = withdrawal_result['address'];
            var reason = withdrawal_result['reason'];
            var pending = withdrawal_result['pending'];

            if( result ) {
                if( !pending ) {
                    alert(Bitcoin.int_amount_to_string(intamount) + " BTC was sent to:\n" + address);
                } else { 
                    alert("This withdrawal must be manually approved by an administrator. This usually only takes a few minutes, after which you will get your Bitcoins. We are sorry for the delay.");
                }

                $('#withdrawal_dialog').trigger('close');
                $("#withdrawal_error").html("");
                dialog_system.dialog_with_input_is_open = true;
            } else {

                if( reason == "balance" ) {
                    $("#withdrawal_error").html("Insufficient balance available.");
                }
                else if( reason == "pending_transactions" ) {
                    $("#withdrawal_error").html("Deposited Bitcoins have not been confirmed yet. Two (2) confirmations are required before you can withdraw. Please try again later.");
                }
                else if( reason == "fixed_withdrawal_address_doesnt_match" ) {
                    $("#withdrawal_error").html("Internal error: Given withdrawal address doesn't match fixed withdrawal address.");
                }
                else if( reason == "amount_too_small" ) {
                    $("#withdrawal_error").html("Withdrawal amount is too small. Please withdraw at least 0.01 BTC.");
                }
                else if( reason == "bad_address" ) {
                    $("#withdrawal_error").html("Invalid Bitcoin address. Please verify address and try again.");
                }
                else if( reason == "bad_amount" ) {
                    $("#withdrawal_error").html("Invalid Withdraw amount. Please verify amount and try again.");
                }
                else if( reason == "internal_error" ) {
                    $("#withdrawal_error").html("Internal error. Please try again later, or contact us using the contact from.");
                }
                else if( reason == "shutting_down" ) {
                    that.show_shutting_down_dialog();
                }
                else if( reason == "incorrect_code" ) {
                    $("#withdrawal_error").html("The Google Authenticator code provided is incorrect.");
                }
                else {
                    $("#withdrawal_error").html("Error:" + reason); 
                }
                $("#withdrawal_error").show();
            }
            $("#withdrawal_wait").hide();
        });
    });


    //$("#control_identity").click( function() {
    $("#user_info_change_name").click( function() {
        $(".dialog").trigger('close');
        $("#dialog_change_identity .error").hide();
        $('#player_identity_text').val(that.player_ident);
        $("#dialog_change_identity").lightbox_me({
            centered: true, 
            onLoad: function() { 
                $('#dialog_change_identity').find('input:first').focus();
            }
        });
        dialog_system.dialog_with_input_is_open = true;
    });

    $("#user_info_logout").click( function() {
        var confirmed = false;
        if( this.btc_int_balance > 0 && confirm("You have a non-zero balance of " + this.btc_balance + " BTC. Are you ABSOLUTELY SURE that you want to log out?") ) {
            confirmed = true;
        } else if( confirm("Are you sure you want to log out of your account?") ) {
            confirmed = true;
        }
        if( confirmed ) {
            $(".dialog").trigger('close');
            document.cookie = "account_key=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/";
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/";
            location.reload();
        }
    });

    $("#user_info_configure_password").click( function() {
        $(".dialog").trigger('close');
        $("#dialog_change_password .error").hide();
        $('#password').val('');
        $('#password_repeat').val('');
        $('#old_password').val('');
        $("#dialog_change_password").lightbox_me({
            centered: true, 
            onLoad: function() { 
                $('#dialog_change_password').find('input:first').focus();
            }
        });
        dialog_system.dialog_with_input_is_open = true;
    });

    $("#confirm_configure_2fa").click( function() {
        if( $("body").data("gauth-enabled") == "1" ) {
            console.log("gauth-enabled")
            return;
        }

        var code = '';
        for(let i = 1; i <= 6; i++)
            code += $("#input-2fa > input[tabindex="+i+"]").val()

        if(code.length != 6) {
            alert("Please fill in all of the digits!")
            return;
        }

        $.ajax({
            url: "/account/configure_gauth?code=" + code
        }).done(function(configure_gauth_response) {
            if( configure_gauth_response['result'] == 'success' ) {
                document.cookie = "auth_token=" + configure_gauth_response['auth_token'] + "; Path=/";
                alert("Your account now has 2-Factor Authentication via Google Authenticator enabled.  You will need to provide a code every time you login to your account or whenever you wish to withdraw Bitcoins.");
                $(".gauth_set").show()
                $(".gauth_not_set").hide()
                set_gauth_enabled(true);
                $("body").data("gauth-enabled", "1");
                $(".dialog").trigger('close');
                return;
            } else if( configure_gauth_response['reason'] !== undefined ) {
                if( configure_gauth_response['reason'] == 'incorrect_code' ) {
                    alert("The code you provided is incorrect.");
                    for (let i = 1; i <= 6; i++)
                        $('#input-2fa > input[tabindex='+i+']').val('')
                    $('#input-2fa > input[tabindex=1]').focus()
                } else if( configure_gauth_response['reason'] == 'gauth_enabled' ) {
                    alert("Google Authenticator is already enabled on this account.");
                }
            }
        });
    });

    $("#user_info_set_fixed_withdrawal_address").click( function() {
        if( !password_enabled ) {
            alert("You must set an account password before setting a fixed withdrawal address.");
            return;
        }

        $(".dialog").trigger('close');
        $("#dialog_set_fixed_withdrawal_address .error").hide();
        $("#dialog_set_fixed_withdrawal_address").lightbox_me({
            centered: true, 
            onLoad: function() { 
            }
        });
        dialog_system.dialog_with_input_is_open = true;
    });

    $("#confirm_set_fixed_withdrawal_address").click( function() {
        if( fixed_withdrawal_address !== null ) {
            $(".dialog").trigger('close');
            return;
        }

        if( $("#fixed_withdrawal_address_confirm").val() != 'YES' ) {
            alert("You must confirm by typing YES into the confirmation box before pressing submit.");
            return;
        }

        var address = $("#fixed_withdrawal_address").val();

        $.ajax({
            url: "/account/set_fixed_withdrawal_address?address=" + address
        }).done(function(set_fixed_withdrawal_address_response) {
            if( set_fixed_withdrawal_address_response['result'] == 'success' ) {
                alert("Your account now has a permanent Bitcoin withdrawal address set.  From this point forward, you will not be able to change it.");
                set_fixed_withdrawal_address(address);
                $(".dialog").trigger('close');
                return;
            } else if( set_fixed_withdrawal_address_response['reason'] !== undefined ) {
                if( set_fixed_withdrawal_address_response['reason'] == 'password_not_enabled' ) {
                    alert("You must set a password before setting a fixed withdrawal address.");
                } else if( set_fixed_withdrawal_address_response['reason'] == 'bad_address' ) {
                    alert("The specified Bitcoin address is invalid.");
                } else if( set_fixed_withdrawal_address_response['reason'] == 'fixed_withdrawal_address_already_set' ) {
                    alert("You already have a fixed withdrawal address set. It cannot be changed.");
                }
            }
        });
    });


    $("#change_identity_confirm_button").click( function() {
        $("#withdrawal_dialog .error").hide();
        player_ident = encodeURIComponent($("#player_identity_text").val());
        $.ajax({
            url: "/account/rename?player_ident=" + player_ident
        }).done(function(rename_result) { 
            if( rename_result.result ) {
                var now = Math.round((new Date()).getTime() / 1000);
                chat_system.add_system_message(now, 'Your name is now: ' + rename_result.player_ident);
                that.player_ident = rename_result.player_ident;
                window.location.reload();
                dialog_system.dialog_with_input_is_open = false;
                $("#topbar_self_user").html( player_ident );
                $("#leaderboards_self_user").html( player_ident );
            } else if( rename_result.error == "length" ) {
                $("#change_identity_error").html("Your name is not between 3 and 10 characters.")
                $("#change_identity_error").show();
            } else if( rename_result.error == "characters" ) {
                $("#change_identity_error").html("Invalid characters were present in your name.")
                $("#change_identity_error").show();
            } else if( rename_result.error == "taken" ) {
                $("#change_identity_error").html("That name is taken.")
                $("#change_identity_error").show();
            } else if( rename_result.error == "balance" ) {
                $("#change_identity_error").html("You must have a 0.01 BTC balance or higher in order to change your name.");
                $("#change_identity_error").show();
            } else {
                $("#change_identity_error").html("An unknown error occurred changing your name.")
                $("#change_identity_error").show();
            }
        });
    });

    $("#change_password_confirm_button").click( function() {
        var pw1 = $("#password").val();
        var pw2 = $("#password_repeat").val();

        if( pw1 != pw2 ) {
            alert("Passwords do not match. Please re-enter.");
            $("#password").val('');
            $("#password_repeat").val('');
            return;
        }

        if( pw1.length < 5 ) {
            alert("Password must be at least 5 characters");
            return;
        }

        var old_pw = $("#old_password").val();
        if( password_enabled ) {
            if( old_pw.length < 1 ) {
                alert("You must specify your old password.");
                return;
            }
        }

        // create 256-bit hash of password and build an ECKey from the hash
        var hash = SHA256(pw1);
        var bytes = Crypto.util.hexToBytes(hash);
        var key = new Bitcoin.ECKey(bytes);

        // and produce a public key
        var pubkey = key.getPubPoint();
        var pubkey_text = Crypto.util.bytesToHex(pubkey.getEncoded(false)); // Server only supports uncompressed pubkeys

        // tell the server we want to set the public key, and server will respond with a challenge,
        // which we have to sign and send back before it accepts our pubkey
        $.ajax({
            url: "/account/setpubkey?pubkey=" + pubkey_text
        }).done(function(setpubkey_result) { 
            if( setpubkey_result['result'] != 'success' ) {
                alert("There was an error while setting your password. Please check your password and try again.");
                return;
            }

            var challenge_text = setpubkey_result['challenge'];
            var signed_challenge = Crypto.util.bytesToHex(key.sign(Crypto.util.hexToBytes(SHA256(challenge_text))));

            // And sign the challenge again with our old password
            var old_hash = SHA256(old_pw);
            var old_key = new Bitcoin.ECKey(Crypto.util.hexToBytes(old_hash));
            var old_signed_challenge = Crypto.util.bytesToHex(old_key.sign(Crypto.util.hexToBytes(SHA256(challenge_text))));
            var old_string = '';

            if( password_enabled ) {
                old_string = '&old_challenge=' + old_signed_challenge;
            }

            $.ajax({
                url: "/account/setpubkey?challenge=" + signed_challenge + old_string
            }).done(function(setpubkey_challenge_result) {
                if( setpubkey_challenge_result['result'] != 'success' ) {
                    alert("There was an error while setting your password. Please check your password and try again.");
                    return;
                }

                document.cookie = "auth_token=" + setpubkey_challenge_result['auth_token'] + "; Path=/";
                alert("Your password has been set!");
                $("#dialog_change_password").trigger('close');
                set_password_enabled(true);
            });
        });

    });

    $("#shutting_down_button").click( function() {
        $('#shutting_down_dialog').trigger('close');
    });

    $("#topbar_self_user, #account_self_stats").click( function() {
        var public_id = $(this).attr("public_id"); 
        var player_ident = $(this).attr("player_ident"); 
        dialog_system.show_user_info_dialog( public_id, player_ident );
    });

    $( "#user_email_field" ).bind("propertychange change keydown input paste", function() {
        $("#email_success").hide()
        $("#email_fail").hide()
    });

    $("#add_email_action").click( function() {
        function validateEmail(email) {
            var re = /.+\@.+\..+/
            return re.test(email);
        }

        var $input = $("#user_email_field")

        if (!validateEmail($input.val())) {
            $("#email_success").hide();
            $("#email_fail").show();
            return;
        }

        $.ajax({
            url: "/account/registeremail?email=" + $input.val(),
            type: "GET",
            cache: false
        }).done(response => {
            if (response.result != "success") {
                $("#email_success").hide();
                $("#email_fail").show();
            } else {
                $("#email_success").show();
                $("#email_fail").hide();
                $input.val('');
            }
        }).fail(() => {
            $("#email_success").hide();
            $("#email_fail").show();
        });
    });
}

AccountSystem.prototype.init_qr_popup = function() {
    var that = this;
    var qr_animate_time = 250;
    var qr_hide_delay = 500;

    var hide_delay_timer = null;

    var showing = false;
    var shown = false;

    var trigger = $('#depo-btn');
    var popup   = $('#bitcoin_address_qr_popup');

    var has_qr_code = false;

    popup.css('opacity', 0);

    // on image load, swap from spinner to the qr code
    $("#bitcoin_address_qr_image").load(function() {
        $('#bitcoin_address_qr_image_spinner').css('display', 'none');
        $(this).css('display', '');
        $('#bitcoin_address_qr_text').html(that.btc_address);
        $('#bitcoin_address_qr_popup_a').attr('href', "bitcoin:" + that.btc_address);
    });

    $([trigger.get(0), popup.get(0)]).mouseover(function () {
        if (hide_delay_timer) {
            window.clearTimeout(hide_delay_timer);
        }

        if (showing || shown) {
            // don't trigger the animation again
            return;
        } else {
            // reset position of info box
            showing = true;

            popup.css({
                display: 'inline'
            }).animate({
                opacity: 1
            }, qr_animate_time, 'swing', function() {
                showing = false;
                shown = true;

                if( !has_qr_code ) {
                    $("#bitcoin_address_qr_image").attr('src', "https://chart.googleapis.com/chart?chs=160x160&cht=qr&choe=UTF-8&chl=bitcoin:" + that.btc_address);
                    $("#bitcoin_address_qr_image").attr('alt', that.btc_address);
                    has_qr_code = true;
                }
            });
        }

        return false;
    }).mousedown(function(e) {
        if(e.which==3) 
        {
            $(this).addClass("right");
        }
    }).mouseleave(function () {
        if($(this).hasClass("right")) {
            $(this).removeClass("right");  
            return;
        }
        if (hide_delay_timer) {
            window.clearTimeout(hide_delay_timer);
        }

        hide_delay_timer = window.setTimeout(function () {
            hide_delay_timer = null;
            popup.animate({
                opacity: 0
            }, qr_animate_time, 'swing', function () {
                shown = false;
                popup.css('display', 'none');
            });

        }, qr_hide_delay);
        $(this).removeClass("right");
        return false;
    });

    $(window).resize(function() {
        if(shown) {
            popup.css({
                bottom: ( $("#bitcoin_address").outerHeight() - 5 ) + "px",
                left: ($("#bitcoin_address").offset().left + $("#bitcoin_address").outerWidth() * 0.25 ) + "px"
            });
        }
    });
};

AccountSystem.prototype.show_iframe_deposit_popup = function() {
    $('#iframe_deposit_dialog').lightbox_me({
        centered: true
    });
}

AccountSystem.prototype.set_btc_balance = function(intbalance, fake_intbalance) {

    this.btc_balance = Bitcoin.int_amount_to_string(intbalance);
    this.btc_int_balance = intbalance;

    this.fake_btc_balance = Bitcoin.int_amount_to_string(fake_intbalance);
    this.fake_btc_int_balance = fake_intbalance;

    if( this.balance_is_unconfirmed ) {
        $(".balance-value").html( "<span class='badlight' title=\"Awaiting confirmations for some or all of your Bitcoin balance. We require 2 confirmations, which generally takes 15-30 minutes to complete.\">" + this.btc_balance + " BTC (!)</span>" );
    } else {
        $("#bitcoin_balance").html( "Current Balance: <span class='hilight'>" + this.btc_balance + " BTC</span>" );
        //\xa0 is a non-breaking space
        $(".balance-value").html(this.btc_balance + "\xa0BTC");
        if(this.btc_balance > 0) {$('#account_password_reminder_holder').hide();}
    }

    $("#fake_bitcoin_balance").html( this.fake_btc_balance );


    if( this.use_fake_credits == false ) {
        //  - Can only switch one-way to real coins. Once you're using real coins, only a browser refresh can take you back to fake coins. 
    }
    //else if( this.btc_balance > 0 || this.fake_btc_balance == 0 ) {
    else if( this.btc_balance > 0 ) {
        // If you have a real balance, or your fake balance runs to 0, switch to real mode.
        $(".play_for_real_bitcoins").removeClass("on"); 
        this.use_fake_credits = false;
        game_system.calculate_credits();
        $("#credits_play").removeClass("on");

        //  - This is ghetto and game dependent
        $("#control_btc").removeClass("fake_credits");
        $("#control_betone").removeClass("fake_credits");
        $("#control_double").removeClass("fake_credits");
        $("#control_lines").removeClass("fake_credits");

        //  - Stop autoplay, since the game could have switched from test credits to real credits, in which case the user
        // should get a chance to regroup.
        if( autoplay_system != undefined && autoplay_system != null ) {
            autoplay_system.autoplay_stopnow();
        }
    }
    else {
        $(".play_for_real_bitcoins").addClass("on");
        $("#credits_play").addClass("on");

        //  - This is ghetto and game dependent
        $("#control_btc").addClass("fake_credits");
        $("#control_betone").addClass("fake_credits");
        $("#control_double").addClass("fake_credits");
        $("#control_lines").addClass("fake_credits");

        $("#account_play_for_real_bitcoins_holder").css({
            bottom: ( $("#account_container").outerHeight() ) + "px",
        });

    }

    this.update_password_reminder();
    $("#credits").addClass("on"); 
}

AccountSystem.prototype.update_password_reminder = function()
{
    if( this.btc_balance > 0 && password_enabled == false && gauth_enabled == false ) {
        $(".password_reminder").addClass("on");
        $("#account_password_reminder_holder").css({
            bottom: ( $("#account_container").outerHeight() ) + "px",
        });
    }
    else {
        $(".password_reminder").removeClass("on");
    }
}


AccountSystem.prototype.show_deposit_dialog = function( btc_amount, txid, credited ) {
    $('.dialog').trigger('close');
    $("#deposit_btc").html( btc_amount + " BTC");
    $("#deposit_details a").attr("href", "http://explorer.bitcoin.com/btc/tx/" + txid);
    $('#deposit_dialog').lightbox_me({
        centered: true
    }); 

    var googleTagEvent = {
        'event': credited ? 'new_deposit_popup' : 'pending_deposit_popup',
        'eventValue': null
    };

    $.ajax({
        url: "/btcusd"
    }).done(function(response) {
        if(!response.err && response.status != "error"){
            var dep_amt = btc_amount * response.rate
            var deposit_amount = parseFloat(dep_amt.toFixed(2))
            googleTagEvent.eventValue = deposit_amount;
            if(credited) {
                $("#deposit_credited").hide();
                $("#deposit_title").html("NEW DEPOSIT");
            }else{
                $("#deposit_credited").show();
                $("#deposit_title").html("PENDING DEPOSIT");
            }
        }
    }).always(function() {
        //Notify GTM a deposit has occurred
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(googleTagEvent);
        if (credited) {
            gtag_report_conversion(window.location.href);
        }
    });

}

AccountSystem.prototype.show_multiple_accounts_dialog = function() {
    $('#multiple_accounts_dialog').lightbox_me({
        centered: true,
        closeClick: false,
        closeEsc: false 
    }); 
}

AccountSystem.prototype.update_balance = function() {
    var that = this;

    // Check if the user has connected to the site as a different user in a different window/tab
    if( get_cookie("account_key") != this.account_key && !window.location.href.match(/iframe/)) {
        this.show_multiple_accounts_dialog();
        return;
    }

    if( game_system != null ) {
        game_system.check_for_active_user();
        if( !game_system.user_is_active ) {
            window.setTimeout( function() {
                that.update_balance(); 
            }, 8000 );
            return;
        }
    } 

    var timestamp = (new Date()).getTime();
    $.ajax({
        url: "/account/balance?timestamp=" + timestamp + that.use_account_key()
    }).done(function(balance_result) { 
        //  - Update the credits amount in the display if it is different
        // But don't do it while a happy win animation is playing
        that.balance_is_unconfirmed = balance_result['unconfirmed'];
        that.set_btc_balance( balance_result['intbalance'], balance_result['fake_intbalance'] )

        // In the home page, game_system is null, because there is no game.
        if( game_system != null ) {
            game_system.handle_balance_update( balance_result['intbalance'] )
        }

        //  - Check for new deposit
        if( balance_result['notify_transaction'] != null ) {
            that.show_deposit_dialog( balance_result['notify_transaction']['amount'], balance_result['notify_transaction']['txid'], balance_result['notify_transaction']['credited']  );
        }
        if( balance_result['sender_address'] != null ) {
            that.btc_sender_address = balance_result['sender_address'];
            $("#return_to_sender_container").addClass("visible");
        } else {
            $("#return_to_sender_container").removeClass("visible");
        }
        if( fixed_withdrawal_address !== null ) {
            //this overrides sender address
            $("#return_to_sender_container").removeClass("visible"); 
            $("#withdrawal_address").val(fixed_withdrawal_address);
            $("#withdrawal_address").prop("disabled", true);
            $("#withdrawal_address_fixed").show();
            $("#destination_address_label").hide();
        }
        that.shutting_down(balance_result['shutdown_time'], false);
    });

    window.setTimeout( function() {
        that.update_balance();

    }, 8000 );
}

AccountSystem.prototype.show_no_credits_dialog = function() {
    $('#credit_btc_address').html(this.btc_address);
    $('#no_credits_dialog').lightbox_me({
        centered: true, 
        onLoad: function() { 
            //$('#deposit_dialog').find('input:first').focus();
        }
    }); 
}

AccountSystem.prototype.show_shutting_down_dialog = function() {
    $('#shutting_down_dialog').lightbox_me({
        centered: true
    }); 
}

AccountSystem.prototype.shutting_down = function(shutdown_time, show_dialog) {
    this.shutting_down_time = shutdown_time;

    if( shutdown_time == undefined || shutdown_time == null ) {
        $("#shutdown_time_container").removeClass("visible");
    } else {
        var now = Math.round((new Date()).getTime() / 1000);
        var s = "";
        shutdown_time -= now;

        if(shutdown_time < 0) {
            s = "soon";
        } else {
            var hours = Math.floor(shutdown_time / (60*60));
            shutdown_time = shutdown_time % (60*60);
            var mins  = Math.floor(shutdown_time / 60);

            // TODO - drop plural S with hours==1 or mins==1
            if( hours > 0 ) {
                s = hours + " hours, " + mins + " minutes"
            } else if( mins > 0 ) {
                s = mins + " minutes"
            }
            s = "in " + s;
        }

        $("#shutdown_time_container").addClass("visible");
        $("#shutdown_time").html(s);

        if(show_dialog) {
            this.show_shutting_down_dialog();
        }
    }
}

AccountSystem.prototype.should_show_shutting_down_dialog = function() {
    return (this.shutting_down_time != null && (this.shutting_down_time-((new Date()).getTime() / 1000)) < (30*60));
}

AccountSystem.prototype.use_account_key = function(use_question = false) {
	return (this.include_account_key ? ( use_question ? "?" : "&") + "skip_redirect&account_key=" + this.account_key : "");
}

function setupMobileLightboxes() {

	const lb_setup = function(name, onSubmit=null) {
		let click = document.querySelector("#mobile_" + name);
		let dialog = document.querySelector("#" + name + "_dialog");
		dialog.style.width = (window.innerWidth) + "px";
        dialog.style.transform = "scale(.85)";
        
        let container;
        if (click) {
            click.addEventListener("click", () => {
                container = addLightBox(dialog);
                let cb = function(selector){
                    console.log(selector);
                    let closeBtn = container.querySelectorAll(".close_button")
                    closeBtn.length > 0 && [...closeBtn].map((el) => {
                        el.addEventListener("click", () => {
                            container.remove();
                        });
                    });
                    if(selector){
                        $(selector).click( function() {
                            container.remove();
                        });
                    }
                };
                onSubmit && onSubmit(container, cb);
            });
        }
	}

	//Honestly this is ridiculously complicated and unmaintainable,
	//all because the lightbox_me jquery plugin does not work well at all with mobile
	lb_setup("provably_fair_explain", (container, cb) => {
		cb = cb.bind(null, "#provably_fair_explain_dialog .close_button, #provably_fair_explain_dialog .confirm_button");
		dialog_system.show_provably_fair_explain_dialog(game_system.game_name, true, cb);
	});
	lb_setup("expected_return", (container, cb) => {
		cb = cb.bind(null, "#expected_return_dialog .close_button, #expected_return_dialog .confirm_button");
		dialog_system.show_expected_return_dialog(true, cb);
	});
	lb_setup("contactus", (container) => {
		container.querySelector(".close_button").addEventListener("click", () => {
			container.remove();
		})
	});
	lb_setup("pre_deposit");
}

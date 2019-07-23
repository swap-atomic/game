var wowbar_system = null;
var barescreen_system = null;
var sound_system = null;
var chat_system = null;
var account_system = null;
var leaderboard_system = null;
var dialog_system = null;
var game_system = null;
var autoplay_system = null;

function common_init( game_name, key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, chatlog, sound_list, sound_volume )
{
    poker_games = [ new PokerJacksOrBetter(), new PokerTensOrBetter(), new PokerBonus(), new PokerDoubleBonus(), new PokerDoubleDoubleBonus(), new PokerDeucesWild(), new PokerBonusDeluxe() ]; 
    account_system = new AccountSystem(key, my_player_ident, my_public_id);
    wowbar_system = new WowbarSystem();
    barescreen_system = new BarescreenSystem();
    sound_system = new SoundSystem( sound_volume );
    dialog_system = new DialogSystem();
    autoplay_system = new AutoplaySystem(game_name);
    leaderboard_system = new LeaderboardSystem( initial_mygames, initial_leaderboards );

    if( chatlog != null ) {
        chat_system = new ChatSystem();

        //  - This needs to be before init_leaderboards or the same chatlog will get sent twice...
        if( game_name != null ) {
            chat_system.add_system_message(null, 'Welcome to Bitcoin Games - ' + game_name + '!', ChatSystem.MESSAGE_NOTICE);
        } else {
            chat_system.add_system_message(null, 'Welcome to Bitcoin Games!', ChatSystem.MESSAGE_NOTICE);
        }

        chat_system.process_chatlog( chatlog, true );
        chat_system.add_system_message(null, 'News: We have added 2 factor authentication and password protection for accounts. If you play for Bitcoins, please be sure to protect your account.', ChatSystem.MESSAGE_EXCITING);
        chat_system.adjust_height(false);
    } else {
        chat_system = null;
    }

	sound_system.load_sounds( '/static/sounds/', sound_list );
	$('body').addClass('small');

    // var windowHeight = $(window).height();
    // console.log(windowHeight);
    // if( windowHeight <= 1024 ) {
	//     $('body').addClass('small');
    // }
	// $(window).resize(function() {
	// 	windowHeight = $(window).height();
	//     if(windowHeight <= 1024) {
	// 	    $('body').addClass('small');
	//     } else {
	// 	    $('body').removeClass('small');
	//     }
	// });

}

$(document).keydown(function(ev){
	if ($("#emailinput").is(":focus") && ev.keyCode == 13){
		$('#emailbtn').click();
	}
});

$(document).on("click","#emailbtn.clickable",function(e){
	console.log('Email button click');
	e.preventDefault();

	var playerEmail = $('#emailinput').val();

	if (playerEmail != '') {
	    $.ajax({
		    url: "/account/registeremail?email="+playerEmail,
		    type: "GET",
		    cache: false,
		    data: { },
		    statusCode: {
		            200: function (response) {
		            	console.log(response);
		            	if (response.result == 'success') {
		            		$('#emailsuccess').show();
		            	}
		            },
		            500: function (response) {

		            }
		          },
		          complete: function(e, xhr, settings){
		          }
		});
	    }
});

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

function toggleDropdown() {
	document.getElementById("myDropdown").classList.toggle("show");
}

let footer = document.querySelector("footer");
if(footer) {
	/* When the user clicks on the button,
		  toggle between hiding and showing the dropdown content */
	let dropSwitch = false;
	function toggleDropup() {
	  document.getElementById("myDropdown").classList.toggle("show")
	  dropSwitch = true;
	}

	$(document).on("click", function() {
	  if (!dropSwitch) document.getElementById("myDropdown").classList.remove("show");
	  else dropSwitch = false;
	})
}

function switchCurrency(newUrl) {
  var currentUrl = $(location);

  var path = currentUrl.attr('pathname');

  window.location.href = newUrl + path;
}

function setupMobileLightboxes() {

	const lb_setup = function(name, onSubmit=null) {
		let click = document.querySelector("#mobile_" + name);
		let dialog = document.querySelector("#" + name + "_dialog");
		dialog.style.width = (window.innerWidth - 100) + "px";

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

function androidAppLightbox() {
	let game_name = window.location.pathname.replace("/","");
	// if (Object.keys(lb_games).includes(game_name))
	// $("#pre-android-dialog").lightbox_me({centered: true});
}

function setupHamburger() {
	let iconSection = document.querySelector("#header-hamburger");
	let menu = document.querySelector("#hamburger-menu");
	document.querySelector("#hamburger-close-img").addEventListener("click", ()=> {
		menu.classList.remove("active");
		iconSection.classList.remove("active");
	});
	document.querySelector("#hamburger-img").addEventListener("click", ()=> {
		menu.classList.add("active");
		iconSection.classList.add("active");
	});
}

function setupHelp() {
	let click = document.querySelector("#info_logo");
	let dialog = document.querySelector("#help_dialog");
	if(dialog) dialog.style.width = "800px";

	if(click) {
		click.addEventListener("click", () => {
			$("#help_dialog img").each( function() {
				$(this).attr("src", $(this).attr("delayed_src") ); 
			});
			addLightBox(dialog);
		});
	}
}

function setupFullScreen() {
	let click = document.querySelector("#fullscreen-btn");

	if(click){
		click.addEventListener("click", () => {
			if(!document.fullscreenElement && !document.webkitFullScreenElement) {
				let gameDiv = document.querySelector("#main_centering_div");
				if(gameDiv.requestFullscreen) {
					gameDiv.requestFullscreen();
				}else if(gameDiv.webkitRequestFullscreen) {
					gameDiv.webkitRequestFullscreen();
				}
			}else {
				if(document.exitFullscreen){
					document.exitFullscreen()
				}else if(document.webkitExitFullscreen){
					document.webkitExitFullscreen()
				}
			}
		});
	}
}

function setupSound() {
	let soundB = document.querySelector("#sound-toggle-btn");
	if(soundB) soundB.addEventListener("click", () => {
		sound_system.play_sound("boop");
	});
}

// Close the dropdown if the user clicks outside of it
$("button.dropbtn").click(function(e){
    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
});

document.addEventListener("DOMContentLoaded", () => {
	setupHelp();
	setupFullScreen();
	setupSound();
	if (isMobile.any()) {
	// User is on Mobile
		if(isMobile.Android()) {
			// User is on android
			androidAppLightbox();
		}
		let hamburger = document.querySelector("#hamburger-menu");
		if(hamburger){
			setupMobileLightboxes();
			setupHamburger();
		}
	}
});

$(document).ready(function() {
	$('.header-title').on("click", function(){
		window.location.href = "/home";
	})
})

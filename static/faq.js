function init_myaccount(key, my_player_ident, my_public_id, initial_leaderboards, initial_mygames ) {

     sound_list = [];
    common_init( null, key, my_player_ident, my_public_id, initial_mygames, initial_leaderboards, null, sound_list );

     dialog_system.init_help( [] );
}
$(document).ready(function(){
    let minus = '<path fill="#6A717F" d="M96 235h320v42H96z"></path>'
    let plus = '<path fill="#6A717F" d="M416 277.333H277.333V416h-42.666V277.333H96v-42.666h138.667V96h42.666v138.667H416v42.666z"></path>'

     $(".faq-item").click(function(e) {
        if($(this).hasClass("faq-open")) {
            $(this).find("svg").html(plus)
            $(this).find(".faq-textwrapper").css("height","0px")
            $(this).removeClass("faq-open")
        } else {
            $(this).find("svg").html(minus)
            $(this).find(".faq-textwrapper").css("height","auto")
            $(this).addClass("faq-open")
        }

     })
})
